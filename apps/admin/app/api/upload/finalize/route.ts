import { serverMessages } from "@ishoot/locales";

import { ROUTES } from "../../../../constants/routes";
import {
  verifyStoredUpload,
  isSupabaseStorageConfigured,
  uploadRoot,
} from "@ishoot/database";
import { measureOperation, db } from "@ishoot/database";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "../../../../lib/auth";
import { requireAttachmentAccess } from "../../../../lib/attachment-access";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  return measureOperation("admin:upload/finalize:POST", async () => {
    try {
      const user = await getCurrentUser();
      if (!user)
        return NextResponse.json({ error: serverMessages.unauthorized }, { status: 401 });

      const input: unknown = await req.json();
      if (!input || typeof input !== "object" || Array.isArray(input))
        return NextResponse.json(
          { error: serverMessages.runtimeInvalidUploadInput },
          { status: 400 },
        );
      const {
        fileUrl,
        entityType = "general",
        entityId = "",
        customName,
      } = input as Record<string, unknown>;

      if (
        !fileUrl ||
        typeof fileUrl !== "string" ||
        typeof entityType !== "string" ||
        typeof entityId !== "string" ||
        (customName !== undefined && typeof customName !== "string")
      ) {
        return NextResponse.json({ error: serverMessages.runtimeMissingFileUrl }, { status: 400 });
      }

      try {
        await requireAttachmentAccess(entityType, entityId, "write");
      } catch {
        return NextResponse.json(
          { error: serverMessages.runtimeUploadAccessDenied },
          { status: 403 },
        );
      }
      const upload = await db.uploadObject.findUnique({ where: { fileUrl } });
      if (!upload || upload.ownerId !== user.id) {
        return NextResponse.json(
          { error: serverMessages.runtimeUploadRecordNotFoundOrNotOwnedByYou },
          { status: 404 },
        );
      }
      if (upload.claimedAt || upload.expiresAt <= new Date()) {
        return NextResponse.json(
          { error: serverMessages.runtimeUploadIsAlreadyClaimedOrExpired },
          { status: 400 },
        );
      }
      try {
        await verifyStoredUpload(
          upload,
          isSupabaseStorageConfigured() ? undefined : uploadRoot(),
        );
      } catch {
        return NextResponse.json(
          { error: serverMessages.runtimeTheFileDidNotArriveIntactUploadItAgain },
          { status: 422 },
        );
      }
      const createdAttachment = await db.$transaction(async (tx) => {
        const finalName = customName || upload.fileName;
        const claimed = await tx.uploadObject.updateMany({
          where: {
            fileUrl,
            ownerId: user.id,
            claimedAt: null,
            expiresAt: { gt: new Date() },
          },
          data: {
            claimedAt: entityId && entityId !== "pending" ? new Date() : null,
          },
        });
        if (claimed.count !== 1)
          throw new Error(serverMessages.runtimeUploadIsAlreadyClaimedOrExpired);
        if (!entityId || entityId === "pending") return null;

        const attachment = await tx.attachment.create({
          data: {
            fileName: finalName.slice(0, 200),
            fileUrl,
            fileSize: upload.fileSize,
            mimeType: upload.mimeType,
            entityType,
            entityId,
            uploadedById: user.id,
          },
        });

        // The VAT certificate is set from Settings → Tax, never as a side effect of filing a document here:
        // other tax certificates and archived files share this entity type.

        await tx.activityLog.create({
          data: {
            userId: user.id,
            action: "upload",
            entityType: "attachment",
            entityId: attachment.id,
            details: { entityType, entityId, fileSize: upload.fileSize },
          },
        });
        return attachment;
      });

      if (entityType === "employee")
        revalidatePath(ROUTES.hr.employee(entityId));
      revalidatePath(ROUTES.archive);
      revalidatePath(ROUTES.settings.company);
      revalidatePath(ROUTES.payments.list);

      return NextResponse.json({
        success: true,
        fileUrl,
        fileName: customName || upload.fileName,
        fileSize: upload.fileSize,
        mimeType: upload.mimeType || "application/octet-stream",
        attachment: createdAttachment,
      });
    } catch (err: unknown) {
      console.error("Upload finalize error:", err);
      return NextResponse.json(
        { success: false, error: serverMessages.runtimeFailedToFinalizeUpload },
        { status: 500 },
      );
    }
  });
}

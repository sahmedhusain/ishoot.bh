import { serverMessages } from "@platform/locales";

import { ROUTES } from "../../../../constants/routes";
import { measureOperation } from "@platform/database";
import {
  claimUpload,
  isApiError,
  verifyUpload,
  type FileRecord,
} from "@platform/api-client";
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
        return NextResponse.json(
          { error: serverMessages.unauthorized },
          { status: 401 },
        );

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
        return NextResponse.json(
          { error: serverMessages.runtimeMissingFileUrl },
          { status: 400 },
        );
      }

      try {
        await requireAttachmentAccess(entityType, entityId, "write");
      } catch {
        return NextResponse.json(
          { error: serverMessages.runtimeUploadAccessDenied },
          { status: 403 },
        );
      }
      const pending = !entityId || entityId === "pending";
      let upload: FileRecord;
      try {
        upload = pending
          ? await verifyUpload(fileUrl, user.id)
          : await claimUpload(fileUrl, user.id);
      } catch (error) {
        if (
          isApiError(
            error,
            "file_not_found",
            "upload_not_owned",
            "invalid_file_url",
          )
        )
          return NextResponse.json(
            {
              error: serverMessages.runtimeUploadRecordNotFoundOrNotOwnedByYou,
            },
            { status: 404 },
          );
        if (isApiError(error, "upload_unavailable"))
          return NextResponse.json(
            { error: serverMessages.runtimeUploadIsAlreadyClaimedOrExpired },
            { status: 400 },
          );
        if (isApiError(error, "file_content_mismatch"))
          return NextResponse.json(
            {
              error:
                serverMessages.runtimeTheFileDidNotArriveIntactUploadItAgain,
            },
            { status: 422 },
          );
        throw error;
      }
      const createdAttachment = pending
        ? null
        : {
            id: `att_${Date.now()}`,
            fileName: (customName || upload.fileName).slice(0, 200),
            fileUrl,
            fileSize: upload.fileSize,
            mimeType: upload.mimeType,
            entityType,
            entityId,
            uploadedById: user.id,
          };

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

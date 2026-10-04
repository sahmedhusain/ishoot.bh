import { ROUTES } from "../../../../constants/routes";
import { verifyStoredUpload } from "@ishoot/database";
import { measureOperation,db } from "@ishoot/database";
import { NextRequest,NextResponse } from "next/server";
import { getCurrentUser } from "../../../../lib/auth";
import { requireAttachmentAccess } from "../../../../lib/attachment-access";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  return measureOperation("admin:upload/finalize:POST", async () => {
    try {
      const user = await getCurrentUser();
      if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

      const input: unknown = await req.json();
      if (!input || typeof input !== "object" || Array.isArray(input)) return NextResponse.json({ error: "Invalid upload input" }, { status: 400 });
      const { fileUrl, entityType = "general", entityId = "", customName } = input as Record<string, unknown>;

      if (!fileUrl || typeof fileUrl !== "string" || typeof entityType !== "string" || typeof entityId !== "string" || (customName !== undefined && typeof customName !== "string")) {
        return NextResponse.json({ error: "Missing fileUrl" }, { status: 400 });
      }

      try { await requireAttachmentAccess(entityType, entityId, "write"); }
      catch { return NextResponse.json({ error: "Upload access denied" }, { status: 403 }); }
      const upload = await db.uploadObject.findUnique({ where: { fileUrl } });
      if (!upload || upload.ownerId !== user.id) {
        return NextResponse.json({ error: "Upload record not found or not owned by you" }, { status: 404 });
      }
      if (upload.claimedAt || upload.expiresAt <= new Date()) {
        return NextResponse.json({ error: "Upload is already claimed or expired" }, { status: 400 });
      }
      await verifyStoredUpload(upload);
      const createdAttachment = await db.$transaction(async (tx) => {
        const finalName = customName || upload.fileName;
        const claimed = await tx.uploadObject.updateMany({
          where: { fileUrl, ownerId: user.id, claimedAt: null, expiresAt: { gt: new Date() } },
          data: { claimedAt: entityId && entityId !== "pending" ? new Date() : null }
        });
        if (claimed.count !== 1) throw new Error("Upload is already claimed or expired");
        if (!entityId || entityId === "pending") return null;

        const attachment = await tx.attachment.create({
          data: {
            fileName: finalName.slice(0, 200),
            fileUrl,
            fileSize: upload.fileSize,
            mimeType: upload.mimeType,
            entityType,
            entityId,
            uploadedById: user.id
          }
        });

        if (entityType === "company_setting") {
          await tx.companySetting.update({ where: { singleton: 1 }, data: { vatCertificateUrl: fileUrl } });
        }

        await tx.activityLog.create({
          data: { userId: user.id, action: "upload", entityType: "attachment", entityId: attachment.id, details: { entityType, entityId, fileSize: upload.fileSize } }
        });
        return attachment;
      });

      if (entityType === "employee") revalidatePath(ROUTES.hr.employee(entityId));
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
      return NextResponse.json({ success: false, error: "Failed to finalize upload" }, { status: 500 });
    }
  });
}

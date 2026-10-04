import { measureOperation, db } from "@ishoot/database";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "../../../../lib/auth";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  return measureOperation("admin:upload/finalize:POST", async () => {
    try {
      const user = await getCurrentUser();
      if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

      const { fileUrl, entityType = "general", entityId = "", customName } = await req.json();

      if (!fileUrl || typeof fileUrl !== "string") {
        return NextResponse.json({ error: "Missing fileUrl" }, { status: 400 });
      }

      const upload = await db.uploadObject.findUnique({ where: { fileUrl } });
      if (!upload || upload.ownerId !== user.id) {
        return NextResponse.json({ error: "Upload record not found or not owned by you" }, { status: 404 });
      }
      if (upload.claimedAt && upload.claimedAt.getTime() > 0 && entityId !== "pending") {
        return NextResponse.json({ error: "Upload is already claimed" }, { status: 400 });
      }

      const createdAttachment = await db.$transaction(async (tx) => {
        const finalName = customName || upload.fileName;
        await tx.uploadObject.update({
          where: { fileUrl },
          data: { claimedAt: entityId && entityId !== "pending" ? new Date() : null }
        });
        
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

      revalidatePath("/dashboard/archive");
      revalidatePath("/dashboard/settings/company");
      revalidatePath("/dashboard/payments");

      return NextResponse.json({
        success: true,
        fileUrl,
        fileName: customName || upload.fileName,
        fileSize: upload.fileSize,
        mimeType: upload.mimeType || "application/octet-stream",
        attachment: createdAttachment,
      });
    } catch (err: any) {
      console.error("Upload finalize error:", err);
      return NextResponse.json({ success: false, error: "Failed to finalize upload" }, { status: 500 });
    }
  });
}

import { measureOperation, db } from "@ishoot/database";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "../../../../lib/auth";
import { requireAttachmentAccess } from "../../../../lib/attachment-access";
import { randomUUID } from "crypto";
import { getStorageClient } from "@ishoot/database";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  return measureOperation("admin:upload/init:POST", async () => {
    try {
      const user = await getCurrentUser();
      if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

      const { fileName, fileType, fileSize, entityType = "general", entityId = "" } = await req.json();

      if (fileSize > 10 * 1024 * 1024) return NextResponse.json({ error: "Maximum file size is 10 MB" }, { status: 413 });
      const extensions: Record<string, string> = { "application/pdf": ".pdf", "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp" };
      if (!extensions[fileType]) return NextResponse.json({ error: "Unsupported file type" }, { status: 415 });

      await requireAttachmentAccess(entityType, entityId, "write");

      let subfolder = "general";
      if (entityType === "payment" || entityType === "bank") subfolder = "payments";
      else if (entityType === "company_setting") subfolder = "certificates";
      else if (entityType === "invoice") subfolder = "invoices";
      else if (entityType === "contact" || entityType === "customer_vault") subfolder = "vault";
      else if (entityType === "deal") subfolder = "deals";

      const publicBrand = entityType === "company_asset" && ["logo_light", "logo_dark", "icon_light", "icon_dark", "icon"].includes(entityId);
      if (publicBrand && fileType === "application/pdf") return NextResponse.json({ error: "Brand assets must be images" }, { status: 415 });
      if (publicBrand) subfolder = "brand";

      const ext = extensions[fileType];
      const rawBase = fileName.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 40);
      const uniqueFileName = `${randomUUID()}_${rawBase}${ext}`;
      const filePath = `${subfolder}/${uniqueFileName}`;
      const bucket = publicBrand ? "public-assets" : "private-assets";

      const client = getStorageClient();
      const { data, error } = await client.storage.from(bucket).createSignedUploadUrl(filePath);
      
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      const fileUrl = `/api/files/${subfolder}/${uniqueFileName}`;
      await db.uploadObject.create({
        data: {
          fileUrl,
          ownerId: user.id,
          fileName: fileName.slice(0, 200),
          fileSize,
          mimeType: fileType,
          isPublic: publicBrand,
          expiresAt: new Date(Date.now() + 86400000),
        }
      });

      return NextResponse.json({
        success: true,
        signedUrl: data.signedUrl,
        fileUrl,
        filePath,
        token: data.token,
        bucket,
        uniqueFileName,
      });
    } catch (err: any) {
      console.error("Upload init error:", err);
      return NextResponse.json({ success: false, error: "Failed to initialize upload" }, { status: 500 });
    }
  });
}

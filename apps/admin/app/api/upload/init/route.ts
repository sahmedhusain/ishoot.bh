import { serverTemplates, formatMessage, serverMessages } from "@platform/locales";


import { measureOperation,db } from "@platform/database";
import { NextRequest,NextResponse } from "next/server";
import { getCurrentUser } from "../../../../lib/auth";
import { requireAttachmentAccess } from "../../../../lib/attachment-access";
import { randomUUID } from "crypto";
import { getStorageClient, isSupabaseStorageConfigured } from "@platform/database";

const maxUploadMb = 10;
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  return measureOperation("admin:upload/init:POST", async () => {
    try {
      const user = await getCurrentUser();
      if (!user) return NextResponse.json({ error: serverMessages.unauthorized }, { status: 401 });

      const input: unknown = await req.json();
      if (!input || typeof input !== "object" || Array.isArray(input)) return NextResponse.json({ error: serverMessages.runtimeInvalidUploadInput }, { status: 400 });
      const { fileName, fileType, fileSize, entityType = "general", entityId = "" } = input as Record<string, unknown>;

      if (typeof fileName !== "string" || !fileName.trim() || typeof fileType !== "string" || typeof fileSize !== "number" || !Number.isInteger(fileSize) || fileSize <= 0 || typeof entityType !== "string" || typeof entityId !== "string")
        return NextResponse.json({ error: serverMessages.runtimeInvalidUploadInput }, { status: 400 });
      if (fileSize > maxUploadMb * 1024 * 1024) return NextResponse.json({ error: formatMessage(serverTemplates.maximumFileSize, { 0: maxUploadMb }) }, { status: 413 });
      const extensions: Record<string, string> = { "application/pdf": ".pdf", "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp" };
      // Brand fonts (woff2) are accepted only for the company theme, and are public like the logos.
      const brandFont = entityType === "company_font";
      if (brandFont ? fileType !== "font/woff2" : !Object.hasOwn(extensions, fileType)) return NextResponse.json({ error: serverMessages.runtimeUnsupportedFileType }, { status: 415 });

      try { await requireAttachmentAccess(entityType, entityId, "write"); }
      catch { return NextResponse.json({ error: serverMessages.runtimeUploadAccessDenied }, { status: 403 }); }

      let subfolder = "general";
      if (entityType === "payment" || entityType === "bank") subfolder = "payments";
      else if (entityType === "company_setting") subfolder = "certificates";
      else if (entityType === "invoice" || entityType === "quotation") subfolder = "invoices";
      else if (entityType === "contact" || entityType === "customer_vault") subfolder = "vault";
      else if (entityType === "deal") subfolder = "deals";

      const publicBrand = brandFont || (entityType === "company_asset" && ["logo_light", "logo_dark", "icon_light", "icon_dark", "icon"].includes(entityId)) || entityType === "cms_asset";
      if (publicBrand && fileType === "application/pdf") return NextResponse.json({ error: serverMessages.runtimeBrandAssetsMustBeImages }, { status: 415 });
      if (publicBrand) subfolder = "brand";

      const ext = brandFont ? ".woff2" : extensions[fileType];
      const rawBase = fileName.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 40);
      const uniqueFileName = `${randomUUID()}_${rawBase}${ext}`;
      const filePath = `${subfolder}/${uniqueFileName}`;
      const bucket = publicBrand ? "public-assets" : "private-assets";

      const fileUrl = `/api/files/${subfolder}/${uniqueFileName}`;
      // Without Supabase Storage (local development), the browser sends the file to our own owner-checked endpoint.
      let signed: { signedUrl: string; token: string | null };
      if (isSupabaseStorageConfigured()) {
        const { data, error } = await getStorageClient().storage.from(bucket).createSignedUploadUrl(filePath);
        if (error) {
          console.error("Upload init storage error:", error.message);
          return NextResponse.json({ error: serverMessages.runtimeFileStorageIsUnavailableTryAgainShortly }, { status: 503 });
        }
        signed = { signedUrl: data.signedUrl, token: data.token };
      } else {
        signed = { signedUrl: `/api/upload/local/${subfolder}/${uniqueFileName}`, token: null };
      }
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
        signedUrl: signed.signedUrl,
        fileUrl,
        filePath,
        token: signed.token,
        bucket,
        uniqueFileName,
      });
    } catch (err: unknown) {
      console.error("Upload init error:", err);
      return NextResponse.json({ success: false, error: serverMessages.runtimeFailedToInitializeUpload }, { status: 500 });
    }
  });
}

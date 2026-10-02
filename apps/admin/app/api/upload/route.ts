import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { getCurrentUser } from "../../../lib/auth";
import { requireAttachmentAccess } from "../../../lib/attachment-access";
import { randomUUID } from "crypto";
import { createAttachment, db, createActivityLog } from "@ishoot/database";
import { getTranslations } from "@ishoot/locales";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const trans = getTranslations("en");
  try {
    if (!(await getCurrentUser())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: trans.api.upload.noFile },
        { status: 400 },
      );
    }

    const entityType = (formData.get("entityType") as string) || "general";
    const entityId = (formData.get("entityId") as string) || "";
    const customName = (formData.get("customName") as string) || file.name;
    const documentType = (formData.get("documentType") as string) || "";

    const user = await requireAttachmentAccess(entityType, entityId, "write");
    if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: "Maximum file size is 10 MB" }, { status: 413 });
    const extensions: Record<string, string> = { "application/pdf": ".pdf", "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp" };
    if (!extensions[file.type]) return NextResponse.json({ error: "Unsupported file type" }, { status: 415 });

    // Determine target upload directory
    let subfolder = "general";
    if (entityType === "payment" || documentType.includes("cheque") || documentType.includes("bank")) {
      subfolder = "payments";
    } else if (entityType === "company_setting" || documentType.includes("vat")) {
      subfolder = "certificates";
    } else if (entityType === "invoice") {
      subfolder = "invoices";
    } else if (entityType === "contact" || entityType === "customer_vault") {
      subfolder = "vault";
    } else if (entityType === "deal") {
      subfolder = "deals";
    }

    const publicBrand = entityType === "company_asset" && ["logo_light", "logo_dark", "icon_light", "icon_dark", "icon"].includes(entityId);
    if (publicBrand && file.type === "application/pdf") return NextResponse.json({ error: "Brand assets must be images" }, { status: 415 });
    if (publicBrand) subfolder = "brand";
    const uploadDir = path.join(process.cwd(), publicBrand ? "public" : "private", "uploads", subfolder);
    await mkdir(uploadDir, { recursive: true });

    // Generate sanitized unique filename
    const ext = extensions[file.type];
    const rawBase = path.basename(file.name, ext).replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 40);
    const uniqueFileName = `${randomUUID()}_${rawBase}${ext}`;
    const filePath = path.join(uploadDir, uniqueFileName);

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const valid = file.type === "application/pdf" ? buffer.subarray(0, 5).toString() === "%PDF-"
      : file.type === "image/png" ? buffer.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))
      : file.type === "image/jpeg" ? buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255
      : buffer.subarray(0, 4).toString() === "RIFF" && buffer.subarray(8, 12).toString() === "WEBP";
    if (!valid) return NextResponse.json({ error: "File content does not match its type" }, { status: 415 });
    await writeFile(filePath, buffer, { flag: "wx" });

    const fileUrl = publicBrand ? `/uploads/brand/${uniqueFileName}` : `/api/files/${subfolder}/${uniqueFileName}`;

    let createdAttachment = null;

    // If an entityId is provided (and not pending), persist directly to Attachment table
    if (entityType && entityId && entityId !== "pending") {
      createdAttachment = await createAttachment({
        fileName: customName,
        fileUrl,
        fileSize: file.size,
        mimeType: file.type || "application/octet-stream",
        entityType,
        entityId,
        uploadedById: user?.id,
      });

      if (entityType === "company_setting") {
        await db.companySetting.updateMany({
          data: { vatCertificateUrl: fileUrl },
        });
      }

      if (user) {
        await createActivityLog({
          user_id: user.id,
          action: "upload",
          entity_type: "attachment",
          entity_id: createdAttachment.id,
          details: {
            fileName: customName,
            entityType,
            entityId,
            fileUrl,
            documentType,
          },
        });
      }

      revalidatePath("/dashboard/archive");
      revalidatePath("/dashboard/settings/company");
      revalidatePath("/dashboard/payments");
    }

    return NextResponse.json({
      success: true,
      fileUrl,
      fileName: customName,
      fileSize: file.size,
      mimeType: file.type || "application/octet-stream",
      attachment: createdAttachment,
    });
  } catch (err: any) {
    console.error("Upload error in /api/upload:", err);
    return NextResponse.json(
      { success: false, error: trans.api.upload.failed },
      { status: 500 },
    );
  }
}

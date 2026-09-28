import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { getCurrentUser } from "../../../lib/auth";
import { createAttachment, db, createActivityLog } from "@ishoot/database";
import { getTranslations } from "@ishoot/locales";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const trans = getTranslations("en");
  try {
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

    const uploadDir = path.join(process.cwd(), "public", "uploads", subfolder);
    await mkdir(uploadDir, { recursive: true });

    // Generate sanitized unique filename
    const ext = path.extname(file.name) || (file.type === "application/pdf" ? ".pdf" : ".jpg");
    const rawBase = path.basename(file.name, ext).replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 40);
    const uniqueFileName = `${Date.now()}_${rawBase}${ext}`;
    const filePath = path.join(uploadDir, uniqueFileName);

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    const fileUrl = `/uploads/${subfolder}/${uniqueFileName}`;
    const user = await getCurrentUser();

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
      { success: false, error: err.message || trans.api.upload.failed },
      { status: 500 },
    );
  }
}

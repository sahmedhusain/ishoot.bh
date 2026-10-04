import { db, runAtomicMutation } from "../db";
import { claimUpload } from "../services/uploads";
import { CompanyDocument, DocumentCategory } from "../types";

export function mapCompanyDocument(doc: any): CompanyDocument {
  return {
    id: doc.id,
    title_en: doc.titleEn,
    title_ar: doc.titleAr || undefined,
    category: (doc.category as DocumentCategory) || "company_profile",
    document_number: doc.documentNumber || undefined,
    file_url: doc.fileUrl,
    file_size: doc.fileSize || undefined,
    mime_type: doc.mimeType || undefined,
    valid_from: doc.validFrom
      ? doc.validFrom.toISOString().split("T")[0]
      : undefined,
    valid_until: doc.validUntil
      ? doc.validUntil.toISOString().split("T")[0]
      : undefined,
    notes: doc.notes || undefined,
    uploaded_by_id: doc.uploadedById || undefined,
    created_at: doc.createdAt.toISOString(),
    updated_at: doc.updatedAt.toISOString(),
  };
}

export async function getCompanyDocuments(
  category?: string,
): Promise<CompanyDocument[]> {
  try {
    const where: any = {};
    if (category) {
      where.category = category;
    }
    const docs = await db.companyDocument.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
    return docs.map(mapCompanyDocument);
  } catch (e) {
    console.error("Error fetching company documents:", e);
    throw e;
  }
}

export async function createCompanyDocument(data: {
  title_en: string;
  title_ar?: string;
  category: DocumentCategory;
  document_number?: string;
  file_url: string;
  file_size?: number;
  mime_type?: string;
  valid_from?: string;
  valid_until?: string;
  notes?: string;
  uploaded_by_id?: string;
}): Promise<CompanyDocument> {
  return runAtomicMutation(async () => {
  const upload = await claimUpload(db, data.file_url, data.uploaded_by_id);
  const created = await db.companyDocument.create({
    data: {
      titleEn: data.title_en,
      titleAr: data.title_ar || null,
      category: data.category,
      documentNumber: data.document_number || null,
      fileUrl: data.file_url,
      fileSize: upload.fileSize,
      mimeType: upload.mimeType,
      validFrom: data.valid_from ? new Date(data.valid_from) : null,
      validUntil: data.valid_until ? new Date(data.valid_until) : null,
      notes: data.notes || null,
      uploadedById: data.uploaded_by_id || null,
    },
  });
  return mapCompanyDocument(created);
  });
}

export async function deleteCompanyDocument(id: string): Promise<boolean> {
  try {
    await db.companyDocument.delete({ where: { id } });
    return true;
  } catch (e) {
    console.error(`Error deleting company document ${id}:`, e);
    throw e;
  }
}

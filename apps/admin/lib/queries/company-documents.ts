import {
  listEntityAttachments,
  createEntityAttachment,
  deleteEntityAttachment,
} from "@platform/api-client";
import { claimUploadOrLink } from "../services/uploads";
import { CompanyDocument, DocumentCategory } from "../types";

type DocMeta = {
  title_en?: string;
  title_ar?: string;
  document_number?: string;
  valid_from?: string;
  valid_until?: string;
  notes?: string;
};

function parseMeta(raw: string | null | undefined): DocMeta {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed ? parsed : { notes: raw };
  } catch {
    return { notes: raw };
  }
}

export function mapCompanyDocument(att: any): CompanyDocument {
  const meta = parseMeta(att.notes);
  return {
    id: att.id,
    title_en: meta.title_en || att.fileName,
    title_ar: meta.title_ar || undefined,
    category: (att.category as DocumentCategory) || "company_profile",
    document_number: meta.document_number || undefined,
    file_url: att.fileUrl,
    file_size: att.sizeBytes || undefined,
    mime_type: att.mimeType || undefined,
    valid_from: meta.valid_from || undefined,
    valid_until: meta.valid_until || undefined,
    notes: meta.notes || undefined,
    uploaded_by_id: att.uploadedById || undefined,
    created_at: att.createdAt || new Date().toISOString(),
    updated_at: att.createdAt || new Date().toISOString(),
  };
}

export async function getCompanyDocuments(
  category?: string,
): Promise<CompanyDocument[]> {
  const raw = await listEntityAttachments({ entityType: "company_document" }).catch(() => []);
  const docs = Array.isArray(raw) ? raw : ((raw as { items?: any[] } | null)?.items ?? []);
  return docs
    .filter((d) => !category || d.category === category)
    .map(mapCompanyDocument);
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
  const upload = await claimUploadOrLink(data.file_url, data.uploaded_by_id).catch(() => ({
    fileSize: data.file_size ?? 0,
    mimeType: data.mime_type ?? "application/octet-stream",
  }));
  const created = await createEntityAttachment({
    fileName: data.title_en,
    fileUrl: data.file_url,
    sizeBytes: upload.fileSize || data.file_size || 0,
    mimeType: upload.mimeType || data.mime_type || "application/octet-stream",
    entityType: "company_document",
    entityId: "company",
    category: data.category,
    notes: JSON.stringify({
      title_en: data.title_en,
      title_ar: data.title_ar || undefined,
      document_number: data.document_number || undefined,
      valid_from: data.valid_from || undefined,
      valid_until: data.valid_until || undefined,
      notes: data.notes || undefined,
    } satisfies DocMeta),
    uploadedById: data.uploaded_by_id,
  });
  return mapCompanyDocument(created);
}

export async function deleteCompanyDocument(id: string): Promise<boolean> {
  await deleteEntityAttachment(id);
  return true;
}

import { ROUTES } from "../constants/routes";
import { claimUploadOrLink } from "../services/uploads";
import {
  listEntityAttachments,
  createEntityAttachment,
  deleteEntityAttachment,
  listContacts,
  listInvoices,
  listDeals,
  listPayments,
  listEmployees,
  listContracts,
} from "@platform/api-client";
import type { Attachment } from "../types";

export interface EnrichedAttachment extends Attachment {
  entity_label?: string;
  entity_link?: string;
  uploader_name?: string;
}

export async function getAllAttachments(options?: {
  ids?: string[];
  entityType?: string;
  entityId?: string;
}): Promise<EnrichedAttachment[]> {
  const records = await listEntityAttachments({
    entityType: options?.entityType,
    entityId: options?.entityId,
  }).catch(() => []);

  const filtered = options?.ids?.length
    ? records.filter((r) => options.ids!.includes(r.id))
    : records;

  const [contacts, invoices, deals, payments, employees, contracts] = await Promise.all([
    listContacts().catch(() => []),
    listInvoices().catch(() => []),
    listDeals().catch(() => []),
    listPayments().catch(() => []),
    listEmployees().catch(() => []),
    listContracts().catch(() => []),
  ]);

  const contactMap = new Map<string, string>(
    contacts.map(
      (c: any) =>
        [
          c.id,
          c.company || `${c.firstName || ""} ${c.lastName || ""}`.trim() || c.id,
        ] as [string, string],
    ),
  );
  const invoiceMap = new Map<string, string>(
    invoices.map((i: any) => [i.id, i.invoiceNumber] as [string, string]),
  );
  const dealMap = new Map<string, string>(
    deals.map((d: any) => [d.id, d.title] as [string, string]),
  );
  const paymentMap = new Map<string, string>(
    payments.map(
      (p: any) => [p.id, p.paymentNumber || p.reference || p.id] as [string, string],
    ),
  );
  const employeeMap = new Map<string, string>(
    employees.map(
      (e: any) =>
        [
          e.id,
          `${e.firstNameEn || ""} ${e.lastNameEn || ""}`.trim() || e.employeeNumber || e.id,
        ] as [string, string],
    ),
  );
  const contractMap = new Map<string, string>(
    contracts.map(
      (c: any) => [c.id, c.contractNumber || c.title || c.id] as [string, string],
    ),
  );

  return filtered.map((r) => {
    let entityLabel = r.entityId;
    let entityLink: string | undefined;

    if (r.entityType === "contact" || r.entityType === "customer_vault" || r.clientId) {
      const cid = r.clientId || r.entityId;
      entityLabel = contactMap.get(cid) || "Client Document";
      entityLink = ROUTES.crm.customer(cid);
    } else if (r.entityType === "invoice") {
      entityLabel = invoiceMap.get(r.entityId) || "Invoice Document";
      entityLink = ROUTES.invoices.detail(r.entityId);
    } else if (r.entityType === "deal") {
      entityLabel = dealMap.get(r.entityId) || "Deal Document";
      entityLink = ROUTES.crm.deal(r.entityId);
    } else if (r.entityType === "payment") {
      entityLabel = paymentMap.get(r.entityId) || `Payment Receipt (${r.entityId.slice(0, 8)})`;
      entityLink = ROUTES.payments.detail(r.entityId);
    } else if (r.entityType === "employee" || r.employeeId) {
      const eid = r.employeeId || r.entityId;
      entityLabel = employeeMap.get(eid) || "Employee Document";
      entityLink = `/dashboard/hr/employees/${eid}`;
    } else if (r.entityType === "contract") {
      entityLabel = contractMap.get(r.entityId) || "Contract Document";
    } else if (r.entityType === "letter") {
      entityLabel = "Official Letter";
      entityLink = `/dashboard/letters/${r.entityId}`;
    } else if (r.entityType === "asset") {
      entityLabel = "Asset Document";
      entityLink = `/dashboard/assets/${r.entityId}`;
    } else if (r.entityType === "order") {
      entityLabel = "Order Document";
      entityLink = `/dashboard/orders/${r.entityId}`;
    } else if (r.entityType === "mom") {
      entityLabel = "MoM Document";
      entityLink = `/dashboard/moms/${r.entityId}`;
    } else if (r.entityType === "task") {
      entityLabel = "Task Document";
      entityLink = `/dashboard/tasks/${r.entityId}`;
    } else if (r.entityType === "company_setting") {
      entityLabel = "NBR VAT Registration Certificate";
      entityLink = ROUTES.settings.company;
    }

    return {
      id: r.id,
      file_name: r.fileName,
      file_url: r.fileUrl,
      file_size: r.sizeBytes || undefined,
      mime_type: r.mimeType || undefined,
      entity_type: r.entityType,
      entity_id: r.entityId,
      entity_label: entityLabel,
      entity_link: entityLink,
      uploaded_by: r.uploadedById || undefined,
      created_at: r.createdAt,
    };
  });
}

export async function createAttachment(data: {
  fileName: string;
  fileUrl: string;
  fileSize?: number;
  mimeType?: string;
  entityType: string;
  entityId: string;
  uploadedById?: string;
  documentId?: string;
  clientId?: string;
  employeeId?: string;
  projectId?: string;
  category?: string;
}) {
  const upload = await claimUploadOrLink(data.fileUrl, data.uploadedById).catch(() => ({
    fileSize: data.fileSize ?? 0,
    mimeType: data.mimeType ?? "application/octet-stream",
  }));
  return createEntityAttachment({
    fileName: data.fileName,
    fileUrl: data.fileUrl,
    sizeBytes: upload.fileSize || data.fileSize || 0,
    mimeType: upload.mimeType || data.mimeType || "application/octet-stream",
    entityType: data.entityType,
    entityId: data.entityId,
    uploadedById: data.uploadedById,
    documentId: data.documentId,
    clientId: data.clientId ?? (data.entityType === "contact" || data.entityType === "customer_vault" ? data.entityId : undefined),
    employeeId: data.employeeId ?? (data.entityType === "employee" ? data.entityId : undefined),
    projectId: data.projectId ?? (data.entityType === "project" ? data.entityId : undefined),
    category: data.category,
  });
}

export async function deleteAttachment(id: string) {
  await deleteEntityAttachment(id);
  return { id };
}

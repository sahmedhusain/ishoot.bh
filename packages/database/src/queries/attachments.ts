import { db } from "../db";
import type { Attachment } from "../types";

export interface EnrichedAttachment extends Attachment {
  entity_label?: string;
  entity_link?: string;
  uploader_name?: string;
}

export async function getAllAttachments(): Promise<EnrichedAttachment[]> {
  const records = await db.attachment.findMany({
    include: {
      uploadedBy: {
        select: { fullName: true, email: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const contactIds = records
    .filter((r) => r.entityType === "contact" || r.entityType === "customer_vault")
    .map((r) => r.entityId);
  const invoiceIds = records
    .filter((r) => r.entityType === "invoice")
    .map((r) => r.entityId);
  const dealIds = records
    .filter((r) => r.entityType === "deal")
    .map((r) => r.entityId);

  const [contacts, invoices, deals] = await Promise.all([
    contactIds.length > 0
      ? db.crmContact.findMany({
          where: { id: { in: contactIds } },
          select: { id: true, firstName: true, lastName: true, companyName: true },
        })
      : [],
    invoiceIds.length > 0
      ? db.invoice.findMany({
          where: { id: { in: invoiceIds } },
          select: { id: true, invoiceNumber: true },
        })
      : [],
    dealIds.length > 0
      ? db.crmDeal.findMany({
          where: { id: { in: dealIds } },
          select: { id: true, title: true },
        })
      : [],
  ]);

  const contactMap = new Map(
    contacts.map((c) => [
      c.id,
      c.companyName || `${c.firstName} ${c.lastName || ""}`.trim(),
    ]),
  );
  const invoiceMap = new Map(invoices.map((i) => [i.id, i.invoiceNumber]));
  const dealMap = new Map(deals.map((d) => [d.id, d.title]));

  return records.map((r: any) => {
    let entityLabel = r.entityId;
    let entityLink: string | undefined;

    if (r.entityType === "contact" || r.entityType === "customer_vault") {
      entityLabel = contactMap.get(r.entityId) || "Client Document";
      entityLink = `/dashboard/crm/customers/${r.entityId}`;
    } else if (r.entityType === "invoice") {
      entityLabel = invoiceMap.get(r.entityId) || "Invoice Document";
      entityLink = `/dashboard/invoices/${r.entityId}`;
    } else if (r.entityType === "deal") {
      entityLabel = dealMap.get(r.entityId) || "Deal Document";
      entityLink = `/dashboard/crm/deals/${r.entityId}`;
    }

    return {
      id: r.id,
      file_name: r.fileName,
      file_url: r.fileUrl,
      file_size: r.fileSize || undefined,
      mime_type: r.mimeType || undefined,
      entity_type: r.entityType,
      entity_id: r.entityId,
      entity_label: entityLabel,
      entity_link: entityLink,
      uploaded_by: r.uploadedBy?.fullName || r.uploadedBy?.email || undefined,
      created_at: r.createdAt.toISOString(),
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
}) {
  return db.attachment.create({
    data: {
      fileName: data.fileName,
      fileUrl: data.fileUrl,
      fileSize: data.fileSize,
      mimeType: data.mimeType,
      entityType: data.entityType,
      entityId: data.entityId,
      uploadedById: data.uploadedById,
    },
  });
}

export async function deleteAttachment(id: string) {
  return db.attachment.delete({
    where: { id },
  });
}

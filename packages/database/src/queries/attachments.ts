import { claimUpload } from "../services/uploads";
import { db } from "../db";
import type { Attachment } from "../types";

export interface EnrichedAttachment extends Attachment {
  entity_label?: string;
  entity_link?: string;
  uploader_name?: string;
}

export async function getAllAttachments(options?: { ids?: string[] }): Promise<EnrichedAttachment[]> {
  const records = await db.attachment.findMany({
    where: options?.ids ? { id: { in: options.ids } } : undefined,
    include: {
      uploadedBy: {
        select: { fullName: true, email: true },
      },
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
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
  const paymentIds = records
    .filter((r) => r.entityType === "payment")
    .map((r) => r.entityId);

  const [contacts, invoices, deals, payments] = await Promise.all([
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
    paymentIds.length > 0
      ? db.payment.findMany({
          where: { id: { in: paymentIds } },
          select: {
            id: true,
            receiptNumber: true,
            invoice: {
              select: {
                invoiceNumber: true,
                client: {
                  select: { firstName: true, lastName: true, companyName: true },
                },
                deal: {
                  select: {
                    contact: {
                      select: { firstName: true, lastName: true, companyName: true },
                    },
                  },
                },
              },
            },
          },
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
  const paymentMap = new Map(
    payments.map((p) => {
      const client = p.invoice?.client || p.invoice?.deal?.contact;
      const clientName =
        client?.companyName ||
        `${client?.firstName || ""} ${client?.lastName || ""}`.trim();
      const label = clientName
        ? `${p.receiptNumber} (${clientName})`
        : p.receiptNumber;
      return [p.id, label];
    }),
  );

  const mapped = records.map((r: any) => {
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
    } else if (r.entityType === "payment") {
      entityLabel =
        paymentMap.get(r.entityId) || `Payment Receipt (${r.entityId.slice(0, 8)})`;
      entityLink = `/dashboard/payments/${r.entityId}`;
    } else if (r.entityType === "company_setting") {
      entityLabel = "NBR VAT Registration Certificate";
      entityLink = `/dashboard/settings/company`;
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


  return mapped;
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
  return db.$transaction(async (tx) => {
    const upload = await claimUpload(tx, data.fileUrl, data.uploadedById);
    return tx.attachment.create({
    data: {
      fileName: data.fileName,
      fileUrl: data.fileUrl,
      fileSize: upload.fileSize,
      mimeType: upload.mimeType,
      entityType: data.entityType,
      entityId: data.entityId,
      uploadedById: data.uploadedById,
    },
  });
  });
}

export async function deleteAttachment(id: string) {
  return db.attachment.delete({
    where: { id },
  });
}

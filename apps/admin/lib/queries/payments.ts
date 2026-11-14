import { assertCompanyCurrency } from "../finance/company-currency";
import { serverMessages } from "@platform/locales";
import { claimUploadOrLink } from "../services/uploads";
import {
  paymentStatusFor,
  validMoneyAmount,
  roundMoney,
  sumMoney,
  toMinorUnits,
} from "../finance/money";
import { allocateDocumentNumber } from "../finance/numbering";
import { PAYABLE_INVOICE_STATUSES } from "../constants/finance";
import { advanceDealForEvent } from "./crm";
import { mapDocumentTaxLines } from "../finance/vat";
import { db } from "../atomic";
import { Payment, SupportedCurrency, PaymentMethod } from "../types";

function toIso(val: any): string {
  if (!val) return new Date().toISOString();
  if (val instanceof Date) return val.toISOString();
  if (typeof val === "string") return new Date(val).toISOString();
  return new Date(val).toISOString();
}

function toDateStr(val: any): string {
  return toIso(val).split("T")[0];
}

function mapPayment(p: any): Payment {
  const invPayments = p.invoice?.payments || [];
  const totalPaidOnInvoice =
    invPayments.length > 0
      ? invPayments.reduce(
          (acc: number, item: any) => acc + Number(item.amount),
          0,
        )
      : Number(p.amount);
  const totalInvoice = p.invoice ? Number(p.invoice.totalAmount) : 0;
  const amountDue = Math.max(0, totalInvoice - totalPaidOnInvoice);
  const contactObj = p.invoice?.client || p.invoice?.deal?.contact;

  return {
    id: p.id,
    invoice_id: p.invoiceId,
    receipt_number: p.receiptNumber,
    payment_date: toDateStr(p.paymentDate),
    amount: Number(p.amount),
    currency: String(p.currency ?? ""),
    payment_method: (p.paymentMethod as PaymentMethod) || "bank_transfer",
    reference_number: p.referenceNumber || undefined,
    notes: p.notes || undefined,
    receipt_pdf_path: p.receiptPdfPath || undefined,
    notification_channel: (p.notificationChannel as any) || undefined,
    notification_sent: p.notificationSent,
    created_by: p.createdById || undefined,
    created_at: toIso(p.createdAt),
    invoice: p.invoice
      ? {
          id: p.invoice.id,
          invoice_number: p.invoice.invoiceNumber,
          contact_id: p.invoice.clientId || p.invoice.deal?.contactId || "",
          deal_id: p.invoice.dealId || undefined,
          issue_date: toDateStr(p.invoice.issueDate),
          due_date: toDateStr(p.invoice.dueDate),
          subtotal: Number(p.invoice.subtotal),
          discount_type: (p.invoice.discountType as any) || "none",
          discount_value: Number(p.invoice.discountValue || 0),
          discount_amount: Number(p.invoice.discountAmount || 0),
          after_discount:
            Number(p.invoice.subtotal) - Number(p.invoice.discountAmount || 0),
          vat_enabled: p.invoice.vatEnabled,
          vat_percentage: Number(p.invoice.vatPercentage),
          vat_amount: Number(p.invoice.vatAmount),
          other_taxes: mapDocumentTaxLines(p.invoice.taxes),
          other_tax_amount: Number(p.invoice.otherTaxAmount ?? 0),
          total_amount: totalInvoice,
          amount_paid: totalPaidOnInvoice,
          amount_due: amountDue,
          currency: p.invoice.currency as SupportedCurrency,
          language: p.invoice.language as "en" | "ar",
          status: p.invoice.status as any,
          created_at: toIso(p.invoice.createdAt),
          updated_at: toIso(p.invoice.updatedAt),
          contact: contactObj
            ? {
                id: contactObj.id,
                full_name:
                  `${contactObj.firstName || ""} ${contactObj.lastName || ""}`.trim() ||
                  contactObj.companyName ||
                  "Client",
                email: contactObj.email || "",
                phone: contactObj.phone || undefined,
                company: contactObj.companyName || undefined,
                created_at: toIso(contactObj.createdAt),
                updated_at: toIso(contactObj.updatedAt),
              }
            : undefined,
        }
      : undefined,
  };
}

export async function getAllPayments(options?: {
  limit?: number;
  offset?: number;
  invoiceId?: string;
}): Promise<Payment[]> {
  try {
    const payments = await db.payment.findMany({
      where: options?.invoiceId ? { invoiceId: options.invoiceId } : undefined,
      take: options?.limit,
      skip: options?.offset,
      include: options?.invoiceId
        ? undefined
        : {
            invoice: {
              include: {
                client: true,
                payments: true,
                taxes: { orderBy: { displayOrder: "asc" } },
                deal: {
                  include: { contact: true },
                },
              },
            },
          },
      orderBy: { paymentDate: "desc" },
    });
    return payments.map(mapPayment);
  } catch (e) {
    console.error("Error fetching payments from DB:", e);
    throw e;
  }
}

export async function getPaymentById(id: string): Promise<Payment | null> {
  try {
    const { listPayments } = await import("@platform/api-client");
    const all = await listPayments().catch(() => []);
    const p = all.find((item: any) => (item.id || item.ID) === id);
    if (p) {
      return await mapApiPaymentToPayment(p);
    }
  } catch (e) {
    console.warn(`api-client getPaymentById ${id} failed:`, e);
  }

  try {
    const payment = await db.payment.findUnique({
      where: { id },
      include: {
        invoice: {
          include: {
            client: true,
            payments: true,
            taxes: { orderBy: { displayOrder: "asc" } },
            deal: {
              include: { contact: true },
            },
          },
        },
      },
    });
    if (!payment) return null;

    const attachments = await db.attachment.findMany({
      where: { entityType: "payment", entityId: payment.id },
      include: { uploadedBy: true },
      orderBy: { createdAt: "desc" },
    });

    const mapped = mapPayment(payment);
    mapped.proof_attachments = attachments.map((a: any) => ({
      id: a.id,
      file_name: a.fileName,
      file_url: a.fileUrl,
      file_size: a.fileSize || undefined,
      mime_type: a.mimeType || undefined,
      entity_type: a.entityType,
      entity_id: a.entityId,
      uploaded_by: a.uploadedBy?.fullName || a.uploadedBy?.email || undefined,
      created_at: a.createdAt.toISOString(),
    }));

    return mapped;
  } catch (e) {
    console.error(`Error fetching payment ${id}:`, e);
    throw e;
  }
}

export async function getPaymentByIdOrNumber(
  idOrNumber: string,
): Promise<Payment | null> {
  try {
    const { listPayments } = await import("@platform/api-client");
    const all = await listPayments().catch(() => []);
    const p = all.find(
      (item: any) =>
        (item.id || item.ID) === idOrNumber ||
        (item.paymentNumber || item.PaymentNumber || item.receiptNumber) === idOrNumber,
    );
    if (p) {
      return await mapApiPaymentToPayment(p);
    }
  } catch (e) {
    console.warn(`api-client getPaymentByIdOrNumber ${idOrNumber} failed:`, e);
  }

  try {
    const payment = await db.payment.findFirst({
      where: {
        OR: [{ id: idOrNumber }, { receiptNumber: idOrNumber }],
      },
      include: {
        invoice: {
          include: {
            client: true,
            payments: true,
            taxes: { orderBy: { displayOrder: "asc" } },
            deal: {
              include: { contact: true },
            },
          },
        },
      },
    });
    if (!payment) return null;

    const attachments = await db.attachment.findMany({
      where: { entityType: "payment", entityId: payment.id },
      include: { uploadedBy: true },
      orderBy: { createdAt: "desc" },
    });

    const mapped = mapPayment(payment);
    mapped.proof_attachments = attachments.map((a: any) => ({
      id: a.id,
      file_name: a.fileName,
      file_url: a.fileUrl,
      file_size: a.fileSize || undefined,
      mime_type: a.mimeType || undefined,
      entity_type: a.entityType,
      entity_id: a.entityId,
      uploaded_by: a.uploadedBy?.fullName || a.uploadedBy?.email || undefined,
      created_at: a.createdAt.toISOString(),
    }));

    return mapped;
  } catch (e) {
    console.error(`Error fetching payment ${idOrNumber}:`, e);
    throw e;
  }
}

async function mapApiPaymentToPayment(p: any): Promise<Payment> {
  let invoiceObj: any = undefined;
  const invoiceId = p.invoiceId || p.InvoiceID;
  if (invoiceId) {
    try {
      const { getInvoiceById } = await import("./invoices");
      invoiceObj = await getInvoiceById(invoiceId).catch(() => null);
    } catch {
    }
  }

  const receiptNumber =
    p.paymentNumber || p.PaymentNumber || p.receiptNumber || p.id || p.ID;

  return {
    id: p.id || p.ID,
    invoice_id: invoiceId || "",
    receipt_number: receiptNumber,
    payment_date: (p.paymentDate || p.PaymentDate || new Date().toISOString()).slice(0, 10),
    amount: Number(p.amount || p.Amount || 0),
    currency: (p.currency || p.Currency || "BHD") as any,
    payment_method: (p.paymentMethod || p.PaymentMethod || "bank_transfer") as any,
    reference_number: p.reference || p.Reference || undefined,
    notes: p.notes || p.Notes || undefined,
    notification_sent: false,
    created_at: p.createdAt || p.CreatedAt || new Date().toISOString(),
    invoice: invoiceObj || undefined,
    proof_attachments: [],
  };
}

export async function createPayment(paymentData: {
  invoice_id: string;
  payment_date?: string;
  amount: number;
  currency?: SupportedCurrency;
  payment_method?: PaymentMethod;
  reference_number?: string;
  notes?: string;
  receipt_pdf_path?: string;
  notification_channel?: any;
  notification_sent?: boolean;
  created_by?: string;
  proof_attachments?: Array<{
    fileName: string;
    fileUrl: string;
    fileSize?: number;
    mimeType?: string;
  }>;
}): Promise<Payment> {
  if (!Number.isFinite(paymentData.amount) || paymentData.amount <= 0)
    throw new Error(serverMessages.paymentAmountMustBePositive);
  if (
    paymentData.payment_method &&
    !["bank_transfer", "cash", "cheque", "card", "online"].includes(
      paymentData.payment_method,
    )
  )
    throw new Error(serverMessages.invalidPaymentMethod);
  const { getInvoice, recordPayment } = await import("../api/finance");
  const payable = await getInvoice(paymentData.invoice_id);
  if (
    !payable ||
    !(PAYABLE_INVOICE_STATUSES as readonly string[]).includes(payable.status)
  ) {
    throw new Error(
      payable?.status === "draft"
        ? "Mark the invoice as sent before recording payments"
        : "Invoice is not payable",
    );
  }
  await assertCompanyCurrency(payable.currency);
  if (!validMoneyAmount(paymentData.amount, payable.currency)) {
    throw new Error(serverMessages.paymentCurrencyPrecisionInvalid);
  }
  if (paymentData.currency && paymentData.currency !== payable.currency) {
    throw new Error(serverMessages.paymentCurrencyMustMatchInvoice);
  }
  const balanceDue = Number(payable.balanceDue ?? payable.total ?? 0);
  if (
    toMinorUnits(paymentData.amount, payable.currency) >
    toMinorUnits(balanceDue + 0.0001, payable.currency)
  ) {
    throw new Error(serverMessages.paymentExceedsOutstandingBalance);
  }

  const paymentDate = paymentData.payment_date
    ? new Date(paymentData.payment_date)
    : new Date();
  const paymentNumber = await allocateDocumentNumber("receipt", paymentDate);
  const roundedAmount = roundMoney(paymentData.amount, payable.currency);

  const created = await recordPayment({
    paymentNumber,
    invoiceId: paymentData.invoice_id,
    contactId: payable.contactId || null,
    amount: String(roundedAmount),
    currency: payable.currency,
    paymentMethod: paymentData.payment_method || "bank_transfer",
    paymentDate: paymentDate.toISOString(),
    reference: paymentData.reference_number || null,
    notes: paymentData.notes || null,
    allocations: [
      {
        invoiceId: paymentData.invoice_id,
        allocatedAmount: String(roundedAmount),
        currency: payable.currency,
      },
    ],
  });

  return mapApiPaymentToPayment(created);
}

export async function deletePayment(id: string): Promise<boolean> {
  const { deletePayment: deleteApiPayment } = await import("../api/finance");
  await deleteApiPayment(id);
  return true;
}

async function reconcileInvoicePaymentStatus(
  tx: Pick<typeof db, "invoice" | "crmDeal" | "dealPipelineStage">,
  invoiceId: string,
): Promise<void> {
  const invoice = await tx.invoice.findUnique({
    where: { id: invoiceId },
    include: { payments: true },
  });
  if (!invoice || invoice.status === "void" || invoice.status === "draft")
    return;
  const paid = sumMoney(
    invoice.payments.map((p) => p.amount),
    invoice.currency,
  );
  const next =
    paymentStatusFor(Number(invoice.totalAmount), paid, invoice.currency) ??
    (invoice.dueDate < new Date() ? "overdue" : "sent");
  if (next !== invoice.status)
    await tx.invoice.update({
      where: { id: invoiceId },
      data: { status: next },
    });
  if (next === "paid")
    await advanceDealForEvent(tx, invoice.dealId, "invoice_paid");
}

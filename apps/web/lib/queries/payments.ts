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
import { db } from "../atomic";
import { Payment, SupportedCurrency, PaymentMethod } from "../types";

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
    payment_date: p.paymentDate.toISOString().split("T")[0],
    amount: Number(p.amount),
    currency: String(p.currency ?? ""),
    payment_method: (p.paymentMethod as PaymentMethod) || "bank_transfer",
    reference_number: p.referenceNumber || undefined,
    notes: p.notes || undefined,
    receipt_pdf_path: p.receiptPdfPath || undefined,
    notification_channel: (p.notificationChannel as any) || undefined,
    notification_sent: p.notificationSent,
    created_by: p.createdById || undefined,
    created_at: p.createdAt.toISOString(),
    invoice: p.invoice
      ? {
          id: p.invoice.id,
          invoice_number: p.invoice.invoiceNumber,
          contact_id: p.invoice.clientId || p.invoice.deal?.contactId || "",
          deal_id: p.invoice.dealId || undefined,
          issue_date: p.invoice.issueDate.toISOString().split("T")[0],
          due_date: p.invoice.dueDate.toISOString().split("T")[0],
          subtotal: Number(p.invoice.subtotal),
          discount_type: (p.invoice.discountType as any) || "none",
          discount_value: Number(p.invoice.discountValue || 0),
          discount_amount: Number(p.invoice.discountAmount || 0),
          after_discount:
            Number(p.invoice.subtotal) - Number(p.invoice.discountAmount || 0),
          vat_enabled: p.invoice.vatEnabled,
          vat_percentage: Number(p.invoice.vatPercentage || 0),
          vat_amount: Number(p.invoice.vatAmount || 0),
          total_amount: totalInvoice,
          currency: String(p.invoice.currency ?? ""),
          language: (p.invoice.language as any) || "en",
          status: p.invoice.status,
          amount_paid: totalPaidOnInvoice,
          amount_due: amountDue,
          created_at: p.invoice.createdAt?.toISOString?.() ?? new Date().toISOString(),
          updated_at: p.invoice.updatedAt?.toISOString?.() ?? new Date().toISOString(),
          contact: contactObj
            ? ({
                id: contactObj.id,
                full_name: contactObj.fullName || contactObj.name || "",
                company: contactObj.companyName || undefined,
              } as any)
            : undefined,
        }
      : undefined,
  };
}

export async function getPaymentById(id: string): Promise<Payment | null> {
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
  const createdId = await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Invoice" WHERE id = ${paymentData.invoice_id} FOR UPDATE`;
    const payable = await tx.invoice.findUnique({
      where: { id: paymentData.invoice_id },
      include: { payments: true },
    });
    if (
      !payable ||
      !(PAYABLE_INVOICE_STATUSES as readonly string[]).includes(payable.status as any)
    )
      throw new Error(
        payable?.status === "draft"
          ? "Mark the invoice as sent before recording payments"
          : "Invoice is not payable",
      );
    await assertCompanyCurrency(payable.currency, tx);
    if (!validMoneyAmount(paymentData.amount, payable.currency))
      throw new Error(serverMessages.paymentCurrencyPrecisionInvalid);
    if (paymentData.currency && paymentData.currency !== payable.currency)
      throw new Error(serverMessages.paymentCurrencyMustMatchInvoice);
    const paid = sumMoney(
      payable.payments.map((p) => p.amount),
      payable.currency,
    );
    if (
      toMinorUnits(paid + paymentData.amount, payable.currency) >
      toMinorUnits(Number(payable.totalAmount), payable.currency)
    )
      throw new Error(serverMessages.paymentExceedsOutstandingBalance);
    const paymentDate = paymentData.payment_date
      ? new Date(paymentData.payment_date)
      : new Date();
    const receiptNumber = await allocateDocumentNumber(
      "receipt",
      paymentDate,
      tx,
    );

    const payment = await tx.payment.create({
      data: {
        invoiceId: paymentData.invoice_id,
        receiptNumber,
        paymentDate,
        amount: roundMoney(paymentData.amount, payable.currency),
        currency: payable.currency,
        paymentMethod: paymentData.payment_method || "bank_transfer",
        referenceNumber: paymentData.reference_number || null,
        notes: paymentData.notes || null,
        notificationSent: paymentData.notification_sent || false,
        notificationChannel: paymentData.notification_channel || null,
        createdById: paymentData.created_by || null,
      },
    });

    if (
      paymentData.proof_attachments &&
      paymentData.proof_attachments.length > 0
    ) {
      for (const att of paymentData.proof_attachments) {
        const upload = await claimUploadOrLink(
          att.fileUrl,
          paymentData.created_by,
        );
        await tx.attachment.create({
          data: {
            fileName: att.fileName,
            fileUrl: att.fileUrl,
            fileSize: upload.fileSize,
            mimeType: upload.mimeType,
            entityType: "payment",
            entityId: payment.id,
            uploadedById: paymentData.created_by || null,
          },
        });
      }
    }

    await reconcileInvoicePaymentStatus(tx, paymentData.invoice_id);

    return payment.id;
  });

  const result = await getPaymentById(createdId);
  if (!result) {
    throw new Error(serverMessages.failedToRetrieveCreatedPaymentRecord);
  }
  return result;
}

async function reconcileInvoicePaymentStatus(
  tx: any,
  invoiceId: string,
): Promise<void> {
  const invoice = await tx.invoice.findUnique({
    where: { id: invoiceId },
    include: { payments: true },
  });
  if (!invoice || invoice.status === "void" || invoice.status === "draft")
    return;
  const paid = sumMoney(
    invoice.payments.map((p: any) => p.amount),
    invoice.currency,
  );
  const next =
    paymentStatusFor(Number(invoice.totalAmount), paid, invoice.currency) ??
    (invoice.dueDate < new Date() ? "overdue" : "sent");
  if (next !== invoice.status) {
    await tx.invoice.update({
      where: { id: invoiceId },
      data: { status: next },
    });
  }
}

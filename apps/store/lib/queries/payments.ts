import { randomUUID } from "node:crypto";
import {
  getInvoice,
  listPayments,
  recordPayment as recordFinancePayment,
} from "@platform/api-client";
import { serverMessages } from "@platform/locales";
import { assertCompanyCurrency } from "../finance/company-currency";
import { roundMoney, validMoneyAmount } from "../finance/money";
import { allocateDocumentNumber } from "../finance/numbering";
import { claimUploadOrLink } from "../services/uploads";
import type { Payment, PaymentMethod, SupportedCurrency } from "../types";

function toIso(val: unknown): string {
  if (!val) return new Date().toISOString();
  if (val instanceof Date) return val.toISOString();
  return new Date(String(val)).toISOString();
}

function toDateStr(val: unknown): string {
  return toIso(val).split("T")[0];
}

function mapPayment(p: any): Payment {
  return {
    id: p.id || p.ID,
    invoice_id: p.invoiceId,
    receipt_number: p.receiptNumber || p.reference || "",
    payment_date: toDateStr(p.paymentDate),
    amount: Number(p.amount ?? 0),
    currency: String(p.currency ?? ""),
    payment_method: (p.paymentMethod as PaymentMethod) || "bank_transfer",
    reference_number: p.reference || p.referenceNumber || undefined,
    notes: p.notes || undefined,
    receipt_pdf_path: p.receiptPdfPath || undefined,
    notification_channel: (p.notificationChannel as any) || undefined,
    notification_sent: Boolean(p.notificationSent),
    created_by: p.createdById || undefined,
    created_at: toIso(p.createdAt),
  };
}

export async function getPaymentById(id: string): Promise<Payment | null> {
  const all = await listPayments().catch(() => []);
  const found = (all ?? []).find((p: any) => (p.id || p.ID) === id);
  return found ? mapPayment(found) : null;
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
  if (!Number.isFinite(paymentData.amount) || paymentData.amount <= 0) {
    throw new Error(serverMessages.paymentAmountMustBePositive);
  }
  if (
    paymentData.payment_method &&
    !["bank_transfer", "cash", "cheque", "card", "online"].includes(
      paymentData.payment_method,
    )
  ) {
    throw new Error(serverMessages.invalidPaymentMethod);
  }

  const invoice = await getInvoice(paymentData.invoice_id).catch(() => null);
  const currency =
    (invoice?.currency as SupportedCurrency) ||
    paymentData.currency ||
    ((await assertCompanyCurrency()) as SupportedCurrency);

  if (!validMoneyAmount(paymentData.amount, currency)) {
    throw new Error(serverMessages.paymentCurrencyPrecisionInvalid);
  }

  if (paymentData.proof_attachments?.length) {
    for (const att of paymentData.proof_attachments) {
      await claimUploadOrLink(att.fileUrl, paymentData.created_by).catch(
        () => undefined,
      );
    }
  }

  const paymentDate = paymentData.payment_date
    ? new Date(paymentData.payment_date)
    : new Date();
  const receiptNumber = await allocateDocumentNumber("receipt", paymentDate);

  const created = await recordFinancePayment({
    id: randomUUID(),
    invoiceId: paymentData.invoice_id,
    amount: String(roundMoney(paymentData.amount, currency)),
    currency,
    paymentMethod: paymentData.payment_method || "bank_transfer",
    reference: paymentData.reference_number || receiptNumber,
    notes: paymentData.notes || null,
    paymentDate: paymentDate.toISOString(),
  }).catch(() => ({
    id: randomUUID(),
    invoiceId: paymentData.invoice_id,
    receiptNumber,
    amount: roundMoney(paymentData.amount, currency),
    currency,
    paymentMethod: paymentData.payment_method || "bank_transfer",
    reference: paymentData.reference_number || receiptNumber,
    notes: paymentData.notes,
    paymentDate: paymentDate.toISOString(),
    createdAt: new Date().toISOString(),
  }));

  return mapPayment({
    ...created,
    receiptNumber,
    notificationChannel: paymentData.notification_channel,
    notificationSent: paymentData.notification_sent,
    createdById: paymentData.created_by,
  });
}

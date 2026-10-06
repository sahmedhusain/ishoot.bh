import * as React from "react";
import sharp from "sharp";
import { renderToBuffer } from "@react-pdf/renderer";
import { InvoicePdfDocument } from "./invoice-pdf";
import { ReceiptPdfDocument } from "./receipt-pdf";
import type { Invoice, Payment, CompanySettings, Quotation } from "@ishoot/database/types";
import { db, getClientAcceptance, mapContact, type ClientSignableType } from "@ishoot/database";
import { getSigningState, type SignableDocument } from "@ishoot/database/queries/document-signing";
import { resolveConfiguredPdfAsset } from "./configured-asset";
import { resolvePdfBrand, type ClientAcceptance, type CompanySignature } from "./kit";

/** Company signature for a signed document; null until it is approved and signed. Names follow the document language. */
async function pdfSigning(type: SignableDocument, id: string, language: string | null | undefined): Promise<CompanySignature | null> {
  const state = await getSigningState(type, id);
  if (!state.signed || !state.signedAt) return null;
  const employee = state.signedBy?.id
    ? (await db.user.findUnique({ where: { id: state.signedBy.id }, select: { employee: { select: { firstNameEn: true, lastNameEn: true, firstNameAr: true, lastNameAr: true, jobTitleEn: true, jobTitleAr: true } } } }))?.employee
    : null;
  const isAr = language === "ar";
  return {
    signatureSrc: state.signatureUrl ? ((await resolveConfiguredPdfAsset(state.signatureUrl)) ?? null) : null,
    signerName: employee ? (isAr ? `${employee.firstNameAr} ${employee.lastNameAr}` : `${employee.firstNameEn} ${employee.lastNameEn}`) : state.signedBy?.name ?? "",
    signerTitle: employee ? (isAr ? employee.jobTitleAr : employee.jobTitleEn) : null,
    signedAt: state.signedAt,
  };
}

/** The client's acceptance (signed online or a signed copy on file). */
async function pdfAcceptance(type: ClientSignableType, id: string): Promise<ClientAcceptance | null> {
  const acceptance = await getClientAcceptance(type, id);
  if (!acceptance) return null;
  const png = acceptance.signatureData?.match(/^data:image\/png;base64,(.+)$/)?.[1];
  return {
    signerName: acceptance.signerName,
    signerTitle: acceptance.signerTitle,
    signedAt: acceptance.signedAt,
    method: acceptance.method,
    // The drawing pad leaves blank space around the strokes; trim it so the signature fills its line.
    signatureSrc: png ? await sharp(Buffer.from(png, "base64")).trim().png().toBuffer().catch(() => Buffer.from(png, "base64")) : null,
  };
}

export async function generateInvoicePdfBuffer(invoice: Invoice, company: CompanySettings): Promise<Buffer> {
  const [brand, signing, acceptance] = await Promise.all([resolvePdfBrand(company), pdfSigning("invoice", invoice.id, invoice.language), pdfAcceptance("invoice", invoice.id)]);
  const element = React.createElement(InvoicePdfDocument, { invoice, brand, signing, acceptance });
  return (await renderToBuffer(element as never)) as Buffer;
}

export async function generateReceiptPdfBuffer(payment: Payment, company: CompanySettings): Promise<Buffer> {
  const [brand, signing] = await Promise.all([resolvePdfBrand(company), pdfSigning("receipt", payment.id, payment.invoice?.language)]);
  const element = React.createElement(ReceiptPdfDocument, { payment, brand, signing });
  return (await renderToBuffer(element as never)) as Buffer;
}

/** Quotations print through the invoice layout so the downloaded, printed and emailed PDF are one file. */
export async function generateQuotationPdfBuffer(quotation: Quotation, company: CompanySettings): Promise<Buffer> {
  const client = quotation.client as { firstName?: string; lastName?: string | null; companyName?: string | null; email?: string | null; phone?: string | null; vatNumber?: string | null } | null | undefined;
  const fullName = [client?.firstName, client?.lastName].filter(Boolean).join(" ");
  const asInvoice = {
    id: quotation.id,
    invoice_number: quotation.quotationNumber,
    language: quotation.language,
    currency: quotation.currency,
    issue_date: quotation.issueDate,
    due_date: quotation.validUntilDate,
    status: quotation.status,
    subtotal: quotation.subtotal,
    discount_amount: quotation.discountAmount,
    vat_enabled: quotation.vatEnabled,
    vat_percentage: quotation.vatPercentage,
    vat_amount: quotation.vatAmount,
    total_amount: quotation.totalAmount,
    amount_paid: 0,
    amount_due: quotation.totalAmount,
    contact_name: fullName || client?.companyName || "",
    contact: client ? { ...mapContact(client), full_name: fullName, company: client.companyName ?? "" } : undefined,
    line_items: (quotation.lineItems ?? []).map((li) => ({
      id: li.id,
      description_en: li.descriptionEn,
      description_ar: li.descriptionAr ?? undefined,
      quantity: li.quantity,
      unit_price: li.unitPrice,
      line_total: li.lineTotal,
    })),
  } as unknown as Invoice;
  const terms = quotation.language === "ar" ? quotation.termsAr || quotation.termsEn : quotation.termsEn || quotation.termsAr;
  const [brand, signing, acceptance] = await Promise.all([resolvePdfBrand(company), pdfSigning("quotation", quotation.id, quotation.language), pdfAcceptance("quotation", quotation.id)]);
  const element = React.createElement(InvoicePdfDocument, { invoice: asInvoice, brand, variant: "quotation", quotationTerms: terms, signing, acceptance });
  return (await renderToBuffer(element as never)) as Buffer;
}

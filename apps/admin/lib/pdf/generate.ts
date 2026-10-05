import * as React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { InvoicePdfDocument } from "./invoice-pdf";
import { ReceiptPdfDocument } from "./receipt-pdf";
import type { Invoice,Payment,CompanySettings,Quotation } from "@ishoot/database/types";

import { resolveConfiguredPdfAsset } from "./configured-asset";

async function enrichCompanyWithResolvedAssets(company: CompanySettings): Promise<CompanySettings> {
  const enriched = { ...company };
  if (enriched.logo_url) enriched.logo_url = await resolveConfiguredPdfAsset(enriched.logo_url) as string || "";
  if (enriched.dark_logo_url) enriched.dark_logo_url = await resolveConfiguredPdfAsset(enriched.dark_logo_url) as string || "";
  if (enriched.icon_url) enriched.icon_url = await resolveConfiguredPdfAsset(enriched.icon_url) as string || "";
  if (enriched.dark_icon_url) enriched.dark_icon_url = await resolveConfiguredPdfAsset(enriched.dark_icon_url) as string || "";
  if (enriched.stamp_url) enriched.stamp_url = await resolveConfiguredPdfAsset(enriched.stamp_url) as string || "";
  if (enriched.signature_url) enriched.signature_url = await resolveConfiguredPdfAsset(enriched.signature_url) as string || "";
  return enriched;
}

export async function generateInvoicePdfBuffer(invoice: Invoice, company: CompanySettings): Promise<Buffer> {
  const enrichedCompany = await enrichCompanyWithResolvedAssets(company);
  const element = React.createElement(InvoicePdfDocument, { invoice, company: enrichedCompany });
  return (await renderToBuffer(element as any)) as Buffer;
}

export async function generateReceiptPdfBuffer(payment: Payment, company: CompanySettings): Promise<Buffer> {
  const enrichedCompany = await enrichCompanyWithResolvedAssets(company);
  const element = React.createElement(ReceiptPdfDocument, { payment, company: enrichedCompany });
  return (await renderToBuffer(element as any)) as Buffer;
}

/** Quotations print through the invoice layout so the downloaded, printed and emailed PDF are one file. */
export async function generateQuotationPdfBuffer(quotation: Quotation, company: CompanySettings): Promise<Buffer> {
  const enrichedCompany = await enrichCompanyWithResolvedAssets(company);
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
    contact: client
      ? { full_name: fullName, company: client.companyName ?? "", email: client.email ?? "", phone: client.phone ?? "", vat_number: client.vatNumber ?? "" }
      : undefined,
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
  const element = React.createElement(InvoicePdfDocument, { invoice: asInvoice, company: enrichedCompany, variant: "quotation", quotationTerms: terms });
  return (await renderToBuffer(element as any)) as Buffer;
}

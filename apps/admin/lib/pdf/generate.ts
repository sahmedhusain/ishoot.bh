import * as React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { InvoicePdfDocument } from "./invoice-pdf";
import { ReceiptPdfDocument } from "./receipt-pdf";
import type { Invoice, Payment, CompanySettings, Quotation, QuotationLineItem } from "@ishoot/database/types";

import { resolveConfiguredPdfAsset } from "./configured-asset";

async function enrichCompanyWithResolvedAssets(company: CompanySettings): Promise<CompanySettings> {
  const enriched = { ...company };
  if (enriched.logo_url) enriched.logo_url = await resolveConfiguredPdfAsset(enriched.logo_url) as string || enriched.logo_url;
  if (enriched.dark_logo_url) enriched.dark_logo_url = await resolveConfiguredPdfAsset(enriched.dark_logo_url) as string || enriched.dark_logo_url;
  if (enriched.icon_url) enriched.icon_url = await resolveConfiguredPdfAsset(enriched.icon_url) as string || enriched.icon_url;
  if (enriched.dark_icon_url) enriched.dark_icon_url = await resolveConfiguredPdfAsset(enriched.dark_icon_url) as string || enriched.dark_icon_url;
  if (enriched.stamp_url) enriched.stamp_url = await resolveConfiguredPdfAsset(enriched.stamp_url) as string || enriched.stamp_url;
  if (enriched.signature_url) enriched.signature_url = await resolveConfiguredPdfAsset(enriched.signature_url) as string || enriched.signature_url;
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

import { QuotationPdf } from "./quotation-pdf";

export async function generateQuotationPdfBuffer(quotation: Quotation & { lineItems: QuotationLineItem[] }, company: CompanySettings): Promise<Buffer> {
  const comp = React.createElement(QuotationPdf, { quotation, companySettings: company });
  return await renderToBuffer(comp);
}

import { formatMessage, getTranslations } from "@platform/locales";
import * as React from "react";
import sharp from "sharp";
import { renderToBuffer } from "@react-pdf/renderer";
import { InvoicePdfDocument } from "./invoice-pdf";
import { ReceiptPdfDocument } from "./receipt-pdf";
import type {
  Invoice,
  Payment,
  CompanySettings,
  Quotation,
} from "@platform/database/types";
import QRCode from "qrcode";
import {
  db,
  getClientAcceptance,
  getTaxCertificate,
  mapContact,
  type ClientSignableType,
} from "@platform/database";
import type { DocumentTaxLine } from "@platform/database/types";

import { publicOrigin } from "../public-origin";
import {
  getSigningState,
  type SignableDocument,
} from "@platform/database/queries/document-signing";
import { resolveConfiguredPdfAsset } from "./configured-asset";
import {
  resolvePdfBrand,
  type ClientAcceptance,
  type CompanySignature,
  type TaxCertificateMark,
} from "./kit";

async function pdfTaxCertificates(
  doc: {
    vat_enabled?: boolean;
    vat_amount?: number | string;
    other_taxes?: DocumentTaxLine[];
  },
  language: string | null | undefined,
): Promise<TaxCertificateMark[]> {
  const lang = language === "en" ? "en" : "ar";
  const c = getTranslations(lang).admin.taxCertificate;
  const origin = await publicOrigin();
  const qr = (code: string) =>
    QRCode.toBuffer(`${origin}/certificates/${code}?lang=${lang}`, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 280,
      color: { dark: "#111827", light: "#FFFFFF" },
    });
  const marks: TaxCertificateMark[] = [];
  if (doc.vat_enabled && Number(doc.vat_amount) > 0) {
    const vat = await getTaxCertificate("vat");
    if (vat)
      marks.push({
        qr: vat.certificateUrl ? await qr("vat") : undefined,
        title: c.vatCertificate,
        registration: vat.registrationNumber
          ? formatMessage(c.registrationLine, {
              number: vat.registrationNumber,
            })
          : null,
      });
  }
  for (const tax of doc.other_taxes ?? []) {
    const certificate = await getTaxCertificate(tax.code);
    const name = lang === "ar" ? tax.name_ar : tax.name_en;
    marks.push({
      qr: certificate?.certificateUrl ? await qr(tax.code) : undefined,
      title: formatMessage(c.certificateOf, { tax: name }),
      registration: tax.registration_number
        ? formatMessage(c.registrationLine, { number: tax.registration_number })
        : null,
    });
  }
  return marks;
}

async function pdfSigning(
  type: SignableDocument,
  id: string,
  language: string | null | undefined,
): Promise<CompanySignature | null> {
  const state = await getSigningState(type, id);
  if (!state.signed || !state.signedAt) return null;
  const employee = state.signedBy?.id
    ? (
        await db.user.findUnique({
          where: { id: state.signedBy.id },
          select: {
            employee: {
              select: {
                firstNameEn: true,
                lastNameEn: true,
                firstNameAr: true,
                lastNameAr: true,
                jobTitleEn: true,
                jobTitleAr: true,
              },
            },
          },
        })
      )?.employee
    : null;
  const isAr = language === "ar";
  return {
    signatureSrc: state.signatureUrl
      ? ((await resolveConfiguredPdfAsset(state.signatureUrl)) ?? null)
      : null,
    signerName: employee
      ? isAr
        ? `${employee.firstNameAr} ${employee.lastNameAr}`
        : `${employee.firstNameEn} ${employee.lastNameEn}`
      : (state.signedBy?.name ?? ""),
    signerTitle: employee
      ? isAr
        ? employee.jobTitleAr
        : employee.jobTitleEn
      : null,
    signedAt: state.signedAt,
  };
}

async function pdfAcceptance(
  type: ClientSignableType,
  id: string,
): Promise<ClientAcceptance | null> {
  const acceptance = await getClientAcceptance(type, id);
  if (!acceptance) return null;
  const png = acceptance.signatureData?.match(
    /^data:image\/png;base64,(.+)$/,
  )?.[1];
  return {
    signerName: acceptance.signerName,
    signerTitle: acceptance.signerTitle,
    signedAt: acceptance.signedAt,
    method: acceptance.method,
    signatureSrc: png
      ? await sharp(Buffer.from(png, "base64"))
          .trim()
          .png()
          .toBuffer()
          .catch(() => Buffer.from(png, "base64"))
      : null,
  };
}

export async function generateInvoicePdfBuffer(
  invoice: Invoice,
  company: CompanySettings,
): Promise<Buffer> {
  const [brand, signing, acceptance, certificates] = await Promise.all([
    resolvePdfBrand(company),
    pdfSigning("invoice", invoice.id, invoice.language),
    pdfAcceptance("invoice", invoice.id),
    pdfTaxCertificates(invoice, invoice.language),
  ]);
  const element = React.createElement(InvoicePdfDocument, {
    invoice,
    brand,
    signing,
    acceptance,
    certificates,
  });
  return (await renderToBuffer(element as never)) as Buffer;
}

export async function generateReceiptPdfBuffer(
  payment: Payment,
  company: CompanySettings,
): Promise<Buffer> {
  const [brand, signing, certificates] = await Promise.all([
    resolvePdfBrand(company),
    pdfSigning("receipt", payment.id, payment.invoice?.language),
    payment.invoice
      ? pdfTaxCertificates(payment.invoice, payment.invoice.language)
      : [],
  ]);
  const element = React.createElement(ReceiptPdfDocument, {
    payment,
    brand,
    signing,
    certificates,
  });
  return (await renderToBuffer(element as never)) as Buffer;
}

export async function generateQuotationPdfBuffer(
  quotation: Quotation,
  company: CompanySettings,
): Promise<Buffer> {
  const client = quotation.client as
    | {
        firstName?: string;
        lastName?: string | null;
        companyName?: string | null;
        email?: string | null;
        phone?: string | null;
        vatNumber?: string | null;
      }
    | null
    | undefined;
  const fullName = [client?.firstName, client?.lastName]
    .filter(Boolean)
    .join(" ");
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
    other_taxes: quotation.taxes ?? [],
    other_tax_amount: quotation.otherTaxAmount ?? 0,
    total_amount: quotation.totalAmount,
    amount_paid: 0,
    amount_due: quotation.totalAmount,
    contact_name: fullName || client?.companyName || "",
    contact: client
      ? {
          ...mapContact(client),
          full_name: fullName,
          company: client.companyName ?? "",
        }
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
  const terms =
    quotation.language === "ar"
      ? quotation.termsAr || quotation.termsEn
      : quotation.termsEn || quotation.termsAr;
  const [brand, signing, acceptance, certificates] = await Promise.all([
    resolvePdfBrand(company),
    pdfSigning("quotation", quotation.id, quotation.language),
    pdfAcceptance("quotation", quotation.id),
    pdfTaxCertificates(asInvoice, quotation.language),
  ]);
  const element = React.createElement(InvoicePdfDocument, {
    invoice: asInvoice,
    brand,
    variant: "quotation",
    quotationTerms: terms,
    signing,
    acceptance,
    certificates,
  });
  return (await renderToBuffer(element as never)) as Buffer;
}

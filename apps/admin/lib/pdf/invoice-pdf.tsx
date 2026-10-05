import { getCurrencySymbol, getCurrencyDecimals } from "@ishoot/config/currency";

import { Document,Page,Text,View } from "@react-pdf/renderer";
import type { Invoice,CompanySettings } from "@ishoot/database/types";
import { pdfStyles } from "./shared-styles";
import { PdfSigningBlock, type PdfSigning } from "./signing-block";
import { PdfBrandLogo } from "./brand-logo-pdf";
import { adminTranslations } from "../translations-bilingual";

interface InvoicePDFProps {
  invoice: Invoice;
  company: CompanySettings;
  /** A quotation renders through the same layout so print, download and email stay identical. */
  variant?: "invoice" | "quotation";
  /** Quotation terms in the document language. */
  quotationTerms?: string | null;
  /** Present only once the document is approved and signed. */
  signing?: PdfSigning | null;
}

function formatDate(dateStr: string) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatAmount(amount: number, decimals: number = 3) {
  return Number(amount || 0).toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function InvoicePDF({ invoice, company, variant = "invoice", quotationTerms, signing }: InvoicePDFProps) {
  const isQuote = variant === "quotation";
  // VAT on an invoice is immutable: depends strictly on the invoice's own issued snapshot
  const isVatActive = Boolean(
    invoice.vat_enabled && Number(invoice.vat_amount) > 0,
  );
  const currencyCode = invoice.currency || company.default_currency;
  const currency = getCurrencySymbol(currencyCode, false);
  const decimals = getCurrencyDecimals(currencyCode);
  const lineItems = invoice.line_items || [];
  const isAr = invoice.language === "ar";
  const t = adminTranslations[isAr ? "ar" : "en"].pdfInvoice;

  const clientName =
    invoice.contact?.full_name ?? invoice.contact_name ?? t.defaultClient;
  const clientCompany = invoice.contact?.company || "";
  const clientEmail = invoice.contact?.email || "";
  const clientPhone = invoice.contact?.phone || "";
  const clientAddress = invoice.contact?.address || "";
  const clientVat = isVatActive ? invoice.contact?.vat_number || "" : "";

  const compNameEn = company.company_name_en;
  const compNameAr = company.company_name_ar;
  const companyDisplayName = isAr ? compNameAr : compNameEn;

  const labels = {
    title: isQuote ? t.quotationTitle : isVatActive ? t.taxInvoiceTitle : t.standardInvoiceTitle,
    billedTo: t.clientDetails,
    invoiceDetails: isQuote ? t.quotationDetails : t.invoiceDetails,
    issueDate: t.issueDate,
    dueDate: isQuote ? t.validUntil : t.dueDate,
    status: t.status,
    currencyLabel: t.currency,
    description: t.description,
    qty: t.qty,
    unitPrice: `${t.unitPrice} (${currency})`,
    total: `${t.total} (${currency})`,
    subtotal: t.subtotal,
    discount: t.discount,
    vat: `${t.vat} (${invoice.vat_percentage}%):`,
    totalFinal: isQuote ? t.quotationTotal : t.totalAmount,
    amountPaid: t.amountPaid,
    balanceDue: t.balanceDue,
    bankDetails: t.bankDetails,
    bankName: t.bankName,
    iban: t.iban,
    accountNo: t.accountNo,
    swift: t.swift,
    issuedBy: t.issuedBy,
    authorizedSignatory: t.authorizedSignatory,
    terms: t.termsNotice
      .replace("{days}", String(company.payment_terms_days))
      .replace("{date}", formatDate(invoice.due_date)),
    wireRef: t.wireRefNotice.replace("{invNum}", invoice.invoice_number),
    thankYou: t.thankYou.replace("{companyName}", companyDisplayName),
  };

  return (
    <Document title={`${isQuote ? "Quotation" : "Invoice"} ${invoice.invoice_number} - ${compNameEn}`}>
      <Page size="A4" style={pdfStyles.page}>
        {/* Official Header Banner */}
        <View style={pdfStyles.headerBanner}>
          <View>
            <PdfBrandLogo
              company={company}
              theme="dark"
              iconHeight={24}
              wordmarkHeight={16}
            />
            <Text style={pdfStyles.companySubtitle}>
              {isAr ? compNameAr : compNameEn}
            </Text>
            <Text style={pdfStyles.companyMeta}>
              {t.crPrefix} {company.cr_number}
              {isVatActive && company.vat_id
                ? ` • VAT ID: ${company.vat_id}`
                : ""}
              {` • ${t.country}`}
            </Text>
          </View>

          <View style={pdfStyles.docTitleBlock}>
            <Text style={pdfStyles.docMainTitle}>{labels.title}</Text>
            <Text style={pdfStyles.docNumber}>{invoice.invoice_number}</Text>
          </View>
        </View>

        {/* Client & Metadata Grid */}
        <View style={pdfStyles.metaGrid}>
          <View style={pdfStyles.metaCard}>
            <Text style={pdfStyles.metaLabel}>{labels.billedTo}</Text>
            <Text style={pdfStyles.metaValue}>
              {clientCompany || clientName}
            </Text>
            {clientCompany && clientName && clientCompany !== clientName ? (
              <Text style={pdfStyles.metaSub}>Attn: {clientName}</Text>
            ) : null}
            {clientEmail ? (
              <Text style={pdfStyles.metaSub}>{clientEmail}</Text>
            ) : null}
            {clientPhone ? (
              <Text style={pdfStyles.metaSub}>{clientPhone}</Text>
            ) : null}
            {clientAddress ? (
              <Text style={pdfStyles.metaSub}>{clientAddress}</Text>
            ) : null}
            {clientVat ? (
              <Text style={[pdfStyles.metaSub, { fontWeight: "bold" }]}>
                VAT: {clientVat}
              </Text>
            ) : null}
          </View>

          <View style={pdfStyles.metaCard}>
            <Text style={pdfStyles.metaLabel}>{labels.invoiceDetails}</Text>
            <Text style={pdfStyles.metaSub}>
              {labels.issueDate}: {formatDate(invoice.issue_date)}
            </Text>
            <Text style={pdfStyles.metaSub}>
              {labels.dueDate}: {formatDate(invoice.due_date)}
            </Text>
            {!isQuote && (
              <Text style={pdfStyles.metaSub}>
                {labels.status}:{" "}
                {(invoice.status || "draft").replace("_", " ").toUpperCase()}
              </Text>
            )}
            <Text style={pdfStyles.metaSub}>
              {labels.currencyLabel}: {currency}
            </Text>
          </View>
        </View>

        {/* Line Items Table */}
        <View style={pdfStyles.table}>
          <View style={pdfStyles.tableHeader}>
            <Text style={pdfStyles.colDesc}>{labels.description}</Text>
            <Text style={pdfStyles.colQty}>{labels.qty}</Text>
            <Text style={pdfStyles.colUnitPrice}>{labels.unitPrice}</Text>
            <Text style={pdfStyles.colTotal}>{labels.total}</Text>
          </View>

          {lineItems.map((item, index) => (
            <View
              key={item.id || index}
              style={[
                pdfStyles.tableRow,
                index % 2 === 1 ? pdfStyles.tableRowAlt : {},
              ]}
            >
              <View style={pdfStyles.colDesc}>
                <Text style={{ fontWeight: "bold" }}>
                  {isAr
                    ? item.description_ar || item.description_en
                    : item.description_en || item.description_ar}
                </Text>
              </View>
              <Text style={pdfStyles.colQty}>{item.quantity}</Text>
              <Text style={pdfStyles.colUnitPrice}>
                {formatAmount(item.unit_price, decimals)}
              </Text>
              <Text style={pdfStyles.colTotal}>
                {formatAmount(item.line_total, decimals)}
              </Text>
            </View>
          ))}
        </View>

        {/* Bank & Totals Block */}
        <View style={pdfStyles.totalsContainer}>
          <View style={pdfStyles.bankBlock}>
            <Text style={pdfStyles.metaLabel}>{labels.bankDetails}</Text>
            <Text style={pdfStyles.metaSub}>
              {labels.bankName} {company.bank_name}
            </Text>
            <Text style={pdfStyles.metaSub}>
              {labels.iban} {company.bank_iban}
            </Text>
            <Text style={pdfStyles.metaSub}>
              {labels.accountNo} {company.bank_account_number}
            </Text>
            <Text style={pdfStyles.metaSub}>
              {labels.swift} {company.bank_swift}
            </Text>

            {/* Terms and notes */}
            <View
              style={{
                marginTop: 8,
                paddingTop: 6,
                borderTopWidth: 1,
                borderTopColor: "#E5E7EB",
              }}
            >
              {isQuote ? (
                quotationTerms ? (
                  <Text style={{ fontSize: 7, color: "#4B5563", lineHeight: 1.4 }}>{quotationTerms}</Text>
                ) : null
              ) : (
                <>
                  <Text style={{ fontSize: 7, color: "#4B5563", lineHeight: 1.3 }}>
                    {labels.terms}
                  </Text>
                  <Text style={{ fontSize: 7, color: "#4B5563", lineHeight: 1.3 }}>
                    {labels.wireRef}
                  </Text>
                </>
              )}
              {invoice.notes_en ? (
                <Text
                  style={{
                    fontSize: 7,
                    color: "#111827",
                    marginTop: 2,
                    fontWeight: "bold",
                  }}
                >
                  Note: {invoice.notes_en}
                </Text>
              ) : null}
              {invoice.notes_ar ? (
                <Text style={{ fontSize: 7, color: "#111827", marginTop: 1 }}>
                  {invoice.notes_ar}
                </Text>
              ) : null}
            </View>
          </View>

          <View style={pdfStyles.totalsBlock}>
            <View style={pdfStyles.totalRow}>
              <Text>{labels.subtotal}</Text>
              <Text>
                {currency} {formatAmount(invoice.subtotal, decimals)}
              </Text>
            </View>

            {invoice.discount_amount > 0 && (
              <View style={pdfStyles.totalRow}>
                <Text>{labels.discount}</Text>
                <Text style={{ color: "#DC2626" }}>
                  - {currency} {formatAmount(invoice.discount_amount, decimals)}
                </Text>
              </View>
            )}

            {isVatActive && (
              <View style={pdfStyles.totalRow}>
                <Text>{labels.vat}</Text>
                <Text>
                  {currency} {formatAmount(invoice.vat_amount, decimals)}
                </Text>
              </View>
            )}

            <View style={pdfStyles.totalRowFinal}>
              <Text>{labels.totalFinal}</Text>
              <Text>
                {currency} {formatAmount(invoice.total_amount, decimals)}
              </Text>
            </View>

            {!isQuote && invoice.amount_paid > 0 && (
              <View style={pdfStyles.paidRow}>
                <Text>{labels.amountPaid}</Text>
                <Text>
                  {currency} {formatAmount(invoice.amount_paid, decimals)}
                </Text>
              </View>
            )}

            {!isQuote && (
              <View style={pdfStyles.dueRow}>
                <Text>{labels.balanceDue}</Text>
                <Text>
                  {currency} {formatAmount(invoice.amount_due, decimals)}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Signature Authorization Block: stamp and signature only once approved and signed */}
        <PdfSigningBlock
          company={company}
          signing={signing}
          isAr={isAr}
          issuedByLabel={labels.issuedBy}
          signatoryLabel={labels.authorizedSignatory}
          unsignedLabel={t.awaitingSignature}
          signedOnLabel={t.signedOn}
        />

        {/* Footer */}
        <View style={pdfStyles.footer} fixed>
          <Text>{labels.thankYou}</Text>
          <Text>
            {company.website}
            {` • ${company.email}`}
            {` • ${company.phone}`}
          </Text>
        </View>
      </Page>
    </Document>
  );
}

export { InvoicePDF as InvoicePdfDocument };

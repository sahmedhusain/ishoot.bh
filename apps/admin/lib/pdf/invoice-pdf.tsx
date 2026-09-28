import * as React from "react";
import { Document, Page, Text, View } from "@react-pdf/renderer";
import { pdfStyles } from "./shared-styles";
import type { Invoice, CompanySettings } from "@ishoot/database/types";

interface InvoicePdfProps {
  invoice: Invoice;
  company: CompanySettings;
}

function formatAmount(val: number | string | undefined, decimals = 3): string {
  const num = typeof val === "number" ? val : parseFloat(val as string) || 0;
  return num.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return "-";
  try {
    return new Date(dateStr).toISOString().split("T")[0];
  } catch {
    return dateStr;
  }
}

export function InvoicePdfDocument({ invoice, company }: InvoicePdfProps) {
  const currency = invoice.currency || company.default_currency || "BHD";
  const decimals = company.currency_decimals ?? 3;
  const lineItems = invoice.line_items || [];
  const isVatActive = Boolean(
    invoice.vat_enabled &&
      (Number(invoice.vat_amount) > 0 || company.vat_enabled),
  );

  const clientName =
    invoice.contact?.full_name ||
    invoice.deal?.contact?.full_name ||
    invoice.contact_name ||
    "Client";
  const clientCompany =
    invoice.contact?.company || invoice.deal?.contact?.company || "";
  const clientEmail =
    invoice.contact?.email || invoice.deal?.contact?.email || "";
  const clientPhone =
    invoice.contact?.phone || invoice.deal?.contact?.phone || "";
  const clientAddress =
    invoice.contact?.address || invoice.deal?.contact?.address || "";
  const clientVat = invoice.contact?.vat_number || "";

  return (
    <Document title={`Invoice ${invoice.invoice_number} - ishoot`}>
      <Page size="A4" style={pdfStyles.page}>
        {/* Official Header Banner */}
        <View style={pdfStyles.headerBanner}>
          <View>
            <Text style={pdfStyles.brandTitle}>
              ishoot<Text style={pdfStyles.brandDot}>.</Text>
            </Text>
            <Text style={pdfStyles.companySubtitle}>
              {company.company_name_en}
            </Text>
            <Text style={pdfStyles.companyMeta}>
              CR: {company.cr_number || "CR-142859-1"}
              {isVatActive && company.vat_id
                ? ` • VAT ID: ${company.vat_id}`
                : ""}
              {" • Kingdom of Bahrain"}
            </Text>
          </View>

          <View style={pdfStyles.docTitleBlock}>
            <Text style={pdfStyles.docMainTitle}>
              {isVatActive ? "TAX INVOICE" : "INVOICE"}
            </Text>
            <Text style={pdfStyles.docNumber}>{invoice.invoice_number}</Text>
          </View>
        </View>

        {/* Client & Metadata Grid */}
        <View style={pdfStyles.metaGrid}>
          <View style={pdfStyles.metaCard}>
            <Text style={pdfStyles.metaLabel}>BILLED TO / العميل</Text>
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
                Client VAT: {clientVat}
              </Text>
            ) : null}
          </View>

          <View style={pdfStyles.metaCard}>
            <Text style={pdfStyles.metaLabel}>INVOICE DETAILS / تفاصيل الفاتورة</Text>
            <Text style={pdfStyles.metaSub}>
              Issue Date: {formatDate(invoice.issue_date)}
            </Text>
            <Text style={pdfStyles.metaSub}>
              Due Date: {formatDate(invoice.due_date)}
            </Text>
            <Text style={pdfStyles.metaSub}>
              Status: {(invoice.status || "draft").replace("_", " ").toUpperCase()}
            </Text>
            <Text style={pdfStyles.metaSub}>
              Currency: {currency}
            </Text>
          </View>
        </View>

        {/* Line Items Table */}
        <View style={pdfStyles.table}>
          <View style={pdfStyles.tableHeader}>
            <Text style={pdfStyles.colDesc}>DESCRIPTION / الوصف</Text>
            <Text style={pdfStyles.colQty}>QTY / الكمية</Text>
            <Text style={pdfStyles.colUnitPrice}>UNIT PRICE ({currency})</Text>
            <Text style={pdfStyles.colTotal}>TOTAL ({currency})</Text>
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
                  {item.description_en || "Service item"}
                </Text>
                {item.description_ar ? (
                  <Text style={{ fontSize: 7.5, color: "#6B7280", marginTop: 1 }}>
                    {item.description_ar}
                  </Text>
                ) : null}
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
            <Text style={pdfStyles.metaLabel}>
              BANK COORDINATES / تفاصيل الحساب البنكي
            </Text>
            <Text style={pdfStyles.metaSub}>
              Bank: {company.bank_name || "National Bank of Bahrain (NBB)"}
            </Text>
            <Text style={pdfStyles.metaSub}>
              IBAN: {company.bank_iban || "-"}
            </Text>
            <Text style={pdfStyles.metaSub}>
              Account: {company.bank_account_number || "-"}
            </Text>
            <Text style={pdfStyles.metaSub}>
              SWIFT: {company.bank_swift || "-"}
            </Text>

            {/* Terms and notes */}
            <View style={{ marginTop: 8, paddingTop: 6, borderTopWidth: 1, borderTopColor: "#E5E7EB" }}>
              <Text style={{ fontSize: 7, color: "#4B5563", lineHeight: 1.3 }}>
                • Payment is due within {company.payment_terms_days || 30} days ({formatDate(invoice.due_date)}).
              </Text>
              <Text style={{ fontSize: 7, color: "#4B5563", lineHeight: 1.3 }}>
                • Wire payments must reference invoice: {invoice.invoice_number}.
              </Text>
              {invoice.notes_en ? (
                <Text style={{ fontSize: 7, color: "#111827", marginTop: 2, fontWeight: "bold" }}>
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
              <Text>Subtotal / المجموع:</Text>
              <Text>
                {currency} {formatAmount(invoice.subtotal, decimals)}
              </Text>
            </View>

            {invoice.discount_amount > 0 && (
              <View style={pdfStyles.totalRow}>
                <Text>Discount / الخصم:</Text>
                <Text style={{ color: "#DC2626" }}>
                  - {currency} {formatAmount(invoice.discount_amount, decimals)}
                </Text>
              </View>
            )}

            {isVatActive && (
              <View style={pdfStyles.totalRow}>
                <Text>VAT ({invoice.vat_percentage || 10}%):</Text>
                <Text>
                  {currency} {formatAmount(invoice.vat_amount, decimals)}
                </Text>
              </View>
            )}

            <View style={pdfStyles.totalRowFinal}>
              <Text>TOTAL / الإجمالي:</Text>
              <Text>
                {currency} {formatAmount(invoice.total_amount, decimals)}
              </Text>
            </View>

            {invoice.amount_paid > 0 && (
              <View style={pdfStyles.paidRow}>
                <Text>Amount Paid / المدفوع:</Text>
                <Text>
                  {currency} {formatAmount(invoice.amount_paid, decimals)}
                </Text>
              </View>
            )}

            <View style={pdfStyles.dueRow}>
              <Text>Balance Due / المستحق:</Text>
              <Text>
                {currency} {formatAmount(invoice.amount_due, decimals)}
              </Text>
            </View>
          </View>
        </View>

        {/* Signature Authorization Block */}
        <View style={pdfStyles.signatureContainer}>
          <View>
            <Text style={{ fontSize: 7.5, color: "#6B7280" }}>
              Issued by / صادر عن
            </Text>
            <Text style={{ fontSize: 8.5, fontWeight: "bold", color: "#111827", marginTop: 1 }}>
              {company.company_name_en}
            </Text>
          </View>

          <View style={{ alignItems: "flex-end" }}>
            <View style={pdfStyles.signatureBox} />
            <Text style={pdfStyles.signatureLabel}>
              Authorized Signatory / التوقيع المعتمد
            </Text>
          </View>
        </View>

        {/* Footer */}
        <View style={pdfStyles.footer} fixed>
          <Text>Thank you for choosing ishoot Cinema Production.</Text>
          <Text>
            {company.website || "https://ishoot.bh"}
            {company.email ? ` • ${company.email}` : ""}
            {company.phone ? ` • ${company.phone}` : ""}
          </Text>
        </View>
      </Page>
    </Document>
  );
}

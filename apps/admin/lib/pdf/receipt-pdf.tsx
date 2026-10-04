
import { Document,Page,Text,View,Image as PdfImage } from "@react-pdf/renderer";
import type { Payment,CompanySettings } from "@ishoot/database/types";
import { pdfStyles } from "./shared-styles";
import { PdfBrandLogo } from "./brand-logo-pdf";
import { adminTranslations } from "../translations";

interface ReceiptPDFProps {
  payment: Payment;
  company: CompanySettings;
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

function ReceiptPDF({ payment, company }: ReceiptPDFProps) {
  const currency = payment.currency || company.default_currency;
  const decimals = company.currency_decimals;
  const invoice = payment.invoice;
  const isAr = invoice?.language === "ar";
  const t = adminTranslations[isAr ? "ar" : "en"].pdfReceipt;

  const clientName = invoice?.contact?.full_name ?? t.defaultClient;
  const clientCompany = invoice?.contact?.company || "";
  const clientEmail = invoice?.contact?.email || "";
  const clientPhone = invoice?.contact?.phone || "";


  const totalPaidAfterThis = invoice
    ? Number(invoice.amount_paid)
    : payment.amount;
  const previouslyPaid = Math.max(0, totalPaidAfterThis - payment.amount);

  const compNameEn = company.company_name_en;
  const compNameAr = company.company_name_ar;
  const companyDisplayName = isAr ? compNameAr : compNameEn;

  const labels = {
    mainTitle: t.title,
    receivedFrom: t.receivedFrom,
    paymentDetails: t.paymentDetails,
    date: t.receiptDate,
    method: t.paymentMethod,
    ref: t.refNumber,
    linkedInvoice: t.linkedInvoice,
    description: t.description,
    amountReceived: `${t.amountReceived} (${currency})`,
    directPayment: t.directPayment,
    settlementFor: t.settlementFor,
    notes: t.notes,
    totalInvoice: t.totalInvoice,
    previouslyPaid: t.previouslyPaid,
    thisPayment: t.thisPayment,
    remainingBalance: t.remainingBalance,
    verified: t.verifiedNotice,
    electronicNotice: t.electronicNotice.replace(
      "{companyName}",
      companyDisplayName,
    ),
    issuedBy: t.issuedBy,
    cashier: t.cashier,
    footerReceipt: t.footer.replace("{companyName}", companyDisplayName),
  };

  return (
    <Document title={`Receipt ${payment.receipt_number} - ${compNameEn}`}>
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
              {t.crPrefix} {company.cr_number} • {t.country}
            </Text>
          </View>

          <View style={pdfStyles.docTitleBlock}>
            <Text style={pdfStyles.docMainTitle}>{labels.mainTitle}</Text>
            <Text style={pdfStyles.docNumber}>{payment.receipt_number}</Text>
          </View>
        </View>

        {/* Client & Metadata Grid */}
        <View style={pdfStyles.metaGrid}>
          <View style={pdfStyles.metaCard}>
            <Text style={pdfStyles.metaLabel}>{labels.receivedFrom}</Text>
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
          </View>

          <View style={pdfStyles.metaCard}>
            <Text style={pdfStyles.metaLabel}>{labels.paymentDetails}</Text>
            <Text style={pdfStyles.metaSub}>
              {labels.date} {formatDate(payment.payment_date)}
            </Text>
            <Text style={pdfStyles.metaSub}>
              {labels.method}{" "}
              {payment.payment_method.replace("_", " ").toUpperCase()}
            </Text>
            {payment.reference_number ? (
              <Text style={pdfStyles.metaSub}>
                {labels.ref} {payment.reference_number}
              </Text>
            ) : null}
            {invoice ? (
              <Text
                style={[
                  pdfStyles.metaSub,
                  { fontWeight: "bold", color: "#014842" },
                ]}
              >
                {labels.linkedInvoice} {invoice.invoice_number}
              </Text>
            ) : null}
          </View>
        </View>

        {/* Payment Amount Card */}
        <View style={pdfStyles.table}>
          <View style={pdfStyles.tableHeader}>
            <Text style={{ flex: 3 }}>{labels.description}</Text>
            <Text style={{ flex: 2, textAlign: "right" }}>
              {labels.amountReceived}
            </Text>
          </View>

          <View style={[pdfStyles.tableRow, { paddingVertical: 12 }]}>
            <View style={{ flex: 3 }}>
              <Text style={{ fontWeight: "bold", fontSize: 10 }}>
                {labels.directPayment}
              </Text>
              {invoice ? (
                <Text style={{ fontSize: 8, color: "#6B7280", marginTop: 3 }}>
                  {labels.settlementFor} {invoice.invoice_number}
                </Text>
              ) : null}
              {payment.notes ? (
                <Text style={{ fontSize: 8, color: "#4B5563", marginTop: 2 }}>
                  {labels.notes} {payment.notes}
                </Text>
              ) : null}
            </View>
            <Text
              style={{
                flex: 2,
                textAlign: "right",
                fontWeight: "bold",
                fontSize: 14,
                color: "#014842",
              }}
            >
              {currency} {formatAmount(payment.amount, decimals)}
            </Text>
          </View>
        </View>

        {/* Linked Invoice Financial Summary */}
        {invoice && (
          <View
            style={[pdfStyles.totalsContainer, { justifyContent: "flex-end" }]}
          >
            <View style={pdfStyles.totalsBlock}>
              <View style={pdfStyles.totalRow}>
                <Text>{labels.totalInvoice}</Text>
                <Text>
                  {currency} {formatAmount(invoice.total_amount, decimals)}
                </Text>
              </View>

              <View style={pdfStyles.totalRow}>
                <Text>{labels.previouslyPaid}</Text>
                <Text>
                  {currency} {formatAmount(previouslyPaid, decimals)}
                </Text>
              </View>

              <View style={pdfStyles.totalRow}>
                <Text>{labels.thisPayment}</Text>
                <Text style={{ fontWeight: "bold", color: "#059669" }}>
                  {currency} {formatAmount(payment.amount, decimals)}
                </Text>
              </View>

              <View style={pdfStyles.dueRow}>
                <Text>{labels.remainingBalance}</Text>
                <Text>
                  {currency} {formatAmount(invoice.amount_due, decimals)}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Verification Card */}
        <View
          style={{
            marginTop: 10,
            padding: 8,
            backgroundColor: "#F0FDF4",
            borderRadius: 6,
            borderWidth: 1,
            borderColor: "#BBF7D0",
          }}
        >
          <Text style={{ fontSize: 7.5, color: "#166534", fontWeight: "bold" }}>
            {labels.verified}
          </Text>
          <Text style={{ fontSize: 7, color: "#4B5563", marginTop: 2 }}>
            {labels.electronicNotice}
          </Text>
        </View>

        {/* Signature Authorization Block */}
        {(() => {
          const stampPath = company.stamp_url;
          const signaturePath = company.signature_url;

          return (
            <View style={pdfStyles.signatureContainer}>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
              >
                {stampPath && (
                  <PdfImage src={stampPath as any} style={pdfStyles.stampImage} />
                )}
                <View>
                  <Text style={{ fontSize: 7.5, color: "#6B7280" }}>
                    {labels.issuedBy}
                  </Text>
                  <Text
                    style={{
                      fontSize: 8.5,
                      fontWeight: "bold",
                      color: "#111827",
                      marginTop: 1,
                    }}
                  >
                    {isAr
                      ? company.company_name_ar || company.company_name_en
                      : company.company_name_en || company.company_name_ar}
                  </Text>
                </View>
              </View>

              <View style={{ alignItems: "flex-end" }}>
                {signaturePath ? (
                  <PdfImage src={signaturePath as any} style={pdfStyles.signatureImage} />
                ) : (
                  <View style={pdfStyles.signatureBox} />
                )}
                <Text style={pdfStyles.signatureLabel}>{labels.cashier}</Text>
              </View>
            </View>
          );
        })()}

        {/* Footer */}
        <View style={pdfStyles.footer} fixed>
          <Text>{labels.footerReceipt}</Text>
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

export { ReceiptPDF as ReceiptPdfDocument };

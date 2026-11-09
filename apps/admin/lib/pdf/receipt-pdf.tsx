import { formatMessage } from "@platform/locales";
import { Document, Page, View } from "@react-pdf/renderer";
import type { Payment } from "@platform/database/types";
import { formatDocumentPhone } from "@platform/database";
import {
  Letterhead,
  C,
  fmtDate,
  fmtMoney,
  pageStyle,
  type CompanySignature,
  type PdfBrand,
  docKit,
  type DocKit,
  type TaxCertificateMark,
} from "./kit";

interface ReceiptPDFProps {
  payment: Payment;
  brand: PdfBrand;
  signing?: CompanySignature | null;
  certificates?: TaxCertificateMark[];
}

const bare = (label: string) => label.replace(/\s*[:：]\s*$/, "");

function ReceiptBody({ k, payment, brand, signing, certificates = [] }: ReceiptPDFProps & { k: DocKit }) {
  const { t: all, isAr, T, Row, Card, Field, Totals, TitleBlock, CompanySignatureBlock, ClosingRow } = k;
  const t = all.pdfReceipt;
  const d = all.pdfDocs;
  const company = brand.company;
  const invoice = payment.invoice;
  const currency = payment.currency || company.default_currency;
  const money = (value: number) => fmtMoney(value, currency, isAr);
  const companyName = isAr ? company.company_name_ar : company.company_name_en;
  const clientName = invoice?.contact?.full_name || t.defaultClient;
  const clientCompany = invoice?.contact?.company || "";
  const method = (d.paymentMethods as Record<string, string>)[payment.payment_method] ?? payment.payment_method;
  const totalPaidAfterThis = invoice ? Number(invoice.amount_paid) : payment.amount;
  const previouslyPaid = Math.max(0, totalPaidAfterThis - payment.amount);

  return (
    <>
      <TitleBlock
        title={t.title}
        number={payment.receipt_number}
        facts={[
          [bare(t.receiptDate), fmtDate(payment.payment_date, isAr)],
          ...(invoice ? ([[bare(t.linkedInvoice), invoice.invoice_number]] as Array<[string, string]>) : []),
        ]}
      />

      <Row style={{ gap: 12, marginBottom: 16 }}>
        <Card label={t.receivedFrom}>
          <T style={{ fontSize: 10, fontWeight: "bold" }}>{clientCompany || clientName}</T>
          {clientCompany && clientName && clientCompany !== clientName ? <Field label={d.attention} value={clientName} /> : null}
          {invoice?.contact?.email ? <T style={{ fontSize: 8, color: C.body, marginTop: 1.5 }}>{invoice.contact.email}</T> : null}
          {invoice?.contact?.phone ? <T style={{ fontSize: 8, color: C.body, marginTop: 1.5 }}>{formatDocumentPhone(invoice.contact.phone, company.country)}</T> : null}
        </Card>
        <Card label={t.paymentDetails}>
          <Field label={bare(t.paymentMethod)} value={method} strong />
          <Field label={bare(t.refNumber)} value={payment.reference_number} />
          <Field label={bare(t.receiptDate)} value={fmtDate(payment.payment_date, isAr)} />
        </Card>
      </Row>

      <Row style={{ borderWidth: 1, borderColor: C.primary, borderRadius: 8, overflow: "hidden", marginBottom: 16 }} wrap={false}>
        <View style={{ flex: 1, padding: 14 }}>
          <T style={{ fontSize: 10, fontWeight: "bold" }}>{t.directPayment}</T>
          {invoice ? <T style={{ fontSize: 8, color: C.muted, marginTop: 3 }}>{t.settlementFor} {invoice.invoice_number}</T> : null}
          {payment.notes ? <Field label={bare(t.notes)} value={payment.notes} /> : null}
        </View>
        <View style={{ width: 190, backgroundColor: C.primary, padding: 14, justifyContent: "center" }}>
          <T align="center" style={{ fontSize: 7.5, color: "#E5E7EB" }}>{t.amountReceived}</T>
          <T align="center" style={{ fontSize: 16, fontWeight: "bold", color: "#FFFFFF", marginTop: 2 }}>{money(payment.amount)}</T>
        </View>
      </Row>

      {invoice ? (
        <Totals
          lines={[
            { label: bare(t.totalInvoice), value: money(invoice.total_amount) },
            { label: bare(t.previouslyPaid), value: money(previouslyPaid) },
            { label: bare(t.thisPayment), value: money(payment.amount), tone: "success" },
            { label: bare(t.remainingBalance), value: money(invoice.amount_due), tone: "final" },
          ]}
        />
      ) : null}

      <View style={{ marginTop: 16, paddingVertical: 8, paddingHorizontal: 12, backgroundColor: "#ECFDF5", borderRadius: 6 }} wrap={false}>
        <T style={{ fontSize: 8, color: C.success, fontWeight: "bold" }}>{t.verifiedNotice.replace(/^✓\s*/, "")}</T>
        <T style={{ fontSize: 7.5, color: C.body, marginTop: 2 }}>{formatMessage(t.electronicNotice, { companyName: companyName })}</T>
      </View>

      <ClosingRow certificates={certificates} end={<CompanySignatureBlock brand={brand} signing={signing} pending={t.awaitingSignature} label={t.cashier} />} />
    </>
  );
}

function ReceiptPDF(props: ReceiptPDFProps) {
  const isAr = props.payment.invoice?.language === "ar";
  const company = props.brand.company;
  const k = docKit(isAr ? "ar" : "en");
  return (
    <Document title={`${props.payment.receipt_number} · ${isAr ? company.company_name_ar : company.company_name_en}`} author={company.company_name_en} language={isAr ? "ar" : "en"}>
      <Page size="A4" style={pageStyle}>
        <Letterhead brand={props.brand} />
        <ReceiptBody k={k} {...props} />
        <k.Footer brand={props.brand} reference={props.payment.receipt_number} />
      </Page>
    </Document>
  );
}

export { ReceiptPDF as ReceiptPdfDocument };

import { formatMessage } from "@ishoot/locales";
import { Document, Page, View } from "@react-pdf/renderer";
import type { Invoice } from "@ishoot/database/types";
import {
  currencyLabel,
  Letterhead,
  C,
  fmtDate,
  fmtMoney,
  fmtNumber,
  pageStyle,
  type ClientAcceptance,
  type CompanySignature,
  type PdfBrand,
  docKit,
  type DocKit,
  type TaxCertificateMark,
} from "./kit";
import { formatClientAddress } from "../client-address";

interface InvoicePDFProps {
  invoice: Invoice;
  brand: PdfBrand;
  /** A quotation renders through the same layout so print, download and email stay identical. */
  variant?: "invoice" | "quotation";
  /** Quotation terms in the document language. */
  quotationTerms?: string | null;
  /** Present only once the document is approved and signed. */
  signing?: CompanySignature | null;
  /** The client's signature, once they sign online or a signed copy is uploaded. */
  acceptance?: ClientAcceptance | null;
  /** QR codes to the certificates of the taxes on this document, printed centred at its end. */
  certificates?: TaxCertificateMark[];
}

const bare = (label: string) => label.replace(/\s*[:：]\s*$/, "");

function InvoiceBody({ k, invoice, brand, variant = "invoice", quotationTerms, signing, acceptance, certificates = [] }: InvoicePDFProps & { k: DocKit }) {
  const { t: all, isAr, T, Row, Card, Field, Table, Totals, TitleBlock, ClientAcceptanceBlock, CompanySignatureBlock, ClosingRow } = k;
  const t = all.pdfInvoice;
  const d = all.pdfDocs;
  const company = brand.company;
  const isQuote = variant === "quotation";
  // VAT on an invoice is immutable: it depends strictly on the invoice's own issued snapshot.
  const isVatActive = Boolean(invoice.vat_enabled && Number(invoice.vat_amount) > 0);
  const currency = invoice.currency || company.default_currency;
  const money = (value: number) => fmtMoney(value, currency, isAr);
  const companyName = isAr ? company.company_name_ar : company.company_name_en;

  const clientName = invoice.contact?.full_name || invoice.contact_name || t.defaultClient;
  const clientCompany = (isAr && invoice.contact?.company_name_ar) || invoice.contact?.company || "";
  const clientAddress = formatClientAddress(invoice.contact?.address_details, all.clients.addressParts, all.countries) || invoice.contact?.address || "";
  const statusLabel = (all.statusLabels as Record<string, string>)[invoice.status || "draft"] ?? invoice.status;

  const facts: Array<[string, string]> = [
    [t.issueDate, fmtDate(invoice.issue_date, isAr)],
    [isQuote ? t.validUntil : t.dueDate, fmtDate(invoice.due_date, isAr)],
    ...(!isQuote ? ([[d.invoiceStatus, statusLabel]] as Array<[string, string]>) : []),
  ];

  const items = (invoice.line_items || []).map((item, index) => ({
    n: String(index + 1),
    description: isAr ? item.description_ar || item.description_en : item.description_en || item.description_ar,
    qty: fmtNumber(Number(item.quantity), Number(item.quantity) % 1 ? 2 : 0),
    unit: fmtNumber(item.unit_price, 3),
    total: fmtNumber(item.line_total, 3),
  }));

  const totals = [
    { label: bare(t.subtotal), value: money(invoice.subtotal) },
    ...(invoice.discount_amount > 0 ? [{ label: bare(t.discount), value: `- ${money(invoice.discount_amount)}`, tone: "danger" as const }] : []),
    ...(isVatActive ? [{ label: `${bare(t.vat)} (${fmtNumber(Number(invoice.vat_percentage), Number(invoice.vat_percentage) % 1 ? 2 : 0)}%)`, value: money(invoice.vat_amount) }] : []),
    ...(invoice.other_taxes ?? []).map((tax) => ({ label: `${isAr ? tax.name_ar : tax.name_en} (${fmtNumber(tax.rate, tax.rate % 1 ? 2 : 0)}%)`, value: money(tax.amount) })),
    { label: bare(isQuote ? t.quotationTotal : t.totalAmount), value: money(invoice.total_amount), tone: "final" as const },
    ...(!isQuote && invoice.amount_paid > 0 ? [{ label: bare(t.amountPaid), value: money(invoice.amount_paid), tone: "success" as const }] : []),
    ...(!isQuote && invoice.amount_paid > 0 ? [{ label: bare(t.balanceDue), value: money(invoice.amount_due), tone: invoice.amount_due > 0 ? ("danger" as const) : ("muted" as const) }] : []),
  ];

  const notes = isAr ? invoice.notes_ar || invoice.notes_en : invoice.notes_en || invoice.notes_ar;

  return (
    <>
      <TitleBlock title={isQuote ? t.quotationTitle : isVatActive ? t.taxInvoiceTitle : t.standardInvoiceTitle} number={invoice.invoice_number} facts={facts} />

      <Row style={{ gap: 12, marginBottom: 16 }}>
        <Card label={t.clientDetails}>
          <T style={{ fontSize: 10, fontWeight: "bold" }}>{clientCompany || clientName}</T>
          {clientCompany && clientName && clientCompany !== clientName ? <Field label={d.attention} value={clientName} /> : null}
          {invoice.contact?.email ? <T style={{ fontSize: 8, color: C.body, marginTop: 1.5 }}>{invoice.contact.email}</T> : null}
          {invoice.contact?.phone ? <T style={{ fontSize: 8, color: C.body, marginTop: 1.5 }}>{invoice.contact.phone}</T> : null}
          {clientAddress ? <T style={{ fontSize: 8, color: C.body, marginTop: 1.5 }}>{clientAddress}</T> : null}
          {invoice.contact?.cr_number ? <Field label={d.crNo} value={invoice.contact.cr_number} /> : null}
          {isVatActive && invoice.contact?.vat_number ? <Field label={d.vatNo} value={invoice.contact.vat_number} strong /> : null}
        </Card>
        <Card label={isQuote ? t.quotationDetails : t.bankDetails}>
          {isQuote ? (
            <>
              <Field label={bare(t.currency)} value={currencyLabel(currency, isAr)} />
              <Field label={t.validUntil} value={fmtDate(invoice.due_date, isAr)} />
              <Field label={d.issuedOn} value={fmtDate(invoice.issue_date, isAr)} />
            </>
          ) : (
            <>
              <Field label={bare(t.bankName)} value={company.bank_name} />
              <Field label={bare(t.iban)} value={company.bank_iban} strong />
              <Field label={bare(t.accountNo)} value={company.bank_account_number} />
              <Field label={bare(t.swift)} value={company.bank_swift} />
              <T style={{ fontSize: 7, color: C.muted, marginTop: 4 }}>{formatMessage(t.wireRefNotice, { invNum: invoice.invoice_number })}</T>
            </>
          )}
        </Card>
      </Row>

      <Table
        columns={[
          { key: "n", label: "#", flex: 0.4, align: "center" },
          { key: "description", label: t.description, flex: 5 },
          { key: "qty", label: t.qty, flex: 0.9, align: "center" },
          { key: "unit", label: `${t.unitPrice}`, flex: 1.6, align: "end" },
          { key: "total", label: t.total, flex: 1.7, align: "end" },
        ]}
        rows={items}
      />

      <Row style={{ justifyContent: "space-between", alignItems: "flex-start", gap: 16 }} wrap={false}>
        <View style={{ flex: 1 }}>
          {isQuote ? (
            quotationTerms ? (
              <>
                <T style={{ fontSize: 8, fontWeight: "bold", color: C.primary, marginBottom: 3 }}>{d.terms}</T>
                <T style={{ fontSize: 7.5, color: C.body, lineHeight: 1.55 }}>{quotationTerms}</T>
              </>
            ) : null
          ) : (
            <T style={{ fontSize: 7.5, color: C.body, lineHeight: 1.55 }}>
              {formatMessage(t.termsNotice, { days: String(company.payment_terms_days), date: fmtDate(invoice.due_date, isAr) })}
            </T>
          )}
          <T style={{ fontSize: 7.5, color: C.muted, marginTop: 6 }}>{formatMessage(t.thankYou, { companyName: companyName }).replace(/\.\.$/, ".")}</T>
          {notes ? (
            <T style={{ fontSize: 7.5, color: C.ink, marginTop: 6, lineHeight: 1.55 }}>
              {d.note}: {notes}
            </T>
          ) : null}
        </View>
        <Totals lines={totals} />
      </Row>

      <ClosingRow
        certificates={certificates}
        start={<ClientAcceptanceBlock acceptance={acceptance} documentKind={isQuote ? "quotation" : "invoice"} width={certificates.length === 1 ? 196 : 230} />}
        end={<CompanySignatureBlock brand={brand} signing={signing} pending={t.awaitingSignature} label={t.authorizedSignatory} />}
      />

    </>
  );
}

function InvoicePDF(props: InvoicePDFProps) {
  const isAr = props.invoice.language === "ar";
  const company = props.brand.company;
  const k = docKit(isAr ? "ar" : "en");
  return (
    <Document
      title={`${props.invoice.invoice_number} · ${isAr ? company.company_name_ar : company.company_name_en}`}
      author={company.company_name_en}
      language={isAr ? "ar" : "en"}
    >
        <Page size="A4" style={pageStyle}>
          <Letterhead brand={props.brand} />
          <InvoiceBody k={k} {...props} />
          <k.Footer brand={props.brand} reference={props.invoice.invoice_number} />
        </Page>
    </Document>
  );
}

export { InvoicePDF as InvoicePdfDocument };

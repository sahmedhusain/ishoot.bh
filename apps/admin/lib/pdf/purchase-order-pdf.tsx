import { Document, Page, View, renderToBuffer } from "@react-pdf/renderer";
import type { CompanySettings } from "@platform/database/types";
import { type PurchaseOrderRecord, formatDocumentPhone } from "@platform/database";
import { Letterhead, C, fmtDate, fmtMoney, fmtNumber, pageStyle, resolvePdfBrand, docKit, type CompanySignature, type DocKit, type PdfBrand } from "./kit";

function PurchaseOrderBody({ k, order, brand, signing }: { k: DocKit; order: PurchaseOrderRecord; brand: PdfBrand; signing: CompanySignature | null }) {
  const { t, isAr, T, Row, Card, Field, Table, Totals, TitleBlock, CompanySignatureBlock } = k;
  const p = t.procurement.pdf;
  const currency = brand.company.default_currency;
  const money = (value: number) => fmtMoney(value, currency, isAr);
  const warehouse = order.warehouse ? (isAr ? order.warehouse.name_ar : order.warehouse.name_en) : "";
  const totals = [
    { label: p.subtotal, value: money(order.subtotal) },
    ...(order.vat_enabled ? [{ label: `${p.vat} (${fmtNumber(order.vat_percentage, order.vat_percentage % 1 ? 2 : 0)}%)`, value: money(order.vat_amount) }] : []),
    { label: p.grandTotal, value: money(order.total), tone: "final" as const },
  ];
  return (
    <>
      <TitleBlock
        title={p.title}
        number={order.number}
        facts={[[p.orderDate, fmtDate(order.order_date, isAr)], ...(order.expected_date ? ([[p.expectedDate, fmtDate(order.expected_date, isAr)]] as Array<[string, string]>) : [])]}
      />
      <Row style={{ gap: 12, marginBottom: 16 }}>
        <Card label={p.supplier}>
          <T style={{ fontSize: 10, fontWeight: "bold" }}>{order.supplier.name}</T>
          {order.supplier.email ? <T style={{ fontSize: 8, color: C.body, marginTop: 1.5 }}>{order.supplier.email}</T> : null}
          {order.supplier.phone ? <T style={{ fontSize: 8, color: C.body, marginTop: 1.5 }}>{formatDocumentPhone(order.supplier.phone, brand.company.country)}</T> : null}
          {order.supplier.address ? <T style={{ fontSize: 8, color: C.body, marginTop: 1.5 }}>{order.supplier.address}</T> : null}
          {order.supplier.vat_number ? <Field label={t.pdfDocs.vatNo} value={order.supplier.vat_number} /> : null}
        </Card>
        <Card label={p.deliverTo}>
          <T style={{ fontSize: 10, fontWeight: "bold" }}>{isAr ? brand.company.company_name_ar : brand.company.company_name_en}</T>
          {warehouse ? <T style={{ fontSize: 8, color: C.body, marginTop: 1.5 }}>{warehouse}</T> : null}
          {brand.company.vat_id ? <Field label={t.pdfDocs.vatNo} value={brand.company.vat_id} /> : null}
        </Card>
      </Row>
      <Table
        columns={[
          { key: "n", label: "#", flex: 0.4, align: "center" },
          { key: "description", label: p.description, flex: 5 },
          { key: "qty", label: p.qty, flex: 0.9, align: "center" },
          { key: "unit", label: p.unitPrice, flex: 1.6, align: "end" },
          { key: "total", label: p.total, flex: 1.7, align: "end" },
        ]}
        rows={order.lines.map((line, index) => ({
          n: String(index + 1),
          description: line.description,
          qty: fmtNumber(line.quantity, line.quantity % 1 ? 3 : 0),
          unit: fmtNumber(line.unit_price, 3),
          total: fmtNumber(Math.round(line.quantity * line.unit_price * 1000) / 1000, 3),
        }))}
      />
      <Row style={{ justifyContent: "space-between", alignItems: "flex-start", gap: 16 }} wrap={false}>
        <View style={{ flex: 1 }}>
          {order.terms ? (
            <>
              <T style={{ fontSize: 8, fontWeight: "bold", color: C.primary, marginBottom: 3 }}>{p.terms}</T>
              <T style={{ fontSize: 7.5, color: C.body, lineHeight: 1.55 }}>{order.terms}</T>
            </>
          ) : null}
          <T style={{ fontSize: 7.5, color: C.muted, marginTop: 6 }}>{p.reference}</T>
        </View>
        <Totals lines={totals} />
      </Row>
      <Row style={{ justifyContent: "flex-end", marginTop: 18 }} wrap={false}>
        <CompanySignatureBlock brand={brand} signing={signing} label={p.authorized} />
      </Row>
    </>
  );
}

export async function generatePurchaseOrderPdf(order: PurchaseOrderRecord, company: CompanySettings, locale: "en" | "ar" = "en") {
  const brand = await resolvePdfBrand(company);
  const k = docKit(locale);
  const signing: CompanySignature | null = order.approved_by ? { signatureSrc: null, signerName: order.approved_by } : null;
  return renderToBuffer(
    <Document title={`${order.number} · ${company.company_name_en}`} author={company.company_name_en} language={locale}>
      <Page size="A4" style={pageStyle}>
        <Letterhead brand={brand} />
        <PurchaseOrderBody k={k} order={order} brand={brand} signing={signing} />
        <k.Footer brand={brand} reference={order.number} />
      </Page>
    </Document>,
  );
}

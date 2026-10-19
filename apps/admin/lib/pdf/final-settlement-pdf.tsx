import { formatMessage } from "@platform/locales";
/* eslint-disable jsx-a11y/alt-text -- React PDF images are PDF primitives, not DOM images. */
import {
  Document,
  Image,
  Page,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import type { FinalSettlementDetail } from "@platform/database";
import type { CompanySettings } from "@platform/database/types";
import { resolveConfiguredPdfAsset } from "./configured-asset";
import {
  C,
  Letterhead,
  docKit,
  fmtDate,
  fmtMoney,
  pageStyle,
  resolvePdfBrand,
  type DocKit,
} from "./kit";

function Lines({
  k,
  title,
  rows,
  total,
  totalLabel,
  currency,
  tone,
}: {
  k: DocKit;
  title: string;
  rows: FinalSettlementDetail["lines"];
  total: number;
  totalLabel: string;
  currency: string;
  tone: string;
}) {
  const { T, Row, isAr } = k;
  return (
    <View
      style={{
        borderRadius: 6,
        overflow: "hidden",
        borderWidth: 0.8,
        borderColor: C.line,
        marginBottom: 10,
      }}
      wrap={false}
    >
      <Row
        style={{
          backgroundColor: tone,
          paddingVertical: 6,
          paddingHorizontal: 10,
          justifyContent: "space-between",
        }}
      >
        <T style={{ color: "#FFFFFF", fontSize: 8, fontWeight: "bold" }}>
          {title}
        </T>
        <T style={{ color: "#FFFFFF", fontSize: 8, fontWeight: "bold" }}>
          {k.t.settlements.amount}
        </T>
      </Row>
      {rows.length === 0 ? (
        <T style={{ fontSize: 8, color: C.muted, padding: 8 }}>
          {k.t.settlements.none}
        </T>
      ) : null}
      {rows.map((row, i) => (
        <Row
          key={row.id}
          style={{
            justifyContent: "space-between",
            paddingVertical: 5,
            paddingHorizontal: 10,
            borderTopWidth: i ? 0.6 : 0,
            borderTopColor: C.line,
          }}
        >
          <T style={{ fontSize: 8.3, color: C.body, flex: 1 }}>
            {isAr ? row.labelAr : row.labelEn}
          </T>
          <T style={{ fontSize: 8.3 }}>
            {fmtMoney(row.amount, currency, isAr)}
          </T>
        </Row>
      ))}
      <Row
        style={{
          justifyContent: "space-between",
          paddingVertical: 6,
          paddingHorizontal: 10,
          backgroundColor: C.soft,
          borderTopWidth: 0.8,
          borderTopColor: C.line,
        }}
      >
        <T style={{ fontSize: 8.5, fontWeight: "bold" }}>{totalLabel}</T>
        <T style={{ fontSize: 8.5, fontWeight: "bold" }}>
          {fmtMoney(total, currency, isAr)}
        </T>
      </Row>
    </View>
  );
}

const png = async (data?: string | null) =>
  data ? ((await resolveConfiguredPdfAsset(data)) ?? null) : null;

/** The settlement statement: what is owed each way, the approvals with their signatures and the employee's acknowledgement. */
export async function generateFinalSettlementPdf(
  s: FinalSettlementDetail,
  company: CompanySettings,
  locale: "en" | "ar",
) {
  const k = docKit(locale);
  const { t, isAr, T, Row, Card, Field, TitleBlock, SectionTitle } = k;
  const f = t.settlements;
  const [brand, employeeSignature, approvals] = await Promise.all([
    resolvePdfBrand(company),
    png(s.employeeSignature),
    Promise.all(
      (s.approval?.decisions ?? [])
        .filter((d) => d.decision === "approved")
        .map(async (d) => ({ ...d, image: await png(d.signature) })),
    ),
  ]);
  const name = isAr ? s.employee.nameAr : s.employee.nameEn;
  const owedBy = s.netAmount < 0;
  const signers = [
    ...approvals.map((d) => ({
      title: f.pdf.approvedBy,
      name: isAr ? d.nameAr : d.nameEn,
      role: isAr ? d.titleAr : d.titleEn,
      image: d.image,
      date: d.at,
    })),
    {
      title: f.pdf.employee,
      name: s.employeeSignerName ?? name,
      role: isAr ? s.employee.jobTitleAr : s.employee.jobTitleEn,
      image: employeeSignature,
      date: s.employeeSignedAt,
    },
  ];
  return renderToBuffer(
    <Document
      title={`${s.reference} · ${name}`}
      author={company.company_name_en}
      language={locale}
    >
      <Page size="A4" style={pageStyle}>
        <Letterhead brand={brand} />
        <TitleBlock
          title={f.pdf.title}
          number={s.reference}
          facts={[
            [f.fields.lastWorkingDay, fmtDate(s.lastWorkingDay, isAr)],
            [f.fields.status, f.statuses[s.status as keyof typeof f.statuses]],
          ]}
        />
        <Row style={{ gap: 12, marginBottom: 12 }}>
          <Card label={f.pdf.employee}>
            <T style={{ fontSize: 10, fontWeight: "bold" }}>{name}</T>
            <Field label={f.pdf.employeeNo} value={s.employee.number} />
            <Field
              label={f.fields.jobTitle}
              value={isAr ? s.employee.jobTitleAr : s.employee.jobTitleEn}
            />
            <Field
              label={f.pdf.department}
              value={isAr ? s.employee.departmentAr : s.employee.departmentEn}
            />
            <Field label={f.pdf.cpr} value={s.employee.cprNumber} />
          </Card>
          <Card label={f.pdf.service}>
            <Field
              label={f.fields.hireDate}
              value={fmtDate(s.employee.hireDate, isAr)}
            />
            <Field
              label={f.fields.lastWorkingDay}
              value={fmtDate(s.lastWorkingDay, isAr)}
            />
            <Field
              label={f.fields.reason}
              value={f.reasons[s.reason as keyof typeof f.reasons]}
              strong
            />
          </Card>
        </Row>
        <Lines
          k={k}
          title={f.owedToEmployee}
          rows={s.lines.filter((l) => l.kind === "addition")}
          total={s.totalAdditions}
          totalLabel={f.totalAdditions}
          currency={s.currency}
          tone={C.primary}
        />
        <Lines
          k={k}
          title={f.owedByEmployee}
          rows={s.lines.filter((l) => l.kind === "deduction")}
          total={s.totalDeductions}
          totalLabel={f.totalDeductions}
          currency={s.currency}
          tone={C.danger}
        />
        <Row
          style={{
            backgroundColor: owedBy ? C.danger : C.primary,
            borderRadius: 7,
            paddingVertical: 10,
            paddingHorizontal: 14,
            justifyContent: "space-between",
            alignItems: "center",
          }}
          wrap={false}
        >
          <T style={{ fontSize: 10.5, fontWeight: "bold", color: "#FFFFFF" }}>
            {owedBy ? f.netOwedByEmployee : f.netPayable}
          </T>
          <T style={{ fontSize: 14, fontWeight: "bold", color: "#FFFFFF" }}>
            {fmtMoney(Math.abs(s.netAmount), s.currency, isAr)}
          </T>
        </Row>
        {s.status === "paid" && s.paidAt ? (
          <T style={{ fontSize: 7.5, color: C.muted, marginTop: 4 }}>
            {formatMessage(f.pdf.paid, { date: fmtDate(s.paidAt, isAr) })}
          </T>
        ) : null}

        <View wrap={false} style={{ marginTop: 14 }}>
          <SectionTitle>{f.acknowledgement}</SectionTitle>
          <T
            style={{
              fontSize: 7.8,
              color: C.body,
              lineHeight: 1.55,
              marginBottom: 8,
            }}
          >
            {formatMessage(f.pdf.acknowledgeText, { name: name, company: isAr ? company.company_name_ar : company.company_name_en })}
          </T>
          <Row style={{ flexWrap: "wrap", gap: 8 }}>
            {signers.map((sg, i) => (
              <View
                key={i}
                style={{
                  width: "31.5%",
                  borderWidth: 0.6,
                  borderColor: C.line,
                  borderRadius: 6,
                  padding: 7,
                }}
              >
                <T style={{ fontSize: 7, color: C.muted }}>{sg.title}</T>
                <View
                  style={{
                    height: 38,
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  {sg.image ? (
                    <Image
                      src={sg.image}
                      style={{ height: 34, width: 120, objectFit: "contain" }}
                    />
                  ) : (
                    <T style={{ fontSize: 7, color: "#9CA3AF" }}>
                      {f.pdf.notSigned}
                    </T>
                  )}
                </View>
                <T style={{ fontSize: 8, fontWeight: "bold" }}>{sg.name}</T>
                {sg.role ? (
                  <T style={{ fontSize: 7, color: C.muted }}>{sg.role}</T>
                ) : null}
                {sg.date ? (
                  <T style={{ fontSize: 7, color: C.muted }}>
                    {fmtDate(sg.date, isAr)}
                  </T>
                ) : null}
              </View>
            ))}
          </Row>
        </View>
        <k.Footer brand={brand} reference={s.reference} />
      </Page>
    </Document>,
  );
}

import { serverMessages, formatMessage } from "@ishoot/locales";

import React from "react";
import { Document, Page, View, renderToBuffer } from "@react-pdf/renderer";
import { db } from "@ishoot/database";
import type { CompanySettings } from "@ishoot/database/types";
import { resolveConfiguredPdfAsset } from "./configured-asset";
import {
  Letterhead,
  C,
  fmtDate,
  fmtMoney,
  fmtMonth,
  fmtNumber,
  pageStyle,
  resolvePdfBrand,
  type CompanySignature,
  type PdfBrand,
  docKit,
  type DocKit,
} from "./kit";

interface Snapshot {
  employee: {
    employeeNumber: string;
    firstNameEn: string;
    lastNameEn: string;
    firstNameAr: string;
    lastNameAr: string;
    jobTitleEn: string;
    jobTitleAr: string;
    hireDate: string;
    departmentEn?: string | null;
    departmentAr?: string | null;
  };
  compensation?: Record<string, unknown>;
  items?: Array<PayslipItem>;
}

/** Older snapshots may still carry attendance counts; payslips never print them. */
type PayslipItem = Record<string, unknown> & {
  lines?: Array<{
    kind: string;
    category: string;
    label: string;
    amount: unknown;
  }>;
  payrollRun: {
    year: number;
    month: number;
    status: string;
    periodStart?: string;
    periodEnd?: string;
    payDate?: string | null;
  };
};

const EARNINGS = [
  "basicSalary",
  "housingAllowance",
  "transportAllowance",
  "otherAllowances",
  "overtimePay",
  "shiftAllowance",
  "commission",
  "bonus",
] as const;
const DEDUCTIONS = [
  "gosiEmployee",
  "absenceDeduction",
  "leaveDeduction",
  "latenessDeduction",
  "otherDeductions",
] as const;
const ALWAYS_SHOWN = new Set(["basicSalary", "gosiEmployee"]);

const num = (value: unknown) => Number(value || 0);

/** A short, stable reference printed on the document and its footer. */
function documentReference(kind: string, id: string, issuedAt: Date | null) {
  return `${kind === "payslip" ? "PS" : "SC"}-${(issuedAt ?? new Date()).getUTCFullYear()}-${id.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

/** The HR approver signs; without a personal signature on file the company's signatory signs instead. */
async function salarySignatory(
  documentId: string,
  reviewedById: string | null,
  issuedAt: Date | null,
  company: CompanySettings,
  locale: "en" | "ar",
): Promise<CompanySignature> {
  // A signature drawn when the document was approved (signing on the spot) takes precedence over the saved one.
  const drawn = reviewedById
    ? await db.approvalDecision.findFirst({
        where: {
          decidedById: reviewedById,
          decision: "approved",
          signatureData: { not: null },
          approvalRequest: {
            targetType: "salary_document",
            targetId: documentId,
          },
        },
        orderBy: { decidedAt: "desc" },
        select: { signatureData: true },
      })
    : null;
  const reviewer = reviewedById
    ? await db.user.findUnique({
        where: { id: reviewedById },
        select: {
          fullName: true,
          signatureUrl: true,
          employee: {
            select: {
              jobTitleEn: true,
              jobTitleAr: true,
              firstNameEn: true,
              lastNameEn: true,
              firstNameAr: true,
              lastNameAr: true,
            },
          },
        },
      })
    : null;
  const own = await resolveConfiguredPdfAsset(
    drawn?.signatureData ?? reviewer?.signatureUrl,
  );
  if (reviewer && own)
    return {
      signatureSrc: own,
      signerName: reviewer.employee
        ? locale === "ar"
          ? `${reviewer.employee.firstNameAr} ${reviewer.employee.lastNameAr}`
          : `${reviewer.employee.firstNameEn} ${reviewer.employee.lastNameEn}`
        : reviewer.fullName,
      signerTitle:
        locale === "ar"
          ? reviewer.employee?.jobTitleAr
          : reviewer.employee?.jobTitleEn,
      signedAt: issuedAt?.toISOString() ?? null,
    };
  return {
    signatureSrc:
      (await resolveConfiguredPdfAsset(company.signature_url)) ?? null,
    signerName:
      (locale === "ar" ? company.ceo_name_ar : company.ceo_name_en) || null,
    signerTitle:
      (locale === "ar" ? company.ceo_title_ar : company.ceo_title_en) || null,
    signedAt: issuedAt?.toISOString() ?? null,
  };
}

function EmployeeCard({
  k,
  employee,
}: {
  k: DocKit;
  employee: Snapshot["employee"];
}) {
  const { t, isAr, T, Card, Field } = k;
  const p = t.pdfDocs.payslip;
  return (
    <Card label={p.employee}>
      <T style={{ fontSize: 10.5, fontWeight: "bold" }}>
        {isAr
          ? `${employee.firstNameAr} ${employee.lastNameAr}`
          : `${employee.firstNameEn} ${employee.lastNameEn}`}
      </T>
      <Field label={p.employeeNo} value={employee.employeeNumber} strong />
      <Field
        label={p.position}
        value={isAr ? employee.jobTitleAr : employee.jobTitleEn}
      />
      <Field
        label={p.department}
        value={isAr ? employee.departmentAr : employee.departmentEn}
      />
      <Field label={p.hireDate} value={fmtDate(employee.hireDate, isAr)} />
    </Card>
  );
}

/** One row per amount; a month's named additions or deductions replace their total row (bonus, other deductions). */
function AmountTable({
  k,
  title,
  keys,
  item,
  total,
  totalLabel,
  currency,
  kind,
}: {
  k: DocKit;
  title: string;
  keys: readonly string[];
  item: PayslipItem;
  total: number;
  totalLabel: string;
  currency: string;
  kind: "addition" | "deduction";
}) {
  const { t, isAr, T, Row } = k;
  const lines = t.pdfDocs.payslip.lines as Record<string, string>;
  const categories = t.payLines.categories as Record<string, string>;
  const named = (Array.isArray(item.lines) ? item.lines : []).filter(
    (l) => l.kind === kind,
  );
  const expanded = kind === "addition" ? "bonus" : "otherDeductions";
  // Social insurance shows each contribution (e.g. pension 8%, unemployment 1%) when the month was worked out under the scheme.
  const gosiLines = (
    (
      item.calculationSnapshot as {
        gosi?: {
          lines?: Array<{
            nameEn: string;
            nameAr: string;
            employeePercent: number;
            employee: number;
          }>;
        } | null;
      } | null
    )?.gosi?.lines ?? []
  ).filter((l) => l.employee > 0);
  const rows: Array<{
    key: string;
    label: string;
    detail?: string;
    amount: number;
  }> = keys
    .filter((key) => ALWAYS_SHOWN.has(key) || num(item[key]) !== 0)
    .flatMap((key) =>
      key === expanded && named.length
        ? named.map((l, i) => ({
            key: `${key}-${i}`,
            label: categories[l.category] ?? lines[key],
            detail: l.label,
            amount: num(l.amount),
          }))
        : key === "gosiEmployee" && gosiLines.length
          ? gosiLines.map((l, i) => ({
              key: `${key}-${i}`,
              label: `${isAr ? l.nameAr : l.nameEn} (${l.employeePercent}%)`,
              detail: lines[key],
              amount: l.employee,
            }))
          : [{ key, label: lines[key], amount: num(item[key]) }],
    );
  return (
    <View
      style={{
        flex: 1,
        borderRadius: 6,
        overflow: "hidden",
        borderWidth: 0.8,
        borderColor: C.line,
      }}
    >
      <Row
        style={{
          backgroundColor: C.primary,
          paddingVertical: 6,
          paddingHorizontal: 10,
          justifyContent: "space-between",
        }}
      >
        <T style={{ color: "#FFFFFF", fontSize: 8, fontWeight: "bold" }}>
          {title}
        </T>
        <T style={{ color: "#FFFFFF", fontSize: 8, fontWeight: "bold" }}>
          {t.pdfDocs.payslip.amount}
        </T>
      </Row>
      {rows.map((row, index) => (
        <Row
          key={row.key}
          style={{
            justifyContent: "space-between",
            alignItems: "flex-start",
            paddingVertical: 5.5,
            paddingHorizontal: 10,
            borderTopWidth: index ? 0.6 : 0,
            borderTopColor: C.line,
          }}
        >
          <View style={{ flex: 1 }}>
            <T style={{ fontSize: 8.5, color: C.body }}>{row.label}</T>
            {row.detail && row.detail !== row.label ? (
              <T style={{ fontSize: 7, color: C.muted }}>{row.detail}</T>
            ) : null}
          </View>
          <T style={{ fontSize: 8.5 }}>
            {fmtMoney(row.amount, currency, isAr)}
          </T>
        </Row>
      ))}
      <View style={{ flexGrow: 1 }} />
      <Row
        style={{
          justifyContent: "space-between",
          paddingVertical: 6.5,
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

function PayslipPage({
  k,
  brand,
  item,
  employee,
  reference,
  issuedAt,
  signing,
  currency,
}: {
  k: DocKit;
  brand: PdfBrand;
  item: PayslipItem;
  employee: Snapshot["employee"];
  reference: string;
  issuedAt: Date | null;
  signing: CompanySignature;
  currency: string;
}) {
  const { t, isAr, T, Row, Card, Field, TitleBlock, CompanySignatureBlock } = k;
  const p = t.pdfDocs.payslip;
  const run = item.payrollRun;
  const period = fmtMonth(run.year, run.month, isAr);
  const earnings = EARNINGS.reduce((sum, key) => sum + num(item[key]), 0);
  const deductions = DEDUCTIONS.reduce((sum, key) => sum + num(item[key]), 0);
  const range = (from?: string | null, to?: string | null) =>
    from && to
      ? `${fmtDate(from.slice(0, 10), isAr)} – ${fmtDate(to.slice(0, 10), isAr)}`
      : null;
  const paidAt = typeof item.paidAt === "string" ? item.paidAt : null;
  const employerShare = num(item.gosiEmployer);

  return (
    <Page size="A4" style={pageStyle}>
      <Letterhead brand={brand} />
      <TitleBlock
        title={p.title}
        subtitle={formatMessage(p.subtitle, { period: period })}
        number={reference}
        facts={[
          ...(run.payDate
            ? ([[p.payDate, fmtDate(run.payDate.slice(0, 10), isAr)]] as Array<
                [string, string]
              >)
            : []),
          [t.pdfDocs.issuedOn, fmtDate(issuedAt, isAr)],
        ]}
      />

      <Row style={{ gap: 12, marginBottom: 14 }}>
        <EmployeeCard k={k} employee={employee} />
        <Card label={p.payDetails}>
          <Field
            label={p.payPeriod}
            value={range(run.periodStart, run.periodEnd) ?? period}
          />
          <Field
            label={p.paymentStatus}
            value={
              paidAt
                ? formatMessage(p.paid, { date: fmtDate(paidAt, isAr) })
                : p.unpaid
            }
            strong
          />
        </Card>
      </Row>

      <Row style={{ gap: 12, alignItems: "stretch" }}>
        <AmountTable
          k={k}
          title={p.earnings}
          keys={EARNINGS}
          item={item}
          total={earnings}
          totalLabel={p.totalEarnings}
          currency={currency}
          kind="addition"
        />
        <AmountTable
          k={k}
          title={p.deductions}
          keys={DEDUCTIONS}
          item={item}
          total={deductions}
          totalLabel={p.totalDeductions}
          currency={currency}
          kind="deduction"
        />
      </Row>

      <Row
        style={{
          marginTop: 12,
          backgroundColor: C.primary,
          borderRadius: 7,
          paddingVertical: 11,
          paddingHorizontal: 16,
          justifyContent: "space-between",
          alignItems: "center",
        }}
        wrap={false}
      >
        <T style={{ fontSize: 11, fontWeight: "bold", color: "#FFFFFF" }}>
          {p.netPay}
        </T>
        <T style={{ fontSize: 15, fontWeight: "bold", color: "#FFFFFF" }}>
          {fmtMoney(num(item.netSalary), currency, isAr)}
        </T>
      </Row>
      {employerShare > 0 ? (
        <T style={{ fontSize: 7, color: C.muted, marginTop: 5 }}>
          {formatMessage(p.employerContribution, { amount: fmtMoney(employerShare, currency, isAr) })}
        </T>
      ) : null}

      <Row
        style={{
          justifyContent: "space-between",
          alignItems: "flex-end",
          marginTop: 22,
        }}
        wrap={false}
      >
        <View style={{ maxWidth: 240 }}>
          <T style={{ fontSize: 7.5, fontWeight: "bold", color: C.primary }}>
            {t.pdfDocs.confidential}
          </T>
          <T style={{ fontSize: 7, color: C.muted, marginTop: 2 }}>
            {p.footnote}
          </T>
        </View>
        <CompanySignatureBlock brand={brand} signing={signing} />
      </Row>
      <k.Footer brand={brand} reference={reference} />
    </Page>
  );
}

function CertificatePage({
  k,
  brand,
  employee,
  compensation,
  reference,
  issuedAt,
  signing,
  currency,
}: {
  k: DocKit;
  brand: PdfBrand;
  employee: Snapshot["employee"];
  compensation: Record<string, unknown>;
  reference: string;
  issuedAt: Date | null;
  signing: CompanySignature;
  currency: string;
}) {
  const { t, isAr, T, Row, Field, Paragraph, CompanySignatureBlock } = k;
  const h = t.hrExtensions;
  const c = t.pdfDocs.certificate;
  const p = t.pdfDocs.payslip;
  const company = brand.company;
  const name = isAr
    ? `${employee.firstNameAr} ${employee.lastNameAr}`
    : `${employee.firstNameEn} ${employee.lastNameEn}`;
  const gross = [
    "basicSalary",
    "housingAllowance",
    "transportAllowance",
    "otherAllowances",
  ].reduce((sum, key) => sum + num(compensation[key]), 0);
  return (
    <Page size="A4" style={pageStyle}>
      <Letterhead brand={brand} />
      <Row style={{ justifyContent: "space-between", marginBottom: 26 }}>
        <Field label={c.reference} value={reference} strong />
        <Field label={c.date} value={fmtDate(issuedAt, isAr)} strong />
      </Row>

      <T
        align="center"
        style={{ fontSize: 20, fontWeight: "bold", color: C.primary }}
      >
        {c.title}
      </T>
      <View
        style={{
          alignSelf: "center",
          width: 60,
          height: 2,
          backgroundColor: C.accent,
          marginTop: 14,
          marginBottom: 26,
        }}
      />

      <T style={{ fontSize: 10.5, fontWeight: "bold", marginBottom: 12 }}>
        {h.toWhom}
      </T>
      {/* A certificate states the total gross salary only — no breakdown. */}
      <Paragraph>
        {formatMessage(h.certificateParagraph, { name: name, number: employee.employeeNumber, company: isAr ? company.company_name_ar : company.company_name_en, hireDate: fmtDate(employee.hireDate, isAr), title: isAr ? employee.jobTitleAr : employee.jobTitleEn, gross: fmtNumber(gross, 3) })}
      </Paragraph>

      <View
        style={{
          marginVertical: 8,
          borderRadius: 6,
          borderWidth: 0.8,
          borderColor: C.line,
          overflow: "hidden",
        }}
        wrap={false}
      >
        {[
          [p.employee, name],
          [p.employeeNo, employee.employeeNumber],
          [p.position, isAr ? employee.jobTitleAr : employee.jobTitleEn],
          ...((isAr ? employee.departmentAr : employee.departmentEn)
            ? [
                [
                  p.department,
                  (isAr
                    ? employee.departmentAr
                    : employee.departmentEn) as string,
                ],
              ]
            : []),
          [p.hireDate, fmtDate(employee.hireDate, isAr)],
          [h.grossSalary, fmtMoney(gross, currency, isAr)],
        ].map(([label, value], index, all) => (
          <Row
            key={label}
            style={{
              paddingVertical: 6,
              paddingHorizontal: 12,
              borderTopWidth: index ? 0.6 : 0,
              borderTopColor: C.line,
              backgroundColor: index === all.length - 1 ? C.soft : "#FFFFFF",
            }}
          >
            <T style={{ width: 150, fontSize: 8.5, color: C.muted }}>{label}</T>
            <T
              style={{
                flex: 1,
                fontSize: 9,
                fontWeight: index === all.length - 1 ? "bold" : "normal",
              }}
            >
              {value}
            </T>
          </Row>
        ))}
      </View>

      <Paragraph style={{ marginTop: 12 }}>{h.certificateClosing}</Paragraph>
      <T style={{ fontSize: 7.5, color: C.muted }}>{c.validity}</T>

      <Row style={{ justifyContent: "flex-end", marginTop: 34 }} wrap={false}>
        <CompanySignatureBlock brand={brand} signing={signing} />
      </Row>
      <k.Footer brand={brand} reference={reference} />
    </Page>
  );
}

export async function generateSalaryDocumentPdf(
  document: {
    id: string;
    kind: string;
    snapshot: unknown;
    issuedAt: Date | null;
    reviewedById?: string | null;
  },
  company: CompanySettings,
  locale: "en" | "ar",
) {
  const snapshot = document.snapshot as Snapshot;
  if (!snapshot?.employee) throw new Error(serverMessages.documentHasNoIssuedSnapshot);
  const [brand, signing] = await Promise.all([
    resolvePdfBrand(company),
    salarySignatory(
      document.id,
      document.reviewedById ?? null,
      document.issuedAt,
      company,
      locale,
    ),
  ]);
  const reference = documentReference(
    document.kind,
    document.id,
    document.issuedAt,
  );
  const currency = company.default_currency || "BHD";
  const k = docKit(locale);
  const element = (
    <Document
      title={reference}
      author={company.company_name_en}
      language={locale}
    >
      {document.kind === "payslip" ? (
        (snapshot.items ?? []).map((item, index) => (
          <PayslipPage
            k={k}
            key={index}
            brand={brand}
            item={item}
            employee={snapshot.employee}
            reference={reference}
            issuedAt={document.issuedAt}
            signing={signing}
            currency={currency}
          />
        ))
      ) : (
        <CertificatePage
          k={k}
          brand={brand}
          employee={snapshot.employee}
          compensation={snapshot.compensation ?? {}}
          reference={reference}
          issuedAt={document.issuedAt}
          signing={signing}
          currency={currency}
        />
      )}
    </Document>
  );
  return Buffer.from(await renderToBuffer(element));
}

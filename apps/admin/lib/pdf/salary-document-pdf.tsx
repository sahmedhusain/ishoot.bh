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

type PayslipItem = Record<string, unknown> & {
  payrollRun: { year: number; month: number; status: string; periodStart?: string; periodEnd?: string; attendanceStart?: string | null; attendanceEnd?: string | null; payDate?: string | null };
  attendanceSummary?: {
    workingDays?: number;
    presentDays?: number;
    absentDays?: number;
    halfDays?: number;
    lateMinutes?: number;
    overtime?: Record<string, number>;
    leave?: Record<string, { days: number; unpaidDays: number }>;
  } | null;
};

const EARNINGS = ["basicSalary", "housingAllowance", "transportAllowance", "otherAllowances", "overtimePay", "shiftAllowance", "commission", "bonus"] as const;
const DEDUCTIONS = ["gosiEmployee", "absenceDeduction", "leaveDeduction", "latenessDeduction", "otherDeductions"] as const;
const ALWAYS_SHOWN = new Set(["basicSalary", "gosiEmployee"]);

const num = (value: unknown) => Number(value || 0);

/** A short, stable reference printed on the document and its footer. */
function documentReference(kind: string, id: string, issuedAt: Date | null) {
  return `${kind === "payslip" ? "PS" : "SC"}-${(issuedAt ?? new Date()).getUTCFullYear()}-${id.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

/** The HR approver signs; without a personal signature on file the company's signatory signs instead. */
async function salarySignatory(reviewedById: string | null, issuedAt: Date | null, company: CompanySettings, locale: "en" | "ar"): Promise<CompanySignature> {
  const reviewer = reviewedById
    ? await db.user.findUnique({ where: { id: reviewedById }, select: { fullName: true, signatureUrl: true, employee: { select: { jobTitleEn: true, jobTitleAr: true, firstNameEn: true, lastNameEn: true, firstNameAr: true, lastNameAr: true } } } })
    : null;
  const own = reviewer?.signatureUrl ? await resolveConfiguredPdfAsset(reviewer.signatureUrl) : undefined;
  if (reviewer && own)
    return {
      signatureSrc: own,
      signerName: reviewer.employee
        ? locale === "ar" ? `${reviewer.employee.firstNameAr} ${reviewer.employee.lastNameAr}` : `${reviewer.employee.firstNameEn} ${reviewer.employee.lastNameEn}`
        : reviewer.fullName,
      signerTitle: locale === "ar" ? reviewer.employee?.jobTitleAr : reviewer.employee?.jobTitleEn,
      signedAt: issuedAt?.toISOString() ?? null,
    };
  return {
    signatureSrc: (await resolveConfiguredPdfAsset(company.signature_url)) ?? null,
    signerName: (locale === "ar" ? company.ceo_name_ar : company.ceo_name_en) || null,
    signerTitle: (locale === "ar" ? company.ceo_title_ar : company.ceo_title_en) || null,
    signedAt: issuedAt?.toISOString() ?? null,
  };
}

function EmployeeCard({ k, employee }: { k: DocKit; employee: Snapshot["employee"] }) {
  const { t, isAr, T, Card, Field } = k;
  const p = t.pdfDocs.payslip;
  return (
    <Card label={p.employee}>
      <T style={{ fontSize: 10.5, fontWeight: "bold" }}>{isAr ? `${employee.firstNameAr} ${employee.lastNameAr}` : `${employee.firstNameEn} ${employee.lastNameEn}`}</T>
      <Field label={p.employeeNo} value={employee.employeeNumber} strong />
      <Field label={p.position} value={isAr ? employee.jobTitleAr : employee.jobTitleEn} />
      <Field label={p.department} value={isAr ? employee.departmentAr : employee.departmentEn} />
      <Field label={p.hireDate} value={fmtDate(employee.hireDate, isAr)} />
    </Card>
  );
}

function AmountTable({ k, title, keys, item, total, totalLabel, currency }: { k: DocKit; title: string; keys: readonly string[]; item: PayslipItem; total: number; totalLabel: string; currency: string }) {
  const { t, isAr, T, Row } = k;
  const lines = t.pdfDocs.payslip.lines as Record<string, string>;
  const rows = keys.filter((key) => ALWAYS_SHOWN.has(key) || num(item[key]) !== 0);
  return (
    <View style={{ flex: 1, borderRadius: 6, overflow: "hidden", borderWidth: 0.8, borderColor: C.line }}>
      <Row style={{ backgroundColor: C.primary, paddingVertical: 6, paddingHorizontal: 10, justifyContent: "space-between" }}>
        <T style={{ color: "#FFFFFF", fontSize: 8, fontWeight: "bold" }}>{title}</T>
        <T style={{ color: "#FFFFFF", fontSize: 8, fontWeight: "bold" }}>{t.pdfDocs.payslip.amount}</T>
      </Row>
      {rows.map((key, index) => (
        <Row key={key} style={{ justifyContent: "space-between", paddingVertical: 5.5, paddingHorizontal: 10, borderTopWidth: index ? 0.6 : 0, borderTopColor: C.line }}>
          <T style={{ fontSize: 8.5, color: C.body }}>{lines[key]}</T>
          <T style={{ fontSize: 8.5 }}>{fmtMoney(num(item[key]), currency, isAr)}</T>
        </Row>
      ))}
      <View style={{ flexGrow: 1 }} />
      <Row style={{ justifyContent: "space-between", paddingVertical: 6.5, paddingHorizontal: 10, backgroundColor: C.soft, borderTopWidth: 0.8, borderTopColor: C.line }}>
        <T style={{ fontSize: 8.5, fontWeight: "bold" }}>{totalLabel}</T>
        <T style={{ fontSize: 8.5, fontWeight: "bold" }}>{fmtMoney(total, currency, isAr)}</T>
      </Row>
    </View>
  );
}

function Stat({ k, label, value }: { k: DocKit; label: string; value: string }) {
  const { T } = k;
  return (
    <View style={{ flex: 1, alignItems: "center", paddingVertical: 7, paddingHorizontal: 4, backgroundColor: C.soft, borderRadius: 5 }}>
      <T align="center" style={{ fontSize: 12, fontWeight: "bold", color: C.primary }}>{value}</T>
      <T align="center" style={{ fontSize: 6.8, color: C.muted, marginTop: 1 }}>{label}</T>
    </View>
  );
}

function PayslipPage({ k, brand, item, employee, reference, issuedAt, signing, currency }: { k: DocKit; brand: PdfBrand; item: PayslipItem; employee: Snapshot["employee"]; reference: string; issuedAt: Date | null; signing: CompanySignature; currency: string }) {
  const { t, isAr, T, Row, Card, Field, TitleBlock, SectionTitle, CompanySignatureBlock } = k;
  const p = t.pdfDocs.payslip;
  const run = item.payrollRun;
  const period = fmtMonth(run.year, run.month, isAr);
  const earnings = EARNINGS.reduce((sum, key) => sum + num(item[key]), 0);
  const deductions = DEDUCTIONS.reduce((sum, key) => sum + num(item[key]), 0);
  const summary = item.attendanceSummary;
  const overtimeHours = summary?.overtime ? Object.values(summary.overtime).reduce((a, b) => a + num(b), 0) : 0;
  const leave = summary?.leave ? Object.values(summary.leave) : [];
  const range = (from?: string | null, to?: string | null) => (from && to ? `${fmtDate(from.slice(0, 10), isAr)} – ${fmtDate(to.slice(0, 10), isAr)}` : null);
  const paidAt = typeof item.paidAt === "string" ? item.paidAt : null;
  const employerShare = num(item.gosiEmployer);

  return (
    <Page size="A4" style={pageStyle}>
      <Letterhead brand={brand} />
      <TitleBlock
        title={p.title}
        subtitle={p.subtitle.replace("{period}", period)}
        number={reference}
        facts={[
          ...(run.payDate ? ([[p.payDate, fmtDate(run.payDate.slice(0, 10), isAr)]] as Array<[string, string]>) : []),
          [t.pdfDocs.issuedOn, fmtDate(issuedAt, isAr)],
        ]}
      />

      <Row style={{ gap: 12, marginBottom: 14 }}>
        <EmployeeCard k={k} employee={employee} />
        <Card label={p.payDetails}>
          <Field label={p.payPeriod} value={range(run.periodStart, run.periodEnd) ?? period} />
          <Field label={p.attendancePeriod} value={range(run.attendanceStart, run.attendanceEnd)} />
          <Field label={p.paymentStatus} value={paidAt ? p.paid.replace("{date}", fmtDate(paidAt, isAr)) : p.unpaid} strong />
        </Card>
      </Row>

      <Row style={{ gap: 12, alignItems: "stretch" }}>
        <AmountTable k={k} title={p.earnings} keys={EARNINGS} item={item} total={earnings} totalLabel={p.totalEarnings} currency={currency} />
        <AmountTable k={k} title={p.deductions} keys={DEDUCTIONS} item={item} total={deductions} totalLabel={p.totalDeductions} currency={currency} />
      </Row>

      <Row style={{ marginTop: 12, backgroundColor: C.primary, borderRadius: 7, paddingVertical: 11, paddingHorizontal: 16, justifyContent: "space-between", alignItems: "center" }} wrap={false}>
        <T style={{ fontSize: 11, fontWeight: "bold", color: "#FFFFFF" }}>{p.netPay}</T>
        <T style={{ fontSize: 15, fontWeight: "bold", color: "#FFFFFF" }}>{fmtMoney(num(item.netSalary), currency, isAr)}</T>
      </Row>
      {employerShare > 0 ? <T style={{ fontSize: 7, color: C.muted, marginTop: 5 }}>{p.employerContribution.replace("{amount}", fmtMoney(employerShare, currency, isAr))}</T> : null}

      {summary ? (
        <View style={{ marginTop: 14 }} wrap={false}>
          <SectionTitle>{p.attendance}</SectionTitle>
          <Row style={{ gap: 6 }}>
            <Stat k={k} label={p.workingDays} value={fmtNumber(num(summary.workingDays))} />
            <Stat k={k} label={p.presentDays} value={fmtNumber(num(summary.presentDays))} />
            <Stat k={k} label={p.absentDays} value={fmtNumber(num(summary.absentDays))} />
            <Stat k={k} label={p.halfDays} value={fmtNumber(num(summary.halfDays))} />
            <Stat k={k} label={p.lateMinutes} value={fmtNumber(num(summary.lateMinutes))} />
            <Stat k={k} label={p.overtimeHours} value={fmtNumber(overtimeHours, overtimeHours % 1 ? 1 : 0)} />
            <Stat k={k} label={p.leaveDays} value={fmtNumber(leave.reduce((a, l) => a + num(l.days), 0), 1).replace(/\.0$/, "")} />
            <Stat k={k} label={p.unpaidLeaveDays} value={fmtNumber(leave.reduce((a, l) => a + num(l.unpaidDays), 0), 1).replace(/\.0$/, "")} />
          </Row>
        </View>
      ) : null}

      <Row style={{ justifyContent: "space-between", alignItems: "flex-end", marginTop: 22 }} wrap={false}>
        <View style={{ maxWidth: 240 }}>
          <T style={{ fontSize: 7.5, fontWeight: "bold", color: C.primary }}>{t.pdfDocs.confidential}</T>
          <T style={{ fontSize: 7, color: C.muted, marginTop: 2 }}>{p.footnote}</T>
        </View>
        <CompanySignatureBlock brand={brand} signing={signing} />
      </Row>
      <k.Footer brand={brand} reference={reference} />
    </Page>
  );
}

function CertificatePage({ k, brand, employee, compensation, reference, issuedAt, signing, currency }: { k: DocKit; brand: PdfBrand; employee: Snapshot["employee"]; compensation: Record<string, unknown>; reference: string; issuedAt: Date | null; signing: CompanySignature; currency: string }) {
  const { t, isAr, T, Row, Field, Paragraph, CompanySignatureBlock } = k;
  const h = t.hrExtensions;
  const c = t.pdfDocs.certificate;
  const p = t.pdfDocs.payslip;
  const company = brand.company;
  const name = isAr ? `${employee.firstNameAr} ${employee.lastNameAr}` : `${employee.firstNameEn} ${employee.lastNameEn}`;
  const gross = ["basicSalary", "housingAllowance", "transportAllowance", "otherAllowances"].reduce((sum, key) => sum + num(compensation[key]), 0);
  return (
    <Page size="A4" style={pageStyle}>
      <Letterhead brand={brand} />
      <Row style={{ justifyContent: "space-between", marginBottom: 26 }}>
        <Field label={c.reference} value={reference} strong />
        <Field label={c.date} value={fmtDate(issuedAt, isAr)} strong />
      </Row>

      <T align="center" style={{ fontSize: 20, fontWeight: "bold", color: C.primary }}>{c.title}</T>
      <View style={{ alignSelf: "center", width: 60, height: 2, backgroundColor: C.accent, marginTop: 14, marginBottom: 26 }} />

      <T style={{ fontSize: 10.5, fontWeight: "bold", marginBottom: 12 }}>{h.toWhom}</T>
      {/* A certificate states the total gross salary only — no breakdown. */}
      <Paragraph>
        {h.certificateParagraph
          .replace("{name}", name)
          .replace("{number}", employee.employeeNumber)
          .replace("{company}", isAr ? company.company_name_ar : company.company_name_en)
          .replace("{hireDate}", fmtDate(employee.hireDate, isAr))
          .replace("{title}", isAr ? employee.jobTitleAr : employee.jobTitleEn)
          .replace("{gross}", fmtNumber(gross, 3))}
      </Paragraph>

      <View style={{ marginVertical: 8, borderRadius: 6, borderWidth: 0.8, borderColor: C.line, overflow: "hidden" }} wrap={false}>
        {[
          [p.employee, name],
          [p.employeeNo, employee.employeeNumber],
          [p.position, isAr ? employee.jobTitleAr : employee.jobTitleEn],
          ...(isAr ? employee.departmentAr : employee.departmentEn) ? [[p.department, (isAr ? employee.departmentAr : employee.departmentEn) as string]] : [],
          [p.hireDate, fmtDate(employee.hireDate, isAr)],
          [h.grossSalary, fmtMoney(gross, currency, isAr)],
        ].map(([label, value], index, all) => (
          <Row key={label} style={{ paddingVertical: 6, paddingHorizontal: 12, borderTopWidth: index ? 0.6 : 0, borderTopColor: C.line, backgroundColor: index === all.length - 1 ? C.soft : "#FFFFFF" }}>
            <T style={{ width: 150, fontSize: 8.5, color: C.muted }}>{label}</T>
            <T style={{ flex: 1, fontSize: 9, fontWeight: index === all.length - 1 ? "bold" : "normal" }}>{value}</T>
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
  document: { id: string; kind: string; snapshot: unknown; issuedAt: Date | null; reviewedById?: string | null },
  company: CompanySettings,
  locale: "en" | "ar",
) {
  const snapshot = document.snapshot as Snapshot;
  if (!snapshot?.employee) throw new Error("Document has no issued snapshot");
  const [brand, signing] = await Promise.all([resolvePdfBrand(company), salarySignatory(document.reviewedById ?? null, document.issuedAt, company, locale)]);
  const reference = documentReference(document.kind, document.id, document.issuedAt);
  const currency = company.default_currency || "BHD";
  const k = docKit(locale);
  const element = (
    <Document title={reference} author={company.company_name_en} language={locale}>
        {document.kind === "payslip" ? (
          (snapshot.items ?? []).map((item, index) => (
            <PayslipPage k={k} key={index} brand={brand} item={item} employee={snapshot.employee} reference={reference} issuedAt={document.issuedAt} signing={signing} currency={currency} />
          ))
        ) : (
          <CertificatePage k={k} brand={brand} employee={snapshot.employee} compensation={snapshot.compensation ?? {}} reference={reference} issuedAt={document.issuedAt} signing={signing} currency={currency} />
        )}
    </Document>
  );
  return Buffer.from(await renderToBuffer(element));
}

/* eslint-disable jsx-a11y/alt-text -- React PDF images are PDF primitives. */
import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  Image,
  renderToBuffer,
} from "@react-pdf/renderer";
import { getTranslations } from "@ishoot/locales";
import type { CompanySettings } from "@ishoot/database/types";
import { pdfStyles as styles } from "./shared-styles";
import { resolveConfiguredPdfAsset } from "./configured-asset";

export async function generateSalaryDocumentPdf(
  document: {
    id: string;
    kind: string;
    snapshot: unknown;
    issuedAt: Date | null;
  },
  company: CompanySettings,
  locale: "en" | "ar",
) {
  const h = getTranslations(locale).admin.hrExtensions;
  const snapshot = document.snapshot as {
    employee: {
      employeeNumber: string;
      firstNameEn: string;
      lastNameEn: string;
      firstNameAr: string;
      lastNameAr: string;
      jobTitleEn: string;
      jobTitleAr: string;
      hireDate: string;
    };
    compensation?: Record<string, unknown>;
    items?: Array<
      Record<string, unknown> & {
        payrollRun: { year: number; month: number; status: string };
      }
    >;
  };
  if (!snapshot?.employee) throw new Error("Document has no issued snapshot");
  const logo = company.logo_url
    ? await resolveConfiguredPdfAsset(company.logo_url)
    : null;
  const signature = company.signature_url
    ? await resolveConfiguredPdfAsset(company.signature_url)
    : null;
  const stamp = company.stamp_url
    ? await resolveConfiguredPdfAsset(company.stamp_url)
    : null;
  const employee = snapshot.employee;
  const name =
    locale === "ar"
      ? `${employee.firstNameAr} ${employee.lastNameAr}`
      : `${employee.firstNameEn} ${employee.lastNameEn}`;
  const rows: Array<Record<string, unknown>> =
    document.kind === "payslip"
      ? snapshot.items || []
      : [
          {
            ...snapshot.compensation,
            grossSalary: [
              "basicSalary",
              "housingAllowance",
              "transportAllowance",
              "otherAllowances",
            ].reduce(
              (sum, key) => sum + Number(snapshot.compensation?.[key] || 0),
              0,
            ),
          },
        ];
  const labels = [
    "basicSalary",
    "housingAllowance",
    "transportAllowance",
    "otherAllowances",
    "grossSalary",
    "gosiEmployee",
    "otherDeductions",
    "netSalary",
  ] as const;
  const element = (
    <Document>
      {rows.map((row, index) => (
        <Page
          key={index}
          size="A4"
          style={[
            styles.page,
            { textAlign: locale === "ar" ? "right" : "left" },
          ]}
        >
          <View style={styles.headerBanner}>
            <View>
              {logo && (
                <Image
                  src={logo}
                  style={{ width: 100, height: 35, objectFit: "contain" }}
                />
              )}
              <Text style={styles.companySubtitle}>
                {locale === "ar"
                  ? company.company_name_ar
                  : company.company_name_en}
              </Text>
            </View>
            <View>
              <Text style={styles.docMainTitle}>
                {document.kind === "payslip" ? h.payslip : h.salary_certificate}
              </Text>
              <Text style={styles.docNumber}>{employee.employeeNumber}</Text>
            </View>
          </View>
          <View style={styles.metaGrid}>
            <View style={styles.metaCard}>
              <Text style={styles.metaLabel}>{h.name}</Text>
              <Text style={styles.metaValue}>{name}</Text>
              <Text style={styles.metaSub}>
                {locale === "ar" ? employee.jobTitleAr : employee.jobTitleEn}
              </Text>
              <Text style={styles.metaSub}>
                {h.hireDate}: {employee.hireDate.slice(0, 10)}
              </Text>
            </View>
            <View style={styles.metaCard}>
              <Text style={styles.metaLabel}>{h.issuedAt}</Text>
              <Text>{document.issuedAt?.toISOString().slice(0, 10)}</Text>
              {"payrollRun" in row && (
                <Text>
                  {h.period}:{" "}
                  {
                    (row as NonNullable<typeof snapshot.items>[number])
                      .payrollRun.year
                  }
                  -
                  {String(
                    (row as NonNullable<typeof snapshot.items>[number])
                      .payrollRun.month,
                  ).padStart(2, "0")}
                </Text>
              )}
            </View>
          </View>
          {document.kind === "salary_certificate" ? (
            // A certificate states the total gross salary only — no breakdown.
            <View style={{ marginTop: 12, marginBottom: 24 }}>
              <Text style={{ fontWeight: 700, marginBottom: 14 }}>{h.toWhom}</Text>
              <Text style={{ lineHeight: 1.7, marginBottom: 14 }}>
                {h.certificateParagraph
                  .replace("{name}", name)
                  .replace("{number}", employee.employeeNumber)
                  .replace("{company}", locale === "ar" ? company.company_name_ar : company.company_name_en)
                  .replace("{hireDate}", employee.hireDate.slice(0, 10))
                  .replace("{title}", locale === "ar" ? employee.jobTitleAr : employee.jobTitleEn)
                  .replace("{gross}", Number(row.grossSalary || 0).toFixed(3))}
              </Text>
              <Text style={{ lineHeight: 1.7 }}>{h.certificateClosing}</Text>
            </View>
          ) : (
          <View style={styles.table}>
            {labels.map((key) => (
              <View key={key} style={styles.tableRow}>
                <Text style={styles.colDesc}>{h[key as keyof typeof h]}</Text>
                <Text style={styles.colTotal}>
                  {Number(row[key] || 0).toFixed(3)} BHD
                </Text>
              </View>
            ))}
          </View>
          )}
          <View style={styles.signatureContainer}>
            {signature && (
              <Image src={signature} style={styles.signatureImage} />
            )}
            {stamp && <Image src={stamp} style={styles.stampImage} />}
          </View>
          <View style={styles.footer}>
            <Text>{document.id}</Text>
            <Text>
              {locale === "ar"
                ? company.company_name_ar
                : company.company_name_en}
            </Text>
          </View>
        </Page>
      ))}
    </Document>
  );
  return Buffer.from(await renderToBuffer(element));
}

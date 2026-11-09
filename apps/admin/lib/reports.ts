import {
  REPORTS,
  buildXlsx,
  db,
  getEffectivePermissions,
  isFeatureEnabled,
  type ReportDefinition,
  type ReportResult,
} from "@platform/database";
import { formatMessage, getTranslations } from "@platform/locales";
import type { CompanySettings } from "@platform/database/types";
import { generateReportPdf } from "./pdf/report-pdf";

type Admin = ReturnType<typeof getTranslations>["admin"];

export function reportLabels(t: Admin) {
  const labels: Record<string, string> = { ...t.reports.labels };
  for (const [k, v] of Object.entries(t.orders.channels))
    labels[`channel_${k}`] = v;
  for (const [k, v] of Object.entries(t.orders.statuses))
    labels[`status_${k}`] = v;
  for (const [k, v] of Object.entries(
    t.procurement.statuses as Record<string, string>,
  ))
    labels[`po_${k}`] = v;
  for (const [k, v] of Object.entries(t.marketing.campaigns.channels))
    labels[`campaign_${k}`] = v;
  return labels;
}

export async function reportsFor(
  role: string,
  overrides: Record<string, boolean> | null,
) {
  const permissions = await getEffectivePermissions(role, overrides);
  const allowed: ReportDefinition[] = [];
  for (const report of REPORTS) {
    if (!permissions[`${report.resource}:read`]) continue;
    if (report.module && !(await isFeatureEnabled(report.module))) continue;
    allowed.push(report);
  }
  return allowed;
}

export async function reportsForUser(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { role: true, permissions: true },
  });
  return user
    ? reportsFor(
        user.role,
        (user.permissions as Record<string, boolean> | null) ?? null,
      )
    : [];
}

const csvCell = (value: unknown) => {
  let text = value == null ? "" : String(value);
  if (typeof value === "string" && /^[\s]*[=+@-]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
};

export async function exportReport(
  result: ReportResult,
  format: string,
  locale: "en" | "ar",
  company: CompanySettings,
) {
  const t = getTranslations(locale).admin;
  const copy = t.reports;
  const title = (copy.catalog as Record<string, { title: string }>)[
    result.definition.key
  ].title;
  const header = result.definition.columns.map(
    (c) => (copy.columns as Record<string, string>)[c.key] ?? c.key,
  );
  const rows = result.rows.map((r) =>
    result.definition.columns.map((c) => r[c.key] ?? null),
  );
  const totalsRow = result.definition.columns.map((c, i) =>
    i === 0 ? copy.view.total : (result.totals[c.key] ?? null),
  );
  const period = result.definition.ranged
    ? formatMessage(copy.view.period, { from: result.from, to: result.to })
    : copy.view.snapshot;
  const base = `${result.definition.key}-${result.definition.ranged ? `${result.from}_${result.to}` : result.to}`;
  if (format === "xlsx") {
    return {
      body: buildXlsx(title, header, [...rows, totalsRow], locale === "ar"),
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      name: `${base}.xlsx`,
    };
  }
  if (format === "pdf") {
    return {
      body: await generateReportPdf(
        {
          title,
          period,
          header,
          rows,
          totals: totalsRow,
          kinds: result.definition.columns.map((c) => c.kind),
          currency: company.default_currency,
        },
        company,
        locale,
      ),
      type: "application/pdf",
      name: `${base}.pdf`,
    };
  }
  const lines = [header, ...rows, totalsRow].map((r) =>
    r.map(csvCell).join(","),
  );
  return {
    body: Buffer.from(`﻿${lines.join("\r\n")}`, "utf8"),
    type: "text/csv; charset=utf-8",
    name: `${base}.csv`,
  };
}

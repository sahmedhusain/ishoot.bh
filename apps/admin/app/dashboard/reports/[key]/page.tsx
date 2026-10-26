import { notFound } from "next/navigation";
import { getTranslations } from "@platform/locales";
import { listReportSchedules, runReport } from "@platform/database";
import { requireAuth } from "../../../../lib/auth";
import { getCachedCompanySettings } from "../../../../lib/cached-queries";
import { reportLabels, reportsForUser } from "../../../../lib/reports";
import { reportPeriod } from "../../../../lib/report-params";
import { ReportView } from "../../../../components/reports/ReportView";

export const dynamic = "force-dynamic";

export default async function ReportPage({ params, searchParams }: { params: Promise<{ key: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireAuth();
  const { key } = await params;
  if (!(await reportsForUser(user.id)).some((r) => r.key === key)) notFound();
  const query = await searchParams;
  const text = (k: string) => (typeof query[k] === "string" ? (query[k] as string) : null);
  // The admin language lives in the browser; the view asks again in it when it differs.
  const locale = text("locale") === "en" ? "en" : "ar";
  const compare = text("compare") === "1";
  const [result, schedules, company] = await Promise.all([
    runReport(key, { ...reportPeriod({ from: text("from"), to: text("to") }), locale, labels: reportLabels(getTranslations(locale).admin), compare }),
    listReportSchedules(key, user.id),
    getCachedCompanySettings(),
  ]);
  return <ReportView result={result} locale={locale} compare={compare} schedules={schedules} currency={company.default_currency} today={new Date().toISOString().slice(0, 10)} />;
}

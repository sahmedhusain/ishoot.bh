import {
  dueReportSchedules,
  markReportScheduleRun,
  runReport,
  scheduledPeriod,
  type ReportFrequency,
} from "@platform/database";
import { formatMessage, getTranslations } from "@platform/locales";
import { sendEmail } from "@platform/email";
import { getCachedCompanySettings } from "./cached-queries";
import { exportReport, reportLabels, reportsFor } from "./reports";

/**
 * Sends the scheduled reports that are due (the scheduled job): each covers the day, week or month that just ended,
 * with what its owner may see today. A schedule whose owner lost access or left stops quietly with an error noted.
 */
export async function deliverReportSchedules(now = new Date()) {
  const due = await dueReportSchedules(now);
  const company = await getCachedCompanySettings();
  let sent = 0;
  for (const schedule of due) {
    const owner = schedule.owner;
    const allowed =
      owner && owner.isActive && !owner.archivedAt
        ? await reportsFor(
            owner.role,
            (owner.permissions as Record<string, boolean> | null) ?? null,
          )
        : [];
    if (!allowed.some((r) => r.key === schedule.reportKey)) {
      await markReportScheduleRun(
        schedule.id,
        schedule.frequency,
        { error: "no_access" },
        now,
      );
      continue;
    }
    const locale = schedule.locale === "en" ? "en" : "ar";
    const t = getTranslations(locale).admin;
    const result = await runReport(schedule.reportKey, {
      ...scheduledPeriod(schedule.frequency as ReportFrequency, now),
      locale,
      labels: reportLabels(t),
      compare: schedule.compare,
    });
    const file = await exportReport(result, schedule.format, locale, company);
    const title = (t.reports.catalog as Record<string, { title: string }>)[
      schedule.reportKey
    ].title;
    const period = formatMessage(t.reports.view.period, {
      from: result.from,
      to: result.to,
    });
    const delivery = await sendEmail({
      to: schedule.recipients,
      subject: formatMessage(t.reports.schedules.emailSubject, {
        report: title,
        period,
      }),
      html: `<p>${formatMessage(t.reports.schedules.emailBody, { report: title, period })}</p>`,
      attachments: [{ filename: file.name, content: file.body }],
      idempotencyKey: `report:${schedule.id}:${result.from}:${result.to}`,
    }).catch(() => null);
    await markReportScheduleRun(
      schedule.id,
      schedule.frequency,
      delivery?.success ? {} : { error: "not_sent" },
      now,
    );
    if (delivery?.success) sent++;
  }
  return sent;
}

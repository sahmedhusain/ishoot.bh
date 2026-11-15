import { isValidEmail } from "../constants/validation";
import { serverMessages } from "@platform/locales";
import { listTableRows, upsertTableRow } from "../api/tables";
import {
  REPORT_FORMATS,
  REPORT_FREQUENCIES,
  nextScheduledRun,
  reportDefinition,
  type ReportFrequency,
} from "../constants/reports";

export async function listReportSchedules(reportKey: string, ownerId: string) {
  const allRows = await listTableRows<any>("system", "report_schedule", "created_at ASC");
  const rows = allRows.filter(
    (s) => s.reportKey === reportKey && s.ownerId === ownerId && s.isActive,
  );
  return rows.map((s) => ({
    id: s.id,
    frequency: s.frequency,
    format: s.format,
    recipients: s.recipients,
    locale: s.locale,
    compare: !!s.compare,
    next_run_at: new Date(s.nextRunAt || Date.now()).toISOString(),
    last_sent_at: s.lastSentAt ? new Date(s.lastSentAt).toISOString() : null,
    last_error: s.lastError ?? "",
  }));
}
export type ReportScheduleRecord = Awaited<
  ReturnType<typeof listReportSchedules>
>[number];

export interface ReportScheduleInput {
  reportKey: string;
  frequency: string;
  format: string;
  recipients: string;
  locale: string;
  compare: boolean;
}

export async function saveReportSchedule(
  input: ReportScheduleInput,
  ownerId: string,
  now = new Date(),
) {
  const recipients = Array.from(
    new Set(
      input.recipients
        .split(/[,;\s]+/)
        .map((r) => r.trim().toLowerCase())
        .filter(Boolean),
    ),
  );
  if (
    !reportDefinition(input.reportKey) ||
    !(REPORT_FREQUENCIES as readonly string[]).includes(input.frequency) ||
    !(REPORT_FORMATS as readonly string[]).includes(input.format) ||
    !recipients.length ||
    recipients.length > 20 ||
    recipients.some((r) => !isValidEmail(r))
  )
    throw new Error(serverMessages.reportScheduleInvalid);
  return upsertTableRow("system", "report_schedule", {
    id: crypto.randomUUID(),
    reportKey: input.reportKey,
    frequency: input.frequency,
    format: input.format,
    recipients,
    locale: input.locale === "en" ? "en" : "ar",
    compare: input.compare,
    ownerId,
    isActive: true,
    nextRunAt: nextScheduledRun(input.frequency as ReportFrequency, now).toISOString(),
  });
}

export async function stopReportSchedule(id: string, ownerId: string) {
  const rows = await listTableRows<any>("system", "report_schedule");
  for (const r of rows.filter((row) => row.id === id && row.ownerId === ownerId)) {
    await upsertTableRow("system", "report_schedule", { ...r, isActive: false });
  }
}

export async function dueReportSchedules(now = new Date()) {
  const [allRows, owners] = await Promise.all([
    listTableRows<any>("system", "report_schedule"),
    listTableRows<any>("identity", "user").catch(() => []),
  ]);
  const nowMs = now.getTime();
  const rows = allRows
    .filter((r) => r.isActive && new Date(r.nextRunAt || 0).getTime() <= nowMs)
    .slice(0, 50);
  const ownerMap = new Map<string, any>(owners.map((o): [any, any] => [o.id, o]));
  return rows.map((r) => ({
    ...r,
    owner: ownerMap.get(r.ownerId) ?? null,
  }));
}

export async function markReportScheduleRun(
  id: string,
  frequency: string,
  result: { error?: string },
  now = new Date(),
) {
  const rows = await listTableRows<any>("system", "report_schedule");
  const existing = rows.find((r) => r.id === id);
  if (!existing) return;
  await upsertTableRow("system", "report_schedule", {
    ...existing,
    id,
    nextRunAt: nextScheduledRun(frequency as ReportFrequency, now).toISOString(),
    ...(result.error
      ? { lastError: result.error.slice(0, 300) }
      : { lastSentAt: now.toISOString(), lastError: null }),
  });
}

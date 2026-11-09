import { isValidEmail } from "../constants/validation";
import { serverMessages } from "@platform/locales";
import { db } from "../atomic";
import {
  REPORT_FORMATS,
  REPORT_FREQUENCIES,
  nextScheduledRun,
  reportDefinition,
  type ReportFrequency,
} from "../constants/reports";

export async function listReportSchedules(reportKey: string, ownerId: string) {
  const rows = await db.reportSchedule.findMany({
    where: { reportKey, ownerId, isActive: true },
    orderBy: { createdAt: "asc" },
  });
  return rows.map((s) => ({
    id: s.id,
    frequency: s.frequency,
    format: s.format,
    recipients: s.recipients,
    locale: s.locale,
    compare: s.compare,
    next_run_at: s.nextRunAt.toISOString(),
    last_sent_at: s.lastSentAt?.toISOString() ?? null,
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
  return db.reportSchedule.create({
    data: {
      reportKey: input.reportKey,
      frequency: input.frequency,
      format: input.format,
      recipients,
      locale: input.locale === "en" ? "en" : "ar",
      compare: input.compare,
      ownerId,
      nextRunAt: nextScheduledRun(input.frequency as ReportFrequency, now),
    },
  });
}

export async function stopReportSchedule(id: string, ownerId: string) {
  await db.reportSchedule.updateMany({
    where: { id, ownerId },
    data: { isActive: false },
  });
}

export async function dueReportSchedules(now = new Date()) {
  const rows = await db.reportSchedule.findMany({
    where: { isActive: true, nextRunAt: { lte: now } },
    take: 50,
  });
  const owners = await db.user.findMany({
    where: { id: { in: rows.map((r) => r.ownerId) } },
    select: {
      id: true,
      role: true,
      isActive: true,
      archivedAt: true,
      permissions: true,
    },
  });
  return rows.map((r) => ({
    ...r,
    owner: owners.find((o) => o.id === r.ownerId) ?? null,
  }));
}

export async function markReportScheduleRun(
  id: string,
  frequency: string,
  result: { error?: string },
  now = new Date(),
) {
  await db.reportSchedule.update({
    where: { id },
    data: {
      nextRunAt: nextScheduledRun(frequency as ReportFrequency, now),
      ...(result.error
        ? { lastError: result.error.slice(0, 300) }
        : { lastSentAt: now, lastError: null }),
    },
  });
}

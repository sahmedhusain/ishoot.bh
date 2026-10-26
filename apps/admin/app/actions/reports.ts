"use server";
import { revalidatePath } from "next/cache";
import { serverMessages } from "@platform/locales";
import { createActivityLog, measureOperation, saveReportSchedule, stopReportSchedule, type ReportScheduleInput } from "@platform/database";
import { ROUTES } from "../../constants/routes";
import { getCurrentUser } from "../../lib/auth";
import { validateActionArguments } from "../../lib/action-input";
import { reportsForUser } from "../../lib/reports";

export async function saveReportScheduleAction(input: ReportScheduleInput) {
  return measureOperation("action:saveReportScheduleAction", async () => {
    const user = await getCurrentUser();
    if (!user) throw new Error(serverMessages.unauthorized);
    validateActionArguments("saveReportScheduleAction", { input });
    if (!(await reportsForUser(user.id)).some((r) => r.key === input.reportKey)) throw new Error(serverMessages.reportNotFound);
    const schedule = await saveReportSchedule(input, user.id);
    await createActivityLog({ user_id: user.id, action: "create", entity_type: "report_schedule", entity_id: schedule.id, details: { report: input.reportKey, frequency: input.frequency } });
    revalidatePath(ROUTES.reports.report(input.reportKey));
    return { success: true };
  });
}

export async function stopReportScheduleAction(id: string, reportKey: string) {
  return measureOperation("action:stopReportScheduleAction", async () => {
    const user = await getCurrentUser();
    if (!user) throw new Error(serverMessages.unauthorized);
    validateActionArguments("stopReportScheduleAction", { id, reportKey });
    await stopReportSchedule(id, user.id);
    revalidatePath(ROUTES.reports.report(reportKey));
    return { success: true };
  });
}

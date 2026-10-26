"use server";
import { ROUTES } from "../../constants/routes";
import { validateActionArguments } from "../../lib/action-input";
import {
  measureOperation,
  createActivityLog,
  updateHrPolicy,
  saveLeaveType,
  savePublicHoliday,
  deletePublicHoliday,
  saveShiftType,
  addLeaveAdjustment,
  saveAttendanceEntry,
  deleteAttendanceEntry,
  markMonthPresent,
  type HrPolicyRules,
} from "@platform/database";
import { requirePermission } from "../../lib/auth";
import { revalidatePath } from "next/cache";

function revalidateHr() {
  revalidatePath(ROUTES.hr.settings);
  revalidatePath(ROUTES.hr.attendance);
  revalidatePath(ROUTES.hr.leave());
  revalidatePath(ROUTES.hr.payroll());
}

/** Pay day, attendance cut-off, weekend, daily rate, overtime and lateness rules. */
export async function updateHrPolicyAction(policy: {
  salaryTiming: string;
  payDay: number;
  attendanceCutoffDay: number | null;
  weekendDays: number[];
  workdayHours: number;
  workdayStart: string;
  dailyRateBasis: string;
  deductionBase: string;
  overtimeBase: string;
  overtimeRate: number;
  overtimeNightRate: number;
  overtimeRestDayRate: number;
  overtimeHolidayRate: number;
  lateGraceMinutes: number;
  deductLateness: boolean;
  unmarkedDays: string;
  prorateJoiners: boolean;
  commissionInPayroll: boolean;
}) {
  validateActionArguments("updateHrPolicyAction", { policy });
  return measureOperation("action:updateHrPolicyAction", async () => {
    const actor = await requirePermission("payroll", "edit");
    const saved = await updateHrPolicy(policy as HrPolicyRules, actor.id);
    await createActivityLog({
      user_id: actor.id,
      action: "update",
      entity_type: "hr_policy",
      entity_id: "default",
      details: { ...saved },
    });
    revalidateHr();
    return saved;
  });
}

export async function saveLeaveTypeAction(input: {
  id?: string | null;
  code: string;
  nameEn: string;
  nameAr: string;
  payPercent: number;
  payTiers: { upToDays: number; percent: number }[] | null;
  accrual: string;
  daysAllowedPerYear: number;
  eligibleAfterMonths: number;
  maxCarryOverDays: number;
  maxDaysPerRequest: number | null;
  allowHalfDay: boolean;
  allowHours: boolean;
  countCalendarDays: boolean;
  requiresAttachment: boolean;
  isActive: boolean;
  sortOrder: number;
}) {
  validateActionArguments("saveLeaveTypeAction", { input });
  return measureOperation("action:saveLeaveTypeAction", async () => {
    const actor = await requirePermission("employees", "edit");
    const saved = await saveLeaveType({
      ...input,
      accrual: input.accrual as "annual" | "monthly" | "none",
    });
    await createActivityLog({
      user_id: actor.id,
      action: input.id ? "update" : "create",
      entity_type: "leave_type",
      entity_id: saved.id,
      details: { code: saved.code },
    });
    revalidateHr();
    return { id: saved.id };
  });
}

export async function savePublicHolidayAction(input: {
  id?: string | null;
  date: string;
  nameEn: string;
  nameAr: string;
}) {
  validateActionArguments("savePublicHolidayAction", { input });
  return measureOperation("action:savePublicHolidayAction", async () => {
    const actor = await requirePermission("employees", "edit");
    const saved = await savePublicHoliday(input);
    await createActivityLog({
      user_id: actor.id,
      action: input.id ? "update" : "create",
      entity_type: "public_holiday",
      entity_id: saved.id,
      details: { date: input.date },
    });
    revalidateHr();
    return { id: saved.id };
  });
}

export async function deletePublicHolidayAction(id: string) {
  validateActionArguments("deletePublicHolidayAction", { id });
  return measureOperation("action:deletePublicHolidayAction", async () => {
    const actor = await requirePermission("employees", "edit");
    await deletePublicHoliday(id);
    await createActivityLog({
      user_id: actor.id,
      action: "delete",
      entity_type: "public_holiday",
      entity_id: id,
    });
    revalidateHr();
    return { success: true };
  });
}

export async function saveShiftTypeAction(input: {
  id?: string | null;
  code: string;
  nameEn: string;
  nameAr: string;
  allowanceMode: string;
  allowanceValue: number;
  isActive: boolean;
}) {
  validateActionArguments("saveShiftTypeAction", { input });
  return measureOperation("action:saveShiftTypeAction", async () => {
    const actor = await requirePermission("payroll", "edit");
    const saved = await saveShiftType({
      ...input,
      allowanceMode: input.allowanceMode as "fixed" | "percent",
    });
    await createActivityLog({
      user_id: actor.id,
      action: input.id ? "update" : "create",
      entity_type: "shift_type",
      entity_id: saved.id,
      details: { code: saved.code },
    });
    revalidateHr();
    return { id: saved.id };
  });
}

export async function addLeaveAdjustmentAction(input: {
  employeeId: string;
  leaveTypeId: string;
  year: number;
  days: number;
  reason: string;
}) {
  validateActionArguments("addLeaveAdjustmentAction", { input });
  return measureOperation("action:addLeaveAdjustmentAction", async () => {
    const actor = await requirePermission("employees", "edit");
    const adjustment = await addLeaveAdjustment(input, actor.id);
    await createActivityLog({
      user_id: actor.id,
      action: "create",
      entity_type: "leave_adjustment",
      entity_id: adjustment.id,
      details: { ...input },
    });
    revalidatePath(ROUTES.hr.employee(input.employeeId));
    revalidateHr();
    return { id: adjustment.id };
  });
}

// ---------- Attendance ----------

export async function saveAttendanceAction(input: {
  employeeId: string;
  date: string;
  status: string;
  checkIn?: string | null;
  checkOut?: string | null;
  lateMinutes?: number | null;
  overtimeMinutes?: number | null;
  overtimeNightMinutes?: number | null;
  overtimeRestDayMinutes?: number | null;
  overtimeHolidayMinutes?: number | null;
  shiftTypeId?: string | null;
  notes?: string | null;
}) {
  validateActionArguments("saveAttendanceAction", { input });
  return measureOperation("action:saveAttendanceAction", async () => {
    const actor = await requirePermission("employees", "edit");
    const cell = await saveAttendanceEntry(
      { ...input, status: input.status as "present" },
      actor.id,
    );
    await createActivityLog({
      user_id: actor.id,
      action: "update",
      entity_type: "attendance",
      entity_id: cell.id,
      details: {
        employeeId: input.employeeId,
        date: input.date,
        status: input.status,
      },
    });
    revalidatePath(ROUTES.hr.attendance);
    return cell;
  });
}

export async function deleteAttendanceAction(employeeId: string, date: string) {
  validateActionArguments("deleteAttendanceAction", { employeeId, date });
  return measureOperation("action:deleteAttendanceAction", async () => {
    const actor = await requirePermission("employees", "edit");
    await deleteAttendanceEntry(employeeId, date);
    await createActivityLog({
      user_id: actor.id,
      action: "delete",
      entity_type: "attendance",
      entity_id: `${employeeId}:${date}`,
    });
    revalidatePath(ROUTES.hr.attendance);
    return { success: true };
  });
}

export async function markMonthPresentAction(
  year: number,
  month: number,
  employeeIds: string[] | null,
) {
  validateActionArguments("markMonthPresentAction", {
    year,
    month,
    employeeIds,
  });
  return measureOperation("action:markMonthPresentAction", async () => {
    const actor = await requirePermission("employees", "edit");
    const result = await markMonthPresent(year, month, employeeIds, actor.id);
    await createActivityLog({
      user_id: actor.id,
      action: "bulk_present",
      entity_type: "attendance",
      entity_id: `${year}-${month}`,
      details: { created: result.created },
    });
    revalidatePath(ROUTES.hr.attendance);
    return result;
  });
}

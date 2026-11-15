import {
  serverTemplates,
  formatMessage,
  serverMessages,
} from "@platform/locales";

import {
  deleteAttendanceEntryApi,
  getEmployee,
  listAttendanceEntries,
  listEmployees,
  listLeaveRequests,
  listLeaveTypesApi,
  listPayrollRuns,
  recordAttendanceEntry,
} from "../api/hr";
import {
  dayKey,
  eachDay,
  isWorkingDay,
  utcDay,
  daysInMonth,
  type HrPolicyRules,
} from "../hr/payroll-engine";
import {
  getHrPolicy,
  holidaySet,
  listPublicHolidays,
  listShiftTypes,
} from "./hr-settings";

const LOCAL_OFFSET = "+00:00";
export const ATTENDANCE_STATUSES = [
  "present",
  "absent",
  "half_day",
  "on_leave",
  "holiday",
] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

export interface AttendanceCell {
  id: string;
  status: AttendanceStatus;
  checkIn: string | null;
  checkOut: string | null;
  lateMinutes: number;
  overtimeMinutes: number;
  overtimeNightMinutes: number;
  overtimeRestDayMinutes: number;
  overtimeHolidayMinutes: number;
  shiftTypeId: string | null;
  notes: string | null;
}

export interface AttendanceSheet {
  year: number;
  month: number;
  days: Array<{
    date: string;
    weekday: number;
    working: boolean;
    holiday: string | null;
  }>;
  employees: Array<{
    id: string;
    employeeNumber: string;
    name: string;
    nameAr: string;
    hireDate: string;
    cells: Record<string, AttendanceCell>;
    leave: Record<string, { code: string; portion: string; status: string }>;
  }>;
  lockedThrough: string | null;
  shiftTypes: Awaited<ReturnType<typeof listShiftTypes>>;
  policy: Pick<
    HrPolicyRules,
    "workdayStart" | "workdayHours" | "weekendDays" | "lateGraceMinutes"
  >;
}

const localTime = (date: Date | null) =>
  date
    ? new Date(date.getTime() + 3 * 3_600_000).toISOString().slice(11, 16)
    : null;

function toCell(row: {
  id: string;
  status: string;
  checkIn: Date | null;
  checkOut: Date | null;
  lateMinutes: number;
  overtimeMinutes: number;
  overtimeNightMinutes: number;
  overtimeRestDayMinutes: number;
  overtimeHolidayMinutes: number;
  shiftTypeId: string | null;
  notes: string | null;
}): AttendanceCell {
  return {
    id: row.id,
    status: row.status as AttendanceStatus,
    checkIn: localTime(row.checkIn),
    checkOut: localTime(row.checkOut),
    lateMinutes: row.lateMinutes,
    overtimeMinutes: row.overtimeMinutes,
    overtimeNightMinutes: row.overtimeNightMinutes,
    overtimeRestDayMinutes: row.overtimeRestDayMinutes,
    overtimeHolidayMinutes: row.overtimeHolidayMinutes,
    shiftTypeId: row.shiftTypeId,
    notes: row.notes,
  };
}

export async function attendanceLockedThrough(): Promise<Date | null> {
  const runs = await listPayrollRuns().catch(() => []);
  const locked = runs
    .filter((r: any) => ["submitted", "approved", "paid", "closed"].includes(r.status))
    .sort((a: any, b: any) => (b.year - a.year) || (b.month - a.month))[0] as any;
  const raw = locked ? (locked.attendanceEnd ?? locked.periodEnd) : null;
  return raw ? new Date(raw) : null;
}

export async function getAttendanceSheet(
  year: number,
  month: number,
): Promise<AttendanceSheet> {
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    month < 1 ||
    month > 12
  )
    throw new Error(serverMessages.chooseAMonth);
  const start = utcDay(year, month - 1, 1);
  const end = utcDay(year, month - 1, daysInMonth(year, month));
  const [
    policy,
    holidays,
    holidayRows,
    employees,
    entries,
    leaves,
    shiftTypes,
    locked,
  ] = await Promise.all([
    getHrPolicy(),
    holidaySet(start, end),
    listPublicHolidays(year),
    listEmployees().then((rows) =>
      rows
        .filter((e: any) => ["active", "on_leave"].includes(e.status) && new Date(e.hireDate) <= end)
        .map((e: any) => ({ ...e, hireDate: new Date(e.hireDate) }))
        .sort((a: any, b: any) =>
          `${a.firstNameEn} ${a.lastNameEn}`.localeCompare(`${b.firstNameEn} ${b.lastNameEn}`),
        ),
    ),
    listAttendanceEntries().then((rows) =>
      rows
        .map((r: any) => ({ ...r, date: new Date(r.entryDate ?? r.date) }))
        .filter((r: any) => r.date >= start && r.date <= end),
    ),
    Promise.all([listLeaveRequests().catch(() => []), listLeaveTypesApi().catch(() => [])]).then(
      ([reqs, lts]) => {
        const ltCode = new Map<string, any>(lts.map((lt: any): [any, any] => [lt.id, lt.code]));
        return reqs
          .filter((l: any) => ["approved", "pending"].includes(l.status))
          .map((l: any) => ({
            ...l,
            startDate: new Date(l.startDate),
            endDate: new Date(l.endDate),
            dayPortion: l.dayPortion ?? "full",
            leaveType: { code: ltCode.get(l.leaveTypeId) ?? l.leaveType ?? "annual" },
          }))
          .filter((l: any) => l.startDate <= end && l.endDate >= start);
      },
    ),
    listShiftTypes(),
    attendanceLockedThrough(),
  ]);
  const holidayNames = new Map<string, string>(holidayRows.map((h: any): [any, any] => [h.date, h.nameEn]));
  return {
    year,
    month,
    days: eachDay(start, end).map((d) => ({
      date: dayKey(d),
      weekday: d.getUTCDay(),
      working: isWorkingDay(d, policy, holidays),
      holiday: (holidayNames.get(dayKey(d)) ?? null) as string | null,
    })),
    employees: employees.map((e) => {
      const cells: Record<string, AttendanceCell> = {};
      for (const entry of entries.filter((x) => x.employeeId === e.id))
        cells[dayKey(entry.date)] = toCell(entry);
      const leave: Record<
        string,
        { code: string; portion: string; status: string }
      > = {};
      for (const l of leaves.filter((x) => x.employeeId === e.id))
        for (const d of eachDay(l.startDate, l.endDate))
          leave[dayKey(d)] = {
            code: l.leaveType.code,
            portion: l.dayPortion,
            status: l.status,
          };
      return {
        id: e.id,
        employeeNumber: e.employeeNumber,
        name: `${e.firstNameEn} ${e.lastNameEn}`,
        nameAr: `${e.firstNameAr} ${e.lastNameAr}`,
        hireDate: dayKey(e.hireDate),
        cells,
        leave,
      };
    }),
    lockedThrough: locked ? dayKey(locked) : null,
    shiftTypes,
    policy: {
      workdayStart: policy.workdayStart,
      workdayHours: policy.workdayHours,
      weekendDays: policy.weekendDays,
      lateGraceMinutes: policy.lateGraceMinutes,
    },
  };
}

export interface AttendanceInput {
  employeeId: string;
  date: string;
  status: AttendanceStatus;
  checkIn?: string | null;
  checkOut?: string | null;
  lateMinutes?: number | null;
  overtimeMinutes?: number | null;
  overtimeNightMinutes?: number | null;
  overtimeRestDayMinutes?: number | null;
  overtimeHolidayMinutes?: number | null;
  shiftTypeId?: string | null;
  notes?: string | null;
}

const minutesOf = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

async function assertUnlocked(date: Date) {
  const locked = await attendanceLockedThrough();
  if (locked && date <= locked)
    throw new Error(
      formatMessage(serverTemplates.attendanceUpTo0IsPartOf, {
        0: dayKey(locked),
      }),
    );
}

export async function saveAttendanceEntry(
  input: AttendanceInput,
  actorId: string,
) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date))
    throw new Error(serverMessages.chooseADate);
  if (!(ATTENDANCE_STATUSES as readonly string[]).includes(input.status))
    throw new Error(serverMessages.chooseAStatus);
  const date = new Date(`${input.date}T00:00:00Z`);
  await assertUnlocked(date);
  const employee = await getEmployee(input.employeeId);
  if (date < new Date(employee.hireDate))
    throw new Error(serverMessages.theEmployeeHadNotJoinedOnThat);
  if (date.getTime() > Date.now() + 86_400_000)
    throw new Error(serverMessages.attendanceCannotBeRecordedForFutureDays);
  for (const t of [input.checkIn, input.checkOut])
    if (t && !/^([01]\d|2[0-3]):[0-5]\d$/.test(t))
      throw new Error(serverMessages.timesMustBeHhMm);
  const minutes = (value: number | null | undefined, label: string) => {
    if (value == null) return null;
    if (!Number.isInteger(value) || value < 0 || value > 24 * 60)
      throw new Error(
        formatMessage(serverTemplates["0MustBeWholeMinutesWithinA"], {
          0: label,
        }),
      );
    return value;
  };
  const policy = await getHrPolicy();
  const holidays = await holidaySet(date, date);
  const working = isWorkingDay(date, policy, holidays);
  const isHoliday = holidays.has(input.date);
  const present = input.status === "present" || input.status === "half_day";

  let worked = 0;
  if (present && input.checkIn && input.checkOut) {
    worked = minutesOf(input.checkOut) - minutesOf(input.checkIn);
    if (worked <= 0) worked += 24 * 60;
  }
  const standard =
    policy.workdayHours * 60 * (input.status === "half_day" ? 0.5 : 1);
  const autoLate =
    present && working && input.checkIn
      ? Math.max(0, minutesOf(input.checkIn) - minutesOf(policy.workdayStart))
      : 0;
  const autoOvertime =
    present && working && worked > standard ? Math.round(worked - standard) : 0;
  const autoRestDay = present && !working && !isHoliday ? worked : 0;
  const autoHoliday = present && isHoliday ? worked : 0;

  const shiftTypeId = input.shiftTypeId || null;
  if (shiftTypeId) {
    const shifts = await listShiftTypes();
    if (!shifts.some((s) => s.id === shiftTypeId)) throw new Error("Shift type not found");
  }
  const row = await recordAttendanceEntry({
    employeeId: input.employeeId,
    entryDate: input.date,
    status: input.status,
    notes: input.notes?.trim().slice(0, 500) || undefined,
  });
  return toCell({
    ...row,
    date,
    checkIn: present && input.checkIn ? new Date(`${input.date}T${input.checkIn}:00${LOCAL_OFFSET}`) : null,
    checkOut: present && input.checkOut ? new Date(`${input.date}T${input.checkOut}:00${LOCAL_OFFSET}`) : null,
    lateMinutes: minutes(input.lateMinutes, "Late minutes") ?? autoLate,
    overtimeMinutes: minutes(input.overtimeMinutes, "Overtime") ?? autoOvertime,
    overtimeNightMinutes: minutes(input.overtimeNightMinutes, "Night overtime") ?? 0,
    overtimeRestDayMinutes: minutes(input.overtimeRestDayMinutes, "Rest-day overtime") ?? autoRestDay,
    overtimeHolidayMinutes: minutes(input.overtimeHolidayMinutes, "Holiday overtime") ?? autoHoliday,
    shiftTypeId: present ? shiftTypeId : null,
    source: "manual",
  });
}

export async function deleteAttendanceEntry(employeeId: string, date: string) {
  const day = new Date(`${date}T00:00:00Z`);
  await assertUnlocked(day);
  await deleteAttendanceEntryApi(employeeId, date);
}

export async function markMonthPresent(
  year: number,
  month: number,
  employeeIds: string[] | null,
  actorId: string,
) {
  const sheet = await getAttendanceSheet(year, month);
  const today = dayKey(new Date());
  const lockedThrough = sheet.lockedThrough;
  const data: Array<{
    employeeId: string;
    date: Date;
    status: string;
    source: string;
    recordedById: string;
  }> = [];
  for (const employee of sheet.employees) {
    if (employeeIds && !employeeIds.includes(employee.id)) continue;
    for (const day of sheet.days) {
      if (!day.working || day.date > today || day.date < employee.hireDate)
        continue;
      if (lockedThrough && day.date <= lockedThrough) continue;
      if (employee.cells[day.date]) continue;
      const leave = employee.leave[day.date];
      if (leave && leave.status === "approved" && leave.portion === "full")
        continue;
      data.push({
        employeeId: employee.id,
        date: new Date(`${day.date}T00:00:00Z`),
        status: "present",
        source: "bulk",
        recordedById: actorId,
      });
    }
  }
  for (const item of data) {
    await recordAttendanceEntry({
      employeeId: item.employeeId,
      entryDate: dayKey(item.date),
      status: item.status,
    });
  }
  return { created: data.length };
}

export async function attendanceForPayroll(
  employeeIds: string[],
  start: Date,
  end: Date,
) {
  const [allRows, shiftTypes] = await Promise.all([
    listAttendanceEntries(),
    listShiftTypes(),
  ]);
  const empSet = new Set(employeeIds);
  const shiftById = new Map<string, any>(shiftTypes.map((s): [any, any] => [s.id, s]));
  const rows = allRows
    .map((r: any) => ({ ...r, date: new Date(r.entryDate ?? r.date), shiftType: r.shiftTypeId ? shiftById.get(r.shiftTypeId) ?? null : null }))
    .filter((r: any) => empSet.has(r.employeeId) && r.date >= start && r.date <= end);
  return rows.map((row) => ({
    employeeId: row.employeeId,
    date: dayKey(row.date),
    status: row.status as AttendanceStatus,
    lateMinutes: row.lateMinutes,
    overtimeMinutes: row.overtimeMinutes,
    overtimeNightMinutes: row.overtimeNightMinutes,
    overtimeRestDayMinutes: row.overtimeRestDayMinutes,
    overtimeHolidayMinutes: row.overtimeHolidayMinutes,
    shift: row.shiftType
      ? {
          code: row.shiftType.code,
          mode: row.shiftType.allowanceMode as "fixed" | "percent",
          value: Number(row.shiftType.allowanceValue),
        }
      : null,
  }));
}

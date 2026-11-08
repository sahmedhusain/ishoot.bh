import {
  serverTemplates,
  formatMessage,
  serverMessages,
} from "@platform/locales";

import { db } from "../atomic";
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

/** Local time offset; check-in/out times are entered as local HH:MM. */
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
    /** Approved or pending leave per day: type code and portion. */
    leave: Record<string, { code: string; portion: string; status: string }>;
  }>;
  /** Days already in a submitted, approved or paid payroll; they cannot be edited. */
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

/** Latest attendance day that belongs to a payroll already submitted, approved or paid. */
export async function attendanceLockedThrough(): Promise<Date | null> {
  const run = await db.payrollRun.findFirst({
    where: { status: { in: ["submitted", "approved", "paid", "closed"] } },
    orderBy: [{ year: "desc" }, { month: "desc" }],
    select: { attendanceEnd: true, periodEnd: true },
  });
  return run ? (run.attendanceEnd ?? run.periodEnd) : null;
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
    db.employee.findMany({
      where: { status: { in: ["active", "on_leave"] }, hireDate: { lte: end } },
      select: {
        id: true,
        employeeNumber: true,
        firstNameEn: true,
        lastNameEn: true,
        firstNameAr: true,
        lastNameAr: true,
        hireDate: true,
      },
      orderBy: [{ firstNameEn: "asc" }, { lastNameEn: "asc" }],
    }),
    db.attendanceEntry.findMany({ where: { date: { gte: start, lte: end } } }),
    db.leaveRequest.findMany({
      where: {
        status: { in: ["approved", "pending"] },
        startDate: { lte: end },
        endDate: { gte: start },
      },
      select: {
        employeeId: true,
        startDate: true,
        endDate: true,
        dayPortion: true,
        status: true,
        leaveType: { select: { code: true } },
      },
    }),
    listShiftTypes(),
    attendanceLockedThrough(),
  ]);
  const holidayNames = new Map<string, string>(holidayRows.map((h: any) => [h.date, h.nameEn]));
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
  /** Leave blank to work these out from the times. */
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

/**
 * Records one day. Lateness is minutes after the workday start; overtime is time worked beyond the workday,
 * or all time worked on a weekend (rest-day) or public holiday, unless entered explicitly.
 */
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
  const employee = await db.employee.findUniqueOrThrow({
    where: { id: input.employeeId },
    select: { hireDate: true },
  });
  if (date < employee.hireDate)
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
    if (worked <= 0) worked += 24 * 60; // overnight shift
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
  if (shiftTypeId)
    await db.shiftType.findUniqueOrThrow({
      where: { id: shiftTypeId },
      select: { id: true },
    });
  const toDate = (t: string | null | undefined) =>
    t ? new Date(`${input.date}T${t}:00${LOCAL_OFFSET}`) : null;
  const data = {
    status: input.status,
    checkIn: present ? toDate(input.checkIn) : null,
    checkOut: present ? toDate(input.checkOut) : null,
    lateMinutes: minutes(input.lateMinutes, "Late minutes") ?? autoLate,
    overtimeMinutes: minutes(input.overtimeMinutes, "Overtime") ?? autoOvertime,
    overtimeNightMinutes:
      minutes(input.overtimeNightMinutes, "Night overtime") ?? 0,
    overtimeRestDayMinutes:
      minutes(input.overtimeRestDayMinutes, "Rest-day overtime") ?? autoRestDay,
    overtimeHolidayMinutes:
      minutes(input.overtimeHolidayMinutes, "Holiday overtime") ?? autoHoliday,
    shiftTypeId: present ? shiftTypeId : null,
    notes: input.notes?.trim().slice(0, 500) || null,
    source: "manual",
    recordedById: actorId,
  };
  const row = await db.attendanceEntry.upsert({
    where: { employeeId_date: { employeeId: input.employeeId, date } },
    update: data,
    create: { employeeId: input.employeeId, date, ...data },
  });
  return toCell(row);
}

export async function deleteAttendanceEntry(employeeId: string, date: string) {
  const day = new Date(`${date}T00:00:00Z`);
  await assertUnlocked(day);
  await db.attendanceEntry.deleteMany({ where: { employeeId, date: day } });
}

/**
 * Marks every working day of the month up to today as present for the chosen employees, skipping days that
 * already have a record, full-day leave, days before joining and locked days.
 */
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
  if (data.length)
    await db.attendanceEntry.createMany({ data, skipDuplicates: true });
  return { created: data.length };
}

/** Attendance for one employee over a window, in the shape the payroll engine expects. */
export async function attendanceForPayroll(
  employeeIds: string[],
  start: Date,
  end: Date,
) {
  const rows = await db.attendanceEntry.findMany({
    where: { employeeId: { in: employeeIds }, date: { gte: start, lte: end } },
    include: { shiftType: true },
  });
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

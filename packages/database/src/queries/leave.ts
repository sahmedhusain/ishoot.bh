import { serverTemplates, formatMessage, serverMessages } from "@ishoot/locales";

import { db } from "../db";
import { leaveDaysCharged, type DayPortion } from "../hr/payroll-engine";
import { getHrPolicy, holidaySet, listLeaveTypeRules, toLeaveTypeRules, type LeaveTypeView } from "./hr-settings";
import { getLeaveBalance, refreshLeaveBalanceCache } from "./leave-balances";
import { LeaveRequest } from "../types";

type LeaveApprovedHook = (leaveRequestId: string, approverId: string) => Promise<unknown>;
const leaveApprovedHooks: LeaveApprovedHook[] = [];
/**
 * Runs after a leave request is approved, inside the same transaction. Modules subscribe instead of being
 * imported here, which would loop back through the approval engine.
 */
export function onLeaveApproved(hook: LeaveApprovedHook) {
  if (!leaveApprovedHooks.includes(hook)) leaveApprovedHooks.push(hook);
}

/**
 * Checks if an employee (or linked User) has an overlapping approved leave.
 * Interval comparison: [requestStart, requestEnd] overlaps [leaveStart, leaveEnd]
 * if requestStart <= leaveEnd && requestEnd >= leaveStart.
 */
export async function checkEmployeeAvailability(
  employeeIdOrUserId: string,
  periodStart: Date,
  periodEnd: Date,
): Promise<{
  isAvailable: boolean;
  conflictReason?: string;
  conflictingLeave?: {
    startDate: Date;
    endDate: Date;
    leaveTypeCode?: string;
  };
}> {
  // First resolve the employee ID if a user ID was passed
  const employee = await db.employee.findFirst({
    where: {
      OR: [
        { id: employeeIdOrUserId },
        { userId: employeeIdOrUserId },
      ],
    },
    select: { id: true, employeeNumber: true, firstNameEn: true, lastNameEn: true },
  });

  if (!employee) {
    // If no employee record exists for the user, availability constraint does not block
    return { isAvailable: true };
  }

  // Find any approved leave overlapping the period
  const conflict = await db.leaveRequest.findFirst({
    where: {
      employeeId: employee.id,
      status: "approved",
      startDate: { lte: periodEnd },
      endDate: { gte: periodStart },
    },
    include: {
      leaveType: { select: { code: true, nameEn: true } },
    },
  });

  if (conflict) {
    return {
      isAvailable: false,
      conflictReason: `Employee ${employee.firstNameEn} ${employee.lastNameEn} (${employee.employeeNumber}) is on approved leave from ${conflict.startDate.toISOString().split("T")[0]} to ${conflict.endDate.toISOString().split("T")[0]}.`,
      conflictingLeave: {
        startDate: conflict.startDate,
        endDate: conflict.endDate,
        leaveTypeCode: conflict.leaveType.code,
      },
    };
  }

  return { isAvailable: true };
}

/**
 * Batch availability check for candidate employees.
 * Single query over candidate set.
 */
export async function checkBatchAvailability(
  employeeOrUserIds: string[],
  periodStart: Date,
  periodEnd: Date,
): Promise<Map<string, { isAvailable: boolean; conflictReason?: string }>> {
  const result = new Map<string, { isAvailable: boolean; conflictReason?: string }>();
  if (!employeeOrUserIds.length) return result;

  const employees = await db.employee.findMany({
    where: {
      OR: [
        { id: { in: employeeOrUserIds } },
        { userId: { in: employeeOrUserIds } },
      ],
    },
    select: { id: true, userId: true, firstNameEn: true, lastNameEn: true },
  });

  const empIds = employees.map((e) => e.id);
  const conflicts = await db.leaveRequest.findMany({
    where: {
      employeeId: { in: empIds },
      status: "approved",
      startDate: { lte: periodEnd },
      endDate: { gte: periodStart },
    },
    select: { employeeId: true, startDate: true, endDate: true },
  });

  const conflictMap = new Map<string, { startDate: Date; endDate: Date }>();
  for (const c of conflicts) {
    conflictMap.set(c.employeeId, c);
  }

  for (const emp of employees) {
    const c = conflictMap.get(emp.id);
    const entry = c
      ? {
          isAvailable: false,
          conflictReason: `On approved leave from ${c.startDate.toISOString().split("T")[0]} to ${c.endDate.toISOString().split("T")[0]}.`,
        }
      : { isAvailable: true };

    result.set(emp.id, entry);
    if (emp.userId) {
      result.set(emp.userId, entry);
    }
  }

  // Any ID not having an employee record is assumed available
  for (const id of employeeOrUserIds) {
    if (!result.has(id)) {
      result.set(id, { isAvailable: true });
    }
  }

  return result;
}

/**
 * Asserts that an actor is NOT currently on approved leave when creating operational/financial work.
 * "An employee on approved leave cannot create new operational/financial work or make assignment/approval decisions during that period."
 */
export async function assertActorNotOnLeave(actorId: string, workDate?: Date): Promise<void> {
  const actor = await db.user.findUnique({ where: { id: actorId }, select: { role: true } });
  if (actor?.role === "super_admin") return;
  const targetDate = workDate || new Date();
  const availability = await checkEmployeeAvailability(actorId, targetDate, targetDate);
  if (!availability.isAvailable) {
    throw new Error(formatMessage(serverTemplates.actionProhibited0EmployeesOnApprovedLeave, { 0: availability.conflictReason }));
  }
}

/**
 * Asserts that an assignee is available during the scheduled work period.
 */
export async function assertAssigneeAvailable(
  assigneeId: string,
  periodStart: Date,
  periodEnd: Date,
): Promise<void> {
  const availability = await checkEmployeeAvailability(assigneeId, periodStart, periodEnd);
  if (!availability.isAvailable) {
    throw new Error(formatMessage(serverTemplates.assignmentConflict0, { 0: availability.conflictReason }));
  }
}

export async function createLeaveRequest(data: {
  employeeId: string;
  leaveTypeId: string;
  startDate: Date;
  endDate: Date;
  fullDay?: boolean;
  hours?: number;
  /** "full" (default), "half_am", "half_pm" or "hours". */
  dayPortion?: DayPortion;
  attachmentUrl?: string | null;
  reason: string;
}): Promise<LeaveRequest> {
  if (data.endDate < data.startDate) {
    throw new Error(serverMessages.invalidLeavePeriodEndDateCannotBe);
  }
  const portion: DayPortion = data.dayPortion ?? (data.fullDay === false ? "hours" : "full");

  // Check existing approved or pending leaves for overlap
  const existingOverlap = await db.leaveRequest.findFirst({
    where: {
      employeeId: data.employeeId,
      status: { in: ["approved", "pending"] },
      startDate: { lte: data.endDate },
      endDate: { gte: data.startDate },
    },
  });

  if (existingOverlap) {
    // Two half days on the same date (morning and afternoon) may coexist.
    const halves = ["half_am", "half_pm"];
    const sameDayHalves = halves.includes(portion) && halves.includes(existingOverlap.dayPortion) && existingOverlap.dayPortion !== portion;
    if (!sameDayHalves) throw new Error(formatMessage(serverTemplates.conflictingLeaveRequestAlreadyExistsForThis, { 0: existingOverlap.status }));
  }

  const [typeRow, employee, policy] = await Promise.all([
    db.leaveType.findUniqueOrThrow({ where: { id: data.leaveTypeId } }),
    db.employee.findUniqueOrThrow({ where: { id: data.employeeId }, select: { hireDate: true, status: true } }),
    getHrPolicy(),
  ]);
  const type = toLeaveTypeRules(typeRow);
  if (!type.isActive) throw new Error(serverMessages.thisLeaveTypeIsNoLongerOffered);
  if (employee.status === "terminated") throw new Error(serverMessages.leaveCannotBeRequestedForAFormer);
  if (type.requiresAttachment && !data.attachmentUrl) throw new Error(serverMessages.attachASupportingDocumentForThisLeave);
  const holidays = await holidaySet(data.startDate, data.endDate);
  const requestedDays = leaveDaysCharged(
    { start: data.startDate, end: data.endDate, portion, hours: data.hours },
    type,
    policy,
    holidays,
  );
  if (data.startDate.getUTCFullYear() !== data.endDate.getUTCFullYear())
    throw new Error(serverMessages.splitLeaveThatCrossesTheNewYear);
  const balance = await getLeaveBalance(data.employeeId, data.leaveTypeId, data.startDate.getUTCFullYear(), data.startDate);
  if (!balance.eligible)
    throw new Error(formatMessage(serverTemplates.notYetEligibleForThisLeaveType, { 0: balance.eligibleFrom }));
  if (balance.available != null && requestedDays > balance.available) {
    throw new Error(formatMessage(serverTemplates.insufficientLeaveBalance0DaySRequested, { 0: requestedDays, 1: balance.available }));
  }

  const created = await db.leaveRequest.create({
    data: {
      employeeId: data.employeeId,
      leaveTypeId: data.leaveTypeId,
      startDate: data.startDate,
      endDate: data.endDate,
      fullDay: portion === "full",
      hours: portion === "hours" ? data.hours || null : null,
      dayPortion: portion,
      days: requestedDays,
      attachmentUrl: data.attachmentUrl || null,
      reason: data.reason,
      status: "pending",
    },
    include: {
      employee: {
        select: {
          id: true,
          firstNameEn: true,
          lastNameEn: true,
          employeeNumber: true,
        },
      },
      leaveType: true,
    },
  });

  await refreshLeaveBalanceCache(data.employeeId);
  return {
    ...created,
    startDate: created.startDate.toISOString(),
    endDate: created.endDate.toISOString(),
    hours: created.hours ? Number(created.hours) : null,
    days: Number(created.days),
    createdAt: created.createdAt.toISOString(),
    updatedAt: created.updatedAt.toISOString(),
    approvedAt: created.approvedAt?.toISOString() || null,
  };
}

export interface LeaveConflicts {
  assignedInquiriesCount: number;
  assignedDealsCount: number;
  calendarEventsCount: number;
}

/** Open work assigned to the employee during the leave period, shown to approvers. */
export async function getLeaveConflicts(leave: {
  startDate: Date;
  endDate: Date;
  employee: { userId: string | null };
}): Promise<LeaveConflicts> {
  const userId = leave.employee.userId;
  let assignedInquiriesCount = 0;
  let assignedDealsCount = 0;
  let calendarEventsCount = 0;

  if (userId) {
    [assignedInquiriesCount, assignedDealsCount, calendarEventsCount] = await Promise.all([
      db.inquiry.count({
        where: {
          assignedToId: userId,
          workflowStatus: { in: ["received", "under_review", "assigned", "in_progress"] },
        },
      }),
      db.crmDeal.count({
        where: {
          assignedTo: userId,
          dealStage: { notIn: ["closed_won", "closed_lost"] },
        },
      }),
      db.calendarEvent.count({
        where: {
          createdById: userId,
          startDate: { lte: leave.endDate },
          endDate: { gte: leave.startDate },
        },
      }),
    ]);
  }

  return { assignedInquiriesCount, assignedDealsCount, calendarEventsCount };
}

/** Applies an approval decided by the approval engine (which enforces who may decide). */
export async function approveLeaveRequest(
  requestId: string,
  approverId: string,
  reviewNotes?: string,
): Promise<{
  request: LeaveRequest;
  conflicts: {
    assignedInquiriesCount: number;
    assignedDealsCount: number;
    calendarEventsCount: number;
  };
}> {
  const leave = await db.leaveRequest.findUnique({
    where: { id: requestId },
    include: { employee: true },
  });

  if (!leave) throw new Error(serverMessages.leaveRequestNotFound);
  if (leave.status !== "pending") throw new Error(formatMessage(serverTemplates.cannotApproveLeaveWithStatus0, { 0: leave.status }));

  const conflicts = await getLeaveConflicts(leave);
  // Other requests (approved or pending) already count against the balance; this one is pending too.
  const balance = await getLeaveBalance(leave.employeeId, leave.leaveTypeId, leave.startDate.getUTCFullYear(), leave.startDate);
  if (balance.available != null && balance.available < 0) throw new Error(serverMessages.insufficientLeaveBalanceToApproveThisRequest);

  await db.leaveRequest.update({
    where: { id: requestId },
    data: {
      status: "approved",
      approvedById: approverId,
      approvedAt: new Date(),
      reviewNotes: reviewNotes || null,
    },
  });
  await refreshLeaveBalanceCache(leave.employeeId);
  // E.g. leave types that need a handover open one for HR (see employee-handovers).
  for (const hook of leaveApprovedHooks) await hook(requestId, approverId);
  const updated = await db.leaveRequest.findUniqueOrThrow({ where: { id: requestId }, include: { employee: true, leaveType: true } });

  return {
    request: {
      ...updated,
      employee: {
        ...updated.employee,
        leaveBalanceDays: Number(updated.employee.leaveBalanceDays),
      },
      startDate: updated.startDate.toISOString(),
      endDate: updated.endDate.toISOString(),
      hours: updated.hours ? Number(updated.hours) : null,
      days: Number(updated.days),
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      approvedAt: updated.approvedAt?.toISOString() || null,
    },
    conflicts,
  };
}

/** Applies a rejection decided by the approval engine. */
export async function rejectLeaveRequest(
  requestId: string,
  approverId: string,
  reason: string,
): Promise<LeaveRequest> {
  const leave = await db.leaveRequest.findUnique({
    where: { id: requestId },
    include: { employee: true },
  });

  if (!leave) throw new Error(serverMessages.leaveRequestNotFound);
  if (leave.status !== "pending") throw new Error(formatMessage(serverTemplates.cannotRejectLeaveWithStatus0, { 0: leave.status }));

  await db.leaveRequest.update({
    where: { id: requestId },
    data: {
      status: "rejected",
      approvedById: approverId,
      approvedAt: new Date(),
      reviewNotes: reason,
    },
  });
  await refreshLeaveBalanceCache(leave.employeeId);
  const updated = await db.leaveRequest.findUniqueOrThrow({ where: { id: requestId }, include: { employee: true, leaveType: true } });

  return {
    ...updated,
    employee: {
      ...updated.employee,
      leaveBalanceDays: Number(updated.employee.leaveBalanceDays),
    },
    startDate: updated.startDate.toISOString(),
    endDate: updated.endDate.toISOString(),
    hours: updated.hours ? Number(updated.hours) : null,
    days: Number(updated.days),
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
    approvedAt: updated.approvedAt?.toISOString() || null,
  };
}

export async function listLeaveRequests(filters: {
  employeeId?: string;
  /** Extra requests to include regardless of employeeId, e.g. ones awaiting the viewer's approval. */
  includeIds?: string[];
  status?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  pageSize?: number;
}): Promise<{ items: LeaveRequest[]; total: number }> {
  const page = Math.max(1, filters.page || 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize || 25));
  const where: any = {};

  if (filters.employeeId && filters.includeIds?.length)
    where.OR = [{ employeeId: filters.employeeId }, { id: { in: filters.includeIds } }];
  else if (filters.employeeId) where.employeeId = filters.employeeId;
  if (filters.status) where.status = filters.status;
  if (filters.startDate && filters.endDate) {
    where.startDate = { lte: filters.endDate };
    where.endDate = { gte: filters.startDate };
  }

  const [total, records] = await Promise.all([
    db.leaveRequest.count({ where }),
    db.leaveRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        employee: {
          select: {
            id: true,
            firstNameEn: true,
            lastNameEn: true,
            employeeNumber: true,
          },
        },
        leaveType: true,
      },
    }),
  ]);

  return {
    total,
    items: records.map((r) => ({
      ...r,
      startDate: r.startDate.toISOString(),
      endDate: r.endDate.toISOString(),
      hours: r.hours ? Number(r.hours) : null,
      days: Number(r.days),
      // Decimal cannot cross to client components.
      leaveType: r.leaveType ? toLeaveTypeRules(r.leaveType) : r.leaveType,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      approvedAt: r.approvedAt?.toISOString() || null,
    })),
  };
}

/** Active leave types with their rules (half days, hours, attachments), in display order. */
export async function listLeaveTypes(): Promise<LeaveTypeView[]> {
  return listLeaveTypeRules({ activeOnly: true });
}

import {
  serverTemplates,
  formatMessage,
  serverMessages,
} from "@platform/locales";

import {
  getEmployee,
  listEmployees,
  listLeaveRequests as listLeaveRequestsApi,
  listLeaveTypesApi,
} from "../api/hr";
import { getAdminUserApi } from "../api/identity";
import { listDeals, listInquiries } from "../api/sales";
import { listTableRows, upsertTableRow } from "../api/tables";
import { leaveDaysCharged, type DayPortion } from "../hr/payroll-engine";
import {
  getHrPolicy,
  holidaySet,
  listLeaveTypeRules,
  toLeaveTypeRules,
  type LeaveTypeView,
} from "./hr-settings";
import { getLeaveBalance, refreshLeaveBalanceCache } from "./leave-balances";
import { LeaveRequest } from "../types";

type LeaveApprovedHook = (
  leaveRequestId: string,
  approverId: string,
) => Promise<unknown>;
const leaveApprovedHooks: LeaveApprovedHook[] = [];
export function onLeaveApproved(hook: LeaveApprovedHook) {
  if (!leaveApprovedHooks.includes(hook)) leaveApprovedHooks.push(hook);
}

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
  const [employees, leaveReqs, leaveTypes] = await Promise.all([
    listEmployees(),
    listLeaveRequestsApi().catch(() => []),
    listLeaveTypesApi().catch(() => []),
  ]);
  const employee = employees.find(
    (e: any) => e.id === employeeIdOrUserId || e.userId === employeeIdOrUserId,
  );
  if (!employee) {
    return { isAvailable: true };
  }
  const ltById = new Map<string, any>(leaveTypes.map((lt: any): [any, any] => [lt.id, lt]));
  const conflict = leaveReqs.find((r: any) => {
    if (r.employeeId !== employee.id || r.status !== "approved") return false;
    const s = new Date(r.startDate);
    const en = new Date(r.endDate);
    return s <= periodEnd && en >= periodStart;
  });

  if (conflict) {
    const start = new Date(conflict.startDate);
    const end = new Date(conflict.endDate);
    const lt = ltById.get((conflict as any).leaveTypeId ?? conflict.leaveType);
    return {
      isAvailable: false,
      conflictReason: `Employee ${employee.firstNameEn} ${employee.lastNameEn} (${employee.employeeNumber}) is on approved leave from ${start.toISOString().split("T")[0]} to ${end.toISOString().split("T")[0]}.`,
      conflictingLeave: {
        startDate: start,
        endDate: end,
        leaveTypeCode: lt?.code,
      },
    };
  }

  return { isAvailable: true };
}

export async function checkBatchAvailability(
  employeeOrUserIds: string[],
  periodStart: Date,
  periodEnd: Date,
): Promise<Map<string, { isAvailable: boolean; conflictReason?: string }>> {
  const result = new Map<
    string,
    { isAvailable: boolean; conflictReason?: string }
  >();
  if (!employeeOrUserIds.length) return result;

  const idSet = new Set(employeeOrUserIds);
  const allEmployees = await listEmployees();
  const employees = allEmployees.filter(
    (e: any) => idSet.has(e.id) || (e.userId && idSet.has(e.userId)),
  );
  const empIdSet = new Set(employees.map((e: any) => e.id));
  const allLeaves = await listLeaveRequestsApi().catch(() => []);
  const conflicts = allLeaves
    .filter((l: any) => {
      if (!empIdSet.has(l.employeeId) || l.status !== "approved") return false;
      return new Date(l.startDate) <= periodEnd && new Date(l.endDate) >= periodStart;
    })
    .map((l: any) => ({
      employeeId: l.employeeId,
      startDate: new Date(l.startDate),
      endDate: new Date(l.endDate),
    }));

  const conflictMap = new Map<string, { startDate: Date; endDate: Date }>();
  for (const c of conflicts) {
    conflictMap.set(c.employeeId, c);
  }

  for (const emp of employees as any[]) {
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

  for (const id of employeeOrUserIds) {
    if (!result.has(id)) {
      result.set(id, { isAvailable: true });
    }
  }

  return result;
}

export async function assertActorNotOnLeave(
  actorId: string,
  workDate?: Date,
): Promise<void> {
  const actor = await getAdminUserApi(actorId).catch(() => null);
  if (actor?.role === "super_admin") return;
  const targetDate = workDate || new Date();
  const availability = await checkEmployeeAvailability(
    actorId,
    targetDate,
    targetDate,
  );
  if (!availability.isAvailable) {
    throw new Error(
      formatMessage(serverTemplates.actionProhibited0EmployeesOnApprovedLeave, {
        0: availability.conflictReason,
      }),
    );
  }
}

export async function assertAssigneeAvailable(
  assigneeId: string,
  periodStart: Date,
  periodEnd: Date,
): Promise<void> {
  const availability = await checkEmployeeAvailability(
    assigneeId,
    periodStart,
    periodEnd,
  );
  if (!availability.isAvailable) {
    throw new Error(
      formatMessage(serverTemplates.assignmentConflict0, {
        0: availability.conflictReason,
      }),
    );
  }
}

export async function createLeaveRequest(data: {
  employeeId: string;
  leaveTypeId: string;
  startDate: Date;
  endDate: Date;
  fullDay?: boolean;
  hours?: number;
  dayPortion?: DayPortion;
  attachmentUrl?: string | null;
  reason: string;
}): Promise<LeaveRequest> {
  if (data.endDate < data.startDate) {
    throw new Error(serverMessages.invalidLeavePeriodEndDateCannotBe);
  }
  const portion: DayPortion =
    data.dayPortion ?? (data.fullDay === false ? "hours" : "full");

  const allLeaves = await listLeaveRequestsApi(data.employeeId).catch(() => []);
  const existingOverlap = allLeaves.find((l: any) => {
    if (!["approved", "pending"].includes(l.status)) return false;
    return new Date(l.startDate) <= data.endDate && new Date(l.endDate) >= data.startDate;
  }) as any;

  if (existingOverlap) {
    const halves = ["half_am", "half_pm"];
    const existingPortion = existingOverlap.dayPortion ?? "full";
    const sameDayHalves =
      halves.includes(portion) &&
      halves.includes(existingPortion) &&
      existingPortion !== portion;
    if (!sameDayHalves)
      throw new Error(
        formatMessage(
          serverTemplates.conflictingLeaveRequestAlreadyExistsForThis,
          { 0: existingOverlap.status },
        ),
      );
  }

  const [leaveTypes, employee, policy] = await Promise.all([
    listLeaveTypesApi(),
    getEmployee(data.employeeId),
    getHrPolicy(),
  ]);
  const typeRow = leaveTypes.find((lt: any) => lt.id === data.leaveTypeId);
  if (!typeRow) throw new Error("Leave type not found");
  const type = toLeaveTypeRules(typeRow);
  if (!type.isActive)
    throw new Error(serverMessages.thisLeaveTypeIsNoLongerOffered);
  if (employee.status === "terminated")
    throw new Error(serverMessages.leaveCannotBeRequestedForAFormer);
  if (type.requiresAttachment && !data.attachmentUrl)
    throw new Error(serverMessages.attachASupportingDocumentForThisLeave);
  const holidays = await holidaySet(data.startDate, data.endDate);
  const requestedDays = leaveDaysCharged(
    { start: data.startDate, end: data.endDate, portion, hours: data.hours },
    type,
    policy,
    holidays,
  );
  if (data.startDate.getUTCFullYear() !== data.endDate.getUTCFullYear())
    throw new Error(serverMessages.splitLeaveThatCrossesTheNewYear);
  const balance = await getLeaveBalance(
    data.employeeId,
    data.leaveTypeId,
    data.startDate.getUTCFullYear(),
    data.startDate,
  );
  if (!balance.eligible)
    throw new Error(
      formatMessage(serverTemplates.notYetEligibleForThisLeaveType, {
        0: balance.eligibleFrom,
      }),
    );
  if (balance.available != null && requestedDays > balance.available) {
    throw new Error(
      formatMessage(serverTemplates.insufficientLeaveBalance0DaySRequested, {
        0: requestedDays,
        1: balance.available,
      }),
    );
  }

  const createdRow = await upsertTableRow("hr", "leave_request", {
    employeeId: data.employeeId,
    leaveTypeId: data.leaveTypeId,
    startDate: data.startDate.toISOString(),
    endDate: data.endDate.toISOString(),
    fullDay: portion === "full",
    hours: portion === "hours" ? data.hours || null : null,
    dayPortion: portion,
    days: requestedDays,
    attachmentUrl: data.attachmentUrl || null,
    reason: data.reason,
    status: "pending",
  });
  const created: Record<string, any> = {
    ...createdRow,
    startDate: new Date(createdRow.startDate ?? data.startDate),
    endDate: new Date(createdRow.endDate ?? data.endDate),
    createdAt: new Date(createdRow.createdAt ?? Date.now()),
    updatedAt: new Date(createdRow.updatedAt ?? Date.now()),
    approvedAt: createdRow.approvedAt ? new Date(createdRow.approvedAt) : null,
    employee: {
      id: employee.id,
      firstNameEn: employee.firstNameEn,
      lastNameEn: employee.lastNameEn,
      employeeNumber: employee.employeeNumber,
    },
    leaveType: typeRow,
  };

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
  } as LeaveRequest;
}

export interface LeaveConflicts {
  assignedInquiriesCount: number;
  assignedDealsCount: number;
  calendarEventsCount: number;
}

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
    const [inquiries, deals, events] = await Promise.all([
      listInquiries().catch(() => []),
      listDeals().catch(() => []),
      listTableRows("workflow", "calendar_event").catch(() => []),
    ]);
    assignedInquiriesCount = inquiries.filter(
      (i: any) =>
        i.assignedToId === userId &&
        ["received", "under_review", "assigned", "in_progress"].includes(i.workflowStatus ?? i.status),
    ).length;
    assignedDealsCount = deals.filter(
      (d: any) =>
        d.assignedTo === userId &&
        !["closed_won", "closed_lost"].includes(d.dealStage ?? d.stage),
    ).length;
    calendarEventsCount = events.filter(
      (ev: any) =>
        ev.createdById === userId &&
        new Date(ev.startDate) <= leave.endDate &&
        new Date(ev.endDate) >= leave.startDate,
    ).length;
  }

  return { assignedInquiriesCount, assignedDealsCount, calendarEventsCount };
}

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
  const [allLeaves, employees, leaveTypes] = await Promise.all([
    listLeaveRequestsApi().catch(() => []),
    listEmployees().catch(() => []),
    listLeaveTypesApi().catch(() => []),
  ]);
  const rawLeave = allLeaves.find((r: any) => r.id === requestId);
  if (!rawLeave) throw new Error(serverMessages.leaveRequestNotFound);
  const emp = employees.find((e: any) => e.id === rawLeave.employeeId) ?? {
    id: rawLeave.employeeId,
    userId: null,
    leaveBalanceDays: 0,
  };
  const leave = {
    ...rawLeave,
    startDate: new Date(rawLeave.startDate),
    endDate: new Date(rawLeave.endDate),
    employee: emp as any,
  } as any;

  if (leave.status !== "pending")
    throw new Error(
      formatMessage(serverTemplates.cannotApproveLeaveWithStatus0, {
        0: leave.status,
      }),
    );

  const conflicts = await getLeaveConflicts(leave);
  const balance = await getLeaveBalance(
    leave.employeeId,
    leave.leaveTypeId,
    leave.startDate.getUTCFullYear(),
    leave.startDate,
  );
  if (balance.available != null && balance.available < 0)
    throw new Error(
      serverMessages.insufficientLeaveBalanceToApproveThisRequest,
    );

  const updatedRow = await upsertTableRow("hr", "leave_request", {
    id: requestId,
    status: "approved",
    approvedById: approverId,
    approvedAt: new Date().toISOString(),
    reviewNotes: reviewNotes || null,
  });
  await refreshLeaveBalanceCache(leave.employeeId);
  for (const hook of leaveApprovedHooks) await hook(requestId, approverId);
  const lt = leaveTypes.find((t: any) => t.id === leave.leaveTypeId);
  const updated = {
    ...updatedRow,
    startDate: new Date(updatedRow.startDate ?? leave.startDate),
    endDate: new Date(updatedRow.endDate ?? leave.endDate),
    createdAt: new Date(updatedRow.createdAt ?? Date.now()),
    updatedAt: new Date(updatedRow.updatedAt ?? Date.now()),
    approvedAt: updatedRow.approvedAt ? new Date(updatedRow.approvedAt) : null,
    employee: emp,
    leaveType: lt,
  };

  return {
    request: {
      ...(updated as Record<string, any>),
      employee: {
        ...(updated as any).employee,
        leaveBalanceDays: Number((updated as any).employee.leaveBalanceDays),
      },
      startDate: updated.startDate.toISOString(),
      endDate: updated.endDate.toISOString(),
      hours: (updated as any).hours ? Number((updated as any).hours) : null,
      days: Number((updated as any).days),
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      approvedAt: updated.approvedAt?.toISOString() || null,
    } as any,
    conflicts,
  };
}

export async function rejectLeaveRequest(
  requestId: string,
  approverId: string,
  reason: string,
): Promise<LeaveRequest> {
  const [allLeaves, employees, leaveTypes] = await Promise.all([
    listLeaveRequestsApi().catch(() => []),
    listEmployees().catch(() => []),
    listLeaveTypesApi().catch(() => []),
  ]);
  const rawLeave = allLeaves.find((r: any) => r.id === requestId);
  if (!rawLeave) throw new Error(serverMessages.leaveRequestNotFound);
  const emp = employees.find((e: any) => e.id === rawLeave.employeeId) ?? {
    id: rawLeave.employeeId,
    leaveBalanceDays: 0,
  };
  if (rawLeave.status !== "pending")
    throw new Error(
      formatMessage(serverTemplates.cannotRejectLeaveWithStatus0, {
        0: rawLeave.status,
      }),
    );

  const updatedRow = await upsertTableRow("hr", "leave_request", {
    id: requestId,
    status: "rejected",
    approvedById: approverId,
    approvedAt: new Date().toISOString(),
    reviewNotes: reason,
  });
  await refreshLeaveBalanceCache(rawLeave.employeeId);
  const lt = leaveTypes.find((t: any) => t.id === ((rawLeave as any).leaveTypeId ?? rawLeave.leaveType));
  const updated: Record<string, any> = {
    ...updatedRow,
    startDate: new Date(updatedRow.startDate ?? rawLeave.startDate),
    endDate: new Date(updatedRow.endDate ?? rawLeave.endDate),
    createdAt: new Date(updatedRow.createdAt ?? Date.now()),
    updatedAt: new Date(updatedRow.updatedAt ?? Date.now()),
    approvedAt: updatedRow.approvedAt ? new Date(updatedRow.approvedAt) : null,
    employee: emp,
    leaveType: lt,
  };

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
  } as LeaveRequest;
}

export async function listLeaveRequests(filters: {
  employeeId?: string;
  includeIds?: string[];
  status?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  pageSize?: number;
  userIds?: string[] | null;
}): Promise<{ items: LeaveRequest[]; total: number }> {
  const page = Math.max(1, filters.page || 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize || 25));
  const [allLeaves, employees, leaveTypes] = await Promise.all([
    listLeaveRequestsApi().catch(() => []),
    listEmployees().catch(() => []),
    listLeaveTypesApi().catch(() => []),
  ]);
  const empById = new Map<string, any>(employees.map((e: any): [any, any] => [e.id, e]));
  const ltById = new Map<string, any>(leaveTypes.map((lt: any): [any, any] => [lt.id, lt]));
  const userSet = filters.userIds ? new Set(filters.userIds) : null;
  const includeSet = filters.includeIds?.length ? new Set(filters.includeIds) : null;

  const filtered = allLeaves
    .filter((r: any) => {
      const emp = empById.get(r.employeeId);
      if (userSet && (!emp?.userId || !userSet.has(emp.userId))) return false;
      if (filters.employeeId && includeSet) {
        if (r.employeeId !== filters.employeeId && !includeSet.has(r.id)) return false;
      } else if (filters.employeeId && r.employeeId !== filters.employeeId) {
        return false;
      }
      if (filters.status && r.status !== filters.status) return false;
      if (filters.startDate && filters.endDate) {
        const s = new Date(r.startDate);
        const e = new Date(r.endDate);
        if (s > filters.endDate || e < filters.startDate) return false;
      }
      return true;
    })
    .sort((a: any, b: any) => String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? "")));

  const total = filtered.length;
  const records = filtered.slice((page - 1) * pageSize, page * pageSize);

  return {
    total,
    items: records.map((r: any) => {
      const emp = empById.get(r.employeeId);
      const lt = ltById.get(r.leaveTypeId);
      return {
        ...r,
        employee: emp
          ? {
              id: emp.id,
              firstNameEn: emp.firstNameEn,
              lastNameEn: emp.lastNameEn,
              employeeNumber: emp.employeeNumber,
            }
          : null,
        startDate: new Date(r.startDate).toISOString(),
        endDate: new Date(r.endDate).toISOString(),
        hours: r.hours ? Number(r.hours) : null,
        days: Number(r.days),
        leaveType: lt ? toLeaveTypeRules(lt) : lt,
        createdAt: new Date(r.createdAt ?? Date.now()).toISOString(),
        updatedAt: new Date(r.updatedAt ?? Date.now()).toISOString(),
        approvedAt: r.approvedAt ? new Date(r.approvedAt).toISOString() : null,
      };
    }),
  };
}

export async function listLeaveTypes(): Promise<LeaveTypeView[]> {
  return listLeaveTypeRules({ activeOnly: true });
}

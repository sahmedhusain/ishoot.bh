import { db } from "../db";
import { leaveDaysRequested } from "../constants/hr";
import { LeaveRequest, LeaveType } from "../types";

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
    throw new Error(`Action prohibited: ${availability.conflictReason} Employees on approved leave cannot perform operational mutations.`);
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
    throw new Error(`Assignment conflict: ${availability.conflictReason}`);
  }
}

export async function createLeaveRequest(data: {
  employeeId: string;
  leaveTypeId: string;
  startDate: Date;
  endDate: Date;
  fullDay?: boolean;
  hours?: number;
  reason: string;
}): Promise<LeaveRequest> {
  if (data.endDate < data.startDate) {
    throw new Error("Invalid leave period: end date cannot be earlier than start date");
  }

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
    throw new Error(`Conflicting leave request already exists for this period (status: ${existingOverlap.status})`);
  }

  const [leaveType, employee] = await Promise.all([
    db.leaveType.findUniqueOrThrow({ where: { id: data.leaveTypeId }, select: { isPaid: true } }),
    db.employee.findUniqueOrThrow({ where: { id: data.employeeId }, select: { leaveBalanceDays: true } }),
  ]);
  const requestedDays = leaveDaysRequested(data.startDate, data.endDate, data.fullDay !== false, data.hours);
  if (requestedDays <= 0) throw new Error("The selected period has no working days");
  if (leaveType.isPaid && requestedDays > Number(employee.leaveBalanceDays)) {
    throw new Error(`Insufficient leave balance: ${requestedDays} day(s) requested, ${Number(employee.leaveBalanceDays)} available`);
  }

  const created = await db.leaveRequest.create({
    data: {
      employeeId: data.employeeId,
      leaveTypeId: data.leaveTypeId,
      startDate: data.startDate,
      endDate: data.endDate,
      fullDay: data.fullDay !== false,
      hours: data.hours || null,
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

  return {
    ...created,
    startDate: created.startDate.toISOString(),
    endDate: created.endDate.toISOString(),
    hours: created.hours ? Number(created.hours) : null,
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

  if (!leave) throw new Error("Leave request not found");
  if (leave.status !== "pending") throw new Error(`Cannot approve leave with status: ${leave.status}`);

  const conflicts = await getLeaveConflicts(leave);

  const updated = await db.$transaction(async (tx) => {
    const res = await tx.leaveRequest.update({
      where: { id: requestId },
      data: {
        status: "approved",
        approvedById: approverId,
        approvedAt: new Date(),
        reviewNotes: reviewNotes || null,
      },
      include: {
        employee: true,
        leaveType: true,
      },
    });

    // Deduct leave balance if it's paid leave
    if (res.leaveType.isPaid) {
      const days = leaveDaysRequested(leave.startDate, leave.endDate, leave.fullDay, leave.hours ? Number(leave.hours) : null);
      if (days > Number(res.employee.leaveBalanceDays))
        throw new Error("Insufficient leave balance to approve this request");
      await tx.employee.update({
        where: { id: leave.employeeId },
        data: {
          leaveBalanceDays: { decrement: days },
        },
      });
    }

    return res;
  });

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

  if (!leave) throw new Error("Leave request not found");
  if (leave.status !== "pending") throw new Error(`Cannot reject leave with status: ${leave.status}`);

  const updated = await db.leaveRequest.update({
    where: { id: requestId },
    data: {
      status: "rejected",
      approvedById: approverId,
      approvedAt: new Date(),
      reviewNotes: reason,
    },
    include: { employee: true, leaveType: true },
  });

  return {
    ...updated,
    employee: {
      ...updated.employee,
      leaveBalanceDays: Number(updated.employee.leaveBalanceDays),
    },
    startDate: updated.startDate.toISOString(),
    endDate: updated.endDate.toISOString(),
    hours: updated.hours ? Number(updated.hours) : null,
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
      // Decimal cannot cross to client components.
      leaveType: r.leaveType ? { ...r.leaveType, daysAllowedPerYear: Number(r.leaveType.daysAllowedPerYear) } : r.leaveType,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      approvedAt: r.approvedAt?.toISOString() || null,
    })),
  };
}

export async function listLeaveTypes(): Promise<LeaveType[]> {
  const types = await db.leaveType.findMany({
    orderBy: { code: "asc" },
  });

  if (types.length === 0) {
    // Return standard statutory Bahrain leave types
    const defaults = [
      { code: "annual", nameEn: "Annual Leave", nameAr: "إجازة سنوية", daysAllowedPerYear: 30, isPaid: true },
      { code: "sick", nameEn: "Sick Leave", nameAr: "إجازة مرضية", daysAllowedPerYear: 15, isPaid: true },
      { code: "unpaid", nameEn: "Unpaid Leave", nameAr: "إجازة بدون راتب", daysAllowedPerYear: 30, isPaid: false },
      { code: "emergency", nameEn: "Emergency Leave", nameAr: "إجازة طارئة", daysAllowedPerYear: 6, isPaid: true },
      { code: "maternity", nameEn: "Maternity / Paternity", nameAr: "إجازة أمومة / أبوة", daysAllowedPerYear: 60, isPaid: true },
    ];

    const createdList: LeaveType[] = [];
    for (const d of defaults) {
      const created = await db.leaveType.create({ data: d });
      createdList.push({
        id: created.id,
        code: created.code,
        nameEn: created.nameEn,
        nameAr: created.nameAr,
        daysAllowedPerYear: Number(created.daysAllowedPerYear),
        isPaid: created.isPaid,
      });
    }
    return createdList;
  }

  return types.map((t) => ({
    id: t.id,
    code: t.code,
    nameEn: t.nameEn,
    nameAr: t.nameAr,
    daysAllowedPerYear: Number(t.daysAllowedPerYear),
    isPaid: t.isPaid,
  }));
}


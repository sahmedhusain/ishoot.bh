import {
  serverTemplates,
  formatMessage,
  serverMessages,
} from "@platform/locales";

import { db } from "../db";
import { ALL_ROLES } from "../constants/permissions";
import { getEffectivePermissions } from "./permissions";

/**
 * Account settings that sit with the login rather than the HR record: role, reporting line, account status,
 * discount limit and sales commission. Admins apply them directly; HR files them for an admin's approval.
 * Super Admin accounts are never changed here.
 */
export interface AccountChanges {
  role?: string;
  managerId?: string | null;
  status?: "active" | "suspended" | "archived";
  statusReason?: string | null;
  discountLimitPercent?: number | null;
  commissionRatePercent?: number | null;
}

export interface AccountSnapshot {
  role: string;
  managerId: string | null;
  status: "active" | "suspended" | "archived" | "inactive";
  discountLimitPercent: number | null;
  commissionRatePercent: number | null;
}

const FIELDS = [
  "role",
  "managerId",
  "status",
  "discountLimitPercent",
  "commissionRatePercent",
] as const;

export async function accountSnapshot(
  userId: string,
): Promise<
  AccountSnapshot & { fullName: string; email: string; isSuperAdmin: boolean }
> {
  const user = await db.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      role: true,
      managerId: true,
      isActive: true,
      suspendedAt: true,
      archivedAt: true,
      discountLimitPercent: true,
      commissionRatePercent: true,
      fullName: true,
      email: true,
    },
  });
  return {
    role: user.role,
    managerId: user.managerId,
    status: user.archivedAt
      ? "archived"
      : user.suspendedAt
        ? "suspended"
        : user.isActive
          ? "active"
          : "inactive",
    discountLimitPercent:
      user.discountLimitPercent == null
        ? null
        : Number(user.discountLimitPercent),
    commissionRatePercent:
      user.commissionRatePercent == null
        ? null
        : Number(user.commissionRatePercent),
    fullName: user.fullName,
    email: user.email,
    isSuperAdmin: user.role === "super_admin",
  };
}

/** Keeps only fields that actually change, validated. */
export async function normalizeAccountChanges(
  userId: string,
  input: AccountChanges,
): Promise<{ changes: AccountChanges; before: Partial<AccountSnapshot> }> {
  const current = await accountSnapshot(userId);
  if (current.isSuperAdmin)
    throw new Error(serverMessages.superAdminAccountsAreProtectedAndCannot);
  const changes: AccountChanges = {};
  const before: Partial<AccountSnapshot> = {};
  const percent = (value: number | null | undefined, label: string) => {
    if (value === undefined || value === null) return value;
    if (!Number.isFinite(value) || value < 0 || value > 100)
      throw new Error(
        formatMessage(serverTemplates["0MustBeBetween0And100"], { 0: label }),
      );
    return Math.round(value * 100) / 100;
  };
  if (input.role !== undefined && input.role !== current.role) {
    if (
      !(ALL_ROLES as readonly string[]).includes(input.role) ||
      !(await db.role.findUnique({
        where: { id: input.role },
        select: { id: true },
      }))
    )
      throw new Error(serverMessages.roleNotFound);
    changes.role = input.role;
  }
  if (
    input.managerId !== undefined &&
    (input.managerId || null) !== current.managerId
  ) {
    const managerId = input.managerId || null;
    if (managerId === userId)
      throw new Error(serverMessages.aPersonCannotReportToThemselves);
    if (managerId) {
      const manager = await db.user.findFirst({
        where: { id: managerId, isActive: true },
        select: { id: true },
      });
      if (!manager) throw new Error(serverMessages.chooseAnActiveManager);
      // Walk up from the new manager: the person must not appear above themselves.
      let cursor: string | null = managerId;
      for (let depth = 0; cursor && depth < 50; depth++) {
        if (cursor === userId)
          throw new Error(serverMessages.thisReportingLineWouldLoopBackTo);
        cursor =
          (
            await db.user.findUnique({
              where: { id: cursor },
              select: { managerId: true },
            })
          )?.managerId ?? null;
      }
    }
    changes.managerId = managerId;
  }
  if (input.status !== undefined && input.status !== current.status) {
    if (!["active", "suspended", "archived"].includes(input.status))
      throw new Error(serverMessages.chooseAnAccountStatus);
    if (input.status === "suspended" && !input.statusReason?.trim())
      throw new Error(serverMessages.giveAReasonForSuspendingTheAccount);
    changes.status = input.status;
    changes.statusReason = input.statusReason?.trim().slice(0, 300) || null;
  }
  const discount = percent(input.discountLimitPercent, "The discount limit");
  if (discount !== undefined && discount !== current.discountLimitPercent)
    changes.discountLimitPercent = discount;
  const commission = percent(
    input.commissionRatePercent,
    "The commission rate",
  );
  if (commission !== undefined && commission !== current.commissionRatePercent)
    changes.commissionRatePercent = commission;
  for (const field of FIELDS)
    if (field in changes)
      (before as Record<string, unknown>)[field] = current[field];
  if (!Object.keys(changes).length)
    throw new Error(serverMessages.nothingChanged);
  return { changes, before };
}

/** The actor may not give anyone access beyond their own (Super Admin excepted). */
async function assertWithinActorAccess(
  actorId: string,
  userId: string,
  changes: AccountChanges,
) {
  const actor = await db.user.findUniqueOrThrow({
    where: { id: actorId },
    select: { role: true, permissions: true },
  });
  if (changes.role === "super_admin" && actor.role !== "super_admin")
    throw new Error(serverMessages.onlyASuperAdminCanMakeSomeone);
  if (actor.role === "super_admin" || !changes.role) return;
  const target = await db.user.findUniqueOrThrow({
    where: { id: userId },
    select: { permissions: true },
  });
  const [own, requested] = await Promise.all([
    getEffectivePermissions(
      actor.role,
      actor.permissions as Record<string, boolean> | undefined,
    ),
    getEffectivePermissions(
      changes.role,
      target.permissions as Record<string, boolean> | undefined,
    ),
  ]);
  if (Object.entries(requested).some(([key, granted]) => granted && !own[key]))
    throw new Error(serverMessages.youCannotGiveARoleWithMore);
}

/** Applies validated changes and logs them. Run inside the caller's transaction. */
export async function applyAccountChanges(
  userId: string,
  input: AccountChanges,
  actorId: string,
) {
  const { changes, before } = await normalizeAccountChanges(userId, input);
  if (actorId === userId && (changes.role || changes.status))
    throw new Error(serverMessages.youCannotChangeYourOwnRoleOr);
  await assertWithinActorAccess(actorId, userId, changes);
  const now = new Date();
  await db.user.update({
    where: { id: userId },
    data: {
      ...(changes.role !== undefined && { role: changes.role }),
      ...(changes.managerId !== undefined && { managerId: changes.managerId }),
      ...(changes.discountLimitPercent !== undefined && {
        discountLimitPercent: changes.discountLimitPercent,
      }),
      ...(changes.commissionRatePercent !== undefined && {
        commissionRatePercent: changes.commissionRatePercent,
      }),
      ...(changes.status === "active" && {
        isActive: true,
        suspendedAt: null,
        suspendedById: null,
        suspensionReason: null,
        archivedAt: null,
        archivedById: null,
      }),
      ...(changes.status === "suspended" && {
        isActive: false,
        suspendedAt: now,
        suspendedById: actorId,
        suspensionReason: changes.statusReason,
      }),
      ...(changes.status === "archived" && {
        isActive: false,
        archivedAt: now,
        archivedById: actorId,
      }),
    },
  });
  // Losing access or changing role ends open sessions so new rights apply at once: identity does this when the
  // change is synced (services/identity-sync).
  await db.activityLog.create({
    data: {
      userId: actorId,
      action: "update",
      entityType: "user",
      entityId: userId,
      details: JSON.parse(
        JSON.stringify({ accountChange: { before, after: changes } }),
      ),
    },
  });
  return { changes, before };
}

export async function createAccountChangeRequest(
  userId: string,
  input: AccountChanges,
  requesterId: string,
  reason?: string | null,
) {
  const { changes, before } = await normalizeAccountChanges(userId, input);
  if (changes.role === "super_admin")
    throw new Error(serverMessages.onlyASuperAdminCanMakeSomeone);
  if (
    await db.accountChangeRequest.findFirst({
      where: { userId, status: "pending" },
      select: { id: true },
    })
  )
    throw new Error(serverMessages.thisAccountAlreadyHasAChangeWaiting);
  return db.accountChangeRequest.create({
    data: {
      userId,
      requestedById: requesterId,
      changes: JSON.parse(JSON.stringify(changes)),
      before: JSON.parse(JSON.stringify(before)),
      reason: reason?.trim().slice(0, 500) || null,
    },
  });
}

/** Approval engine finalizers. */
export async function approveAccountChange(
  id: string,
  deciderId: string,
  notes?: string,
) {
  const request = await db.accountChangeRequest.findUniqueOrThrow({
    where: { id },
  });
  if (request.status !== "pending")
    throw new Error(
      formatMessage(serverTemplates.accountChangeIs0, { 0: request.status }),
    );
  await applyAccountChanges(
    request.userId,
    request.changes as AccountChanges,
    deciderId,
  );
  await db.accountChangeRequest.update({
    where: { id },
    data: {
      status: "approved",
      decidedById: deciderId,
      reviewNotes: notes || null,
      decidedAt: new Date(),
    },
  });
}

export async function rejectAccountChange(
  id: string,
  deciderId: string,
  notes?: string,
) {
  const request = await db.accountChangeRequest.findUniqueOrThrow({
    where: { id },
    select: { status: true },
  });
  if (request.status !== "pending")
    throw new Error(
      formatMessage(serverTemplates.accountChangeIs0, { 0: request.status }),
    );
  await db.accountChangeRequest.update({
    where: { id },
    data: {
      status: "rejected",
      decidedById: deciderId,
      reviewNotes: notes || null,
      decidedAt: new Date(),
    },
  });
}

export async function listAccountChangeRequests(userId: string) {
  const rows = await db.accountChangeRequest.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 10,
    include: { requestedBy: { select: { fullName: true } } },
  });
  return rows.map((r) => ({
    id: r.id,
    changes: r.changes as AccountChanges,
    before: r.before as Partial<AccountSnapshot>,
    reason: r.reason,
    status: r.status,
    reviewNotes: r.reviewNotes,
    requestedBy: r.requestedBy.fullName,
    createdAt: r.createdAt.toISOString(),
    decidedAt: r.decidedAt?.toISOString() ?? null,
  }));
}

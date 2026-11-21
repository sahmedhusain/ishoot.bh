import {
  serverTemplates,
  formatMessage,
  serverMessages,
} from "@platform/locales";
import {
  createAccountChangeApi,
  getAdminUserApi,
  listAdminAccountChangesApi,
  listAdminRolesApi,
  listAdminUsersApi,
  updateAccountChangeStatusApi,
  updateAdminUserFieldsApi,
} from "../api/identity";
import { ALL_ROLES } from "../constants/permissions";
import { getEffectivePermissions } from "./permissions";

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

export async function accountSnapshot(
  userId: string,
): Promise<AccountSnapshot & { fullName: string; email: string; isSuperAdmin: boolean }> {
  const user = await getAdminUserApi(userId);
  if (!user) throw new Error(serverMessages.userNotFound);
  const isActive = user.is_active ?? user.isActive ?? true;
  const archivedAt = user.archived_at ?? user.archivedAt;
  const suspendedAt = user.suspended_at ?? user.suspendedAt;
  const dLimit = user.discount_limit_percent ?? user.discountLimitPercent;
  const cRate = user.commission_rate_percent ?? user.commissionRatePercent;
  return {
    role: user.role,
    managerId: user.manager_id ?? user.managerId ?? null,
    status: archivedAt
      ? "archived"
      : suspendedAt
        ? "suspended"
        : isActive
          ? "active"
          : "inactive",
    discountLimitPercent: dLimit == null ? null : Number(dLimit),
    commissionRatePercent: cRate == null ? null : Number(cRate),
    fullName: user.full_name ?? user.fullName ?? user.email,
    email: user.email,
    isSuperAdmin: user.role === "super_admin",
  };
}

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
    const roles = await listAdminRolesApi().catch(() => []);
    if (
      !(ALL_ROLES as readonly string[]).includes(input.role) ||
      (roles.length > 0 && !roles.some((r) => r.id === input.role))
    ) {
      throw new Error(serverMessages.invalidRole);
    }
    changes.role = input.role;
    before.role = current.role;
  }

  if (input.managerId !== undefined && input.managerId !== current.managerId) {
    if (input.managerId === userId) throw new Error(serverMessages.aPersonCannotReportToThemselves);
    if (input.managerId) {
      const mgr = await getAdminUserApi(input.managerId).catch(() => null);
      if (!mgr) throw new Error(serverMessages.userNotFound);
    }
    changes.managerId = input.managerId;
    before.managerId = current.managerId;
  }

  if (input.status !== undefined && input.status !== current.status) {
    changes.status = input.status;
    before.status = current.status;
    if (input.statusReason !== undefined) changes.statusReason = input.statusReason;
  }

  const dPct = percent(input.discountLimitPercent, "Discount limit");
  if (dPct !== undefined && dPct !== current.discountLimitPercent) {
    changes.discountLimitPercent = dPct;
    before.discountLimitPercent = current.discountLimitPercent;
  }

  const cPct = percent(input.commissionRatePercent, "Commission rate");
  if (cPct !== undefined && cPct !== current.commissionRatePercent) {
    changes.commissionRatePercent = cPct;
    before.commissionRatePercent = current.commissionRatePercent;
  }

  if (Object.keys(changes).length === 0) {
    throw new Error("No changes detected");
  }
  return { changes, before };
}

export async function applyAccountChanges(
  userId: string,
  changes: AccountChanges,
  _actorId?: string,
) {
  const payload: Record<string, any> = {};
  if (changes.role !== undefined) payload.role = changes.role;
  if (changes.managerId !== undefined) payload.managerId = changes.managerId;
  if (changes.status !== undefined) payload.isActive = changes.status === "active";
  if (changes.discountLimitPercent !== undefined) payload.discountLimitPercent = changes.discountLimitPercent;
  if (changes.commissionRatePercent !== undefined) payload.commissionRatePercent = changes.commissionRatePercent;
  return updateAdminUserFieldsApi(userId, payload);
}

export async function createAccountChangeRequest(
  userId: string,
  input: AccountChanges & { reason?: string },
  requestedById: string,
  reason?: string,
) {
  const { changes, before } = await normalizeAccountChanges(userId, input);
  return createAccountChangeApi({
    userId,
    requestedById,
    changes,
    beforeValues: before,
    reason: reason ?? input.reason ?? null,
  });
}

export async function approveAccountChange(
  requestId: string,
  deciderId: string,
  notes?: string,
) {
  const decider = await getAdminUserApi(deciderId).catch(() => null);
  if (!decider) throw new Error(serverMessages.userNotFound);
  const perms = await getEffectivePermissions(decider.role, decider.permissions);
  if (!perms["users:approve"] && decider.role !== "super_admin") {
    throw new Error(serverMessages.unauthorized);
  }
  const all = await listAdminAccountChangesApi();
  const req = all.find((r) => r.id === requestId);
  if (!req) throw new Error(serverMessages.requestNotFound);
  if (req.status !== "pending") throw new Error("Request already processed");

  await applyAccountChanges(req.user_id ?? req.userId, req.changes ?? {}, deciderId);
  return updateAccountChangeStatusApi(requestId, {
    status: "approved",
    reviewedById: deciderId,
    reviewNotes: notes ?? null,
  });
}

export async function rejectAccountChange(
  requestId: string,
  deciderId: string,
  notes?: string,
) {
  const all = await listAdminAccountChangesApi();
  const req = all.find((r) => r.id === requestId);
  if (!req) throw new Error(serverMessages.requestNotFound);
  if (req.status !== "pending") throw new Error("Request already processed");
  return updateAccountChangeStatusApi(requestId, {
    status: "rejected",
    reviewedById: deciderId,
    reviewNotes: notes ?? null,
  });
}

export async function listAccountChangeRequests(userId: string) {
  const [all, users] = await Promise.all([
    listAdminAccountChangesApi(),
    listAdminUsersApi(),
  ]);
  const userById = new Map(users.map((u) => [u.id, u]));
  return all
    .filter((r) => (r.user_id ?? r.userId) === userId)
    .map((r) => {
      const reqBy = userById.get(r.requested_by_id ?? r.requestedById);
      const revById = r.decided_by_id ?? r.reviewed_by_id ?? r.decidedById ?? r.reviewedById ?? null;
      const revBy = revById ? userById.get(revById) : null;
      return {
        ...r,
        userId: r.user_id ?? r.userId,
        requestedById: r.requested_by_id ?? r.requestedById,
        beforeValues: r.before ?? r.before_values ?? r.beforeValues ?? null,
        reviewedById: revById,
        reviewNotes: r.review_notes ?? r.reviewNotes ?? null,
        reviewedAt: r.decided_at ?? r.reviewed_at ?? r.decidedAt ?? r.reviewedAt ?? null,
        createdAt: r.created_at ?? r.createdAt,
        updatedAt: r.updated_at ?? r.updatedAt ?? r.created_at ?? r.createdAt,
        requestedBy: reqBy ? { id: reqBy.id, fullName: reqBy.full_name ?? reqBy.fullName } : null,
        reviewedBy: revBy ? { id: revBy.id, fullName: revBy.full_name ?? revBy.fullName } : null,
      };
    });
}

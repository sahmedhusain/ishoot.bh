"use server";
import { serverMessages } from "@platform/locales";
import { ROUTES } from "../../constants/routes";
import { measureOperation } from "@platform/database";
import { runAtomicMutation } from "@platform/database";
import { validateActionArguments } from "../../lib/action-input";

import {
  getUserById,
  getEffectivePermissions,
  createUser,
  updateUserRole,
  updateUser,
  deleteUser,
  createActivityLog,
  setUserDiscountLimit,
  UserRole,
  getStaffRoles,
} from "@platform/database";
import { revalidatePath } from "next/cache";
import { requirePermission } from "../../lib/auth";

async function checkUserManagement(
  actor: { id: string; role: string; permissions?: any },
  id?: string,
  role?: string,
) {
  const target = id ? await getUserById(id) : null;
  if (id && !target) throw new Error(serverMessages.userNotFound);
  if (target?.role === "super_admin")
    throw new Error(serverMessages.superAdminAccountsAreProtectedAndCannot);
  if (actor.role !== "super_admin" && role === "super_admin")
    throw new Error(serverMessages.onlySuperAdministratorsCanMakeSomeoneA);
  if (role) {
    const dbRoles = await getStaffRoles();
    if (!dbRoles.some((r) => r.id === role))
      throw new Error(serverMessages.roleNotFound);
  }
  if (actor.role !== "super_admin") {
    const [own, requested] = await Promise.all([
      getEffectivePermissions(actor.role, actor.permissions),
      getEffectivePermissions(
        role || target?.role || "viewer",
        target?.permissions as Record<string, boolean> | undefined,
      ),
    ]);
    if (
      Object.entries(requested).some(([key, granted]) => granted && !own[key])
    )
      throw new Error(serverMessages.cannotManageAUserWithPermissionsAbove);
  }
}

export async function createUserAction(data: {
  employeeId: string;
  email: string;
  password?: string;
  full_name: string;
  role: string;
  phone?: string;
  department?: string;
  department_id?: string | null;
  manager_id?: string;
}) {
  return measureOperation("action:createUserAction", async () => {
    const actor = await requirePermission("users", "write");
    validateActionArguments("createUserAction", { data });
    const initialPassword = data.password;
    if (
      typeof initialPassword !== "string" ||
      initialPassword.length < 12 ||
      Buffer.byteLength(initialPassword, "utf8") > 72
    ) {
      throw new Error(
        "Password must contain at least 12 characters and at most 72 UTF-8 bytes",
      );
    }

    const { user } = await runAtomicMutation(async () => {
      await checkUserManagement(actor, undefined, data.role);

      const user = await createUser({
        ...data,
        password: initialPassword,
      });
      await createActivityLog({
        user_id: actor.id,
        action: "create",
        entity_type: "user",
        entity_id: user.id,
        details: {
          email: user.email,
          role: user.role,
          employeeId: data.employeeId,
          manager_id: data.manager_id,
        },
      });
      return { user };
    });

    revalidatePath(ROUTES.users.list);
    return { success: true, user };
  });
}

export async function updateUserRoleAction(id: string, role: UserRole) {
  return measureOperation("action:updateUserRoleAction", async () => {
    const actor = await requirePermission("users", "write");
    validateActionArguments("updateUserRoleAction", { id, role });
    const { user } = await runAtomicMutation(async () => {
      await checkUserManagement(actor, id, role);

      const before = await getUserById(id);
      const user = await updateUserRole(id, role);
      if (!user) throw new Error(serverMessages.userRoleUpdateFailed);
      await createActivityLog({
        user_id: actor.id,
        action: "update",
        entity_type: "user",
        entity_id: id,
        details: { before: { role: before?.role }, after: { role: user.role } },
      });
      return { user };
    });

    revalidatePath(ROUTES.users.list);
    return { success: true, user };
  });
}

export async function updateUserAction(
  id: string,
  data: {
    full_name?: string;
    email?: string;
    role?: UserRole;
    phone?: string;
    department?: string;
    department_id?: string | null;
    manager_id?: string;
    is_active?: boolean;
    password?: string;
  },
) {
  return measureOperation("action:updateUserAction", async () => {
    const actor = await requirePermission("users", "write");
    validateActionArguments("updateUserAction", { id, data });
    if (
      data.password !== undefined &&
      (typeof data.password !== "string" ||
        data.password.length < 12 ||
        Buffer.byteLength(data.password, "utf8") > 72)
    )
      throw new Error(
        "Password must contain at least 12 characters and at most 72 UTF-8 bytes",
      );
    const { user } = await runAtomicMutation(async () => {
      await checkUserManagement(actor, id, data.role);

      const before = await getUserById(id);
      const user = await updateUser(id, {
        full_name: data.full_name,
        email: data.email,
        role: data.role,
        phone: data.phone,
        department: data.department,
        department_id: data.department_id,
        manager_id: data.manager_id,
        is_active: data.is_active,
        password: data.password,
      });
      if (!user) throw new Error(serverMessages.userUpdateFailed);
      await createActivityLog({
        user_id: actor.id,
        action: "update",
        entity_type: "user",
        entity_id: id,
        details: {
          updatedFields: Object.keys(data).filter((key) => key !== "password"),
          before: {
            name: before?.full_name,
            email: before?.email,
            role: before?.role,
            active: before?.is_active,
          },
          after: {
            name: user.full_name,
            email: user.email,
            role: user.role,
            active: user.is_active,
          },
          passwordChanged: data.password !== undefined,
        },
      });
      return { user };
    });

    revalidatePath(ROUTES.users.list);
    return { success: true, user };
  });
}

export async function suspendUserAction(id: string, reason: string) {
  return measureOperation("action:suspendUserAction", async () => {
    const actor = await requirePermission("users", "write");
    validateActionArguments("suspendUserAction", { id, reason });
    if (id === actor.id)
      throw new Error(serverMessages.cannotSuspendYourOwnAccount);
    if (!reason || reason.trim().length === 0)
      throw new Error(serverMessages.suspensionReasonIsRequired);

    await runAtomicMutation(async () => {
      await checkUserManagement(actor, id);

      const target = await getUserById(id);
      if (!target) throw new Error(serverMessages.userNotFound);

      await updateUser(id, { is_active: false });

      await createActivityLog({
        user_id: actor.id,
        action: "update",
        entity_type: "user",
        entity_id: id,
        details: {
          action: "suspend",
          reason: reason.trim(),
          before: {
            active: target.is_active,
            suspendedAt: target.suspended_at,
            archivedAt: target.archived_at,
          },
          after: { active: false, suspended: true },
        },
      });
      return {};
    });

    revalidatePath(ROUTES.users.list);
    return { success: true };
  });
}

export async function reactivateUserAction(id: string) {
  return measureOperation("action:reactivateUserAction", async () => {
    const actor = await requirePermission("users", "write");
    validateActionArguments("reactivateUserAction", { id });

    await runAtomicMutation(async () => {
      await checkUserManagement(actor, id);

      const target = await getUserById(id);
      if (!target) throw new Error(serverMessages.userNotFound);

      await updateUser(id, { is_active: true });

      await createActivityLog({
        user_id: actor.id,
        action: "update",
        entity_type: "user",
        entity_id: id,
        details: {
          action: "reactivate",
          before: {
            active: target.is_active,
            suspendedAt: target.suspended_at,
            archivedAt: target.archived_at,
          },
          after: { active: true, suspended: false, archived: false },
        },
      });
      return {};
    });

    revalidatePath(ROUTES.users.list);
    return { success: true };
  });
}

export async function archiveUserAction(id: string) {
  return measureOperation("action:archiveUserAction", async () => {
    const actor = await requirePermission("users", "write");
    validateActionArguments("archiveUserAction", { id });
    if (id === actor.id)
      throw new Error(serverMessages.cannotArchiveYourOwnAccount);

    await runAtomicMutation(async () => {
      await checkUserManagement(actor, id);

      const target = await getUserById(id);
      if (!target) throw new Error(serverMessages.userNotFound);

      await updateUser(id, { is_active: false });

      await createActivityLog({
        user_id: actor.id,
        action: "update",
        entity_type: "user",
        entity_id: id,
        details: {
          action: "archive",
          before: { active: target.is_active, archivedAt: target.archived_at },
          after: { active: false, archived: true },
        },
      });
      return {};
    });

    revalidatePath(ROUTES.users.list);
    return { success: true };
  });
}

export async function deleteUserAction(id: string) {
  return measureOperation("action:deleteUserAction", async () => {
    const actor = await requirePermission("users", "delete");
    validateActionArguments("deleteUserAction", { id });
    if (id === actor.id)
      throw new Error(serverMessages.cannotDeleteYourOwnAccount);
    await runAtomicMutation(async () => {
      await checkUserManagement(actor, id);

      const target = await getUserById(id);
      if (!target) throw new Error(serverMessages.userNotFound);

      if (!(await deleteUser(id)))
        throw new Error(serverMessages.userDeletionFailed);
      await createActivityLog({
        user_id: actor.id,
        action: "delete",
        entity_type: "user",
        entity_id: id,
        details: {
          before: {
            name: target.full_name,
            email: target.email,
            role: target.role,
            active: target.is_active,
          },
        },
      });
      return {};
    });

    revalidatePath(ROUTES.users.list);
    return { success: true };
  });
}

export async function updateUserDiscountLimitAction(
  id: string,
  limit: number | null,
) {
  return measureOperation("action:updateUserDiscountLimitAction", async () => {
    const actor = await requirePermission("users", "write");
    validateActionArguments("updateUserDiscountLimitAction", { id, limit });
    const result = await runAtomicMutation(async () => {
      await checkUserManagement(actor, id);
      const result = await setUserDiscountLimit(id, limit);
      await createActivityLog({
        user_id: actor.id,
        action: "update",
        entity_type: "user",
        entity_id: id,
        details: {
          discountLimitPercent: {
            to: result.discount_limit_percent,
          },
        },
      });
      return result;
    });
    revalidatePath(ROUTES.users.list);
    return { success: true, ...result };
  });
}

export interface BulkUserChange {
  userIds: string[];
  role?: string;
  departmentId?: string;
}

export async function bulkUpdateUsersAction(change: BulkUserChange) {
  return measureOperation("action:bulkUpdateUsersAction", async () => {
    const actor = await requirePermission("users", "write");
    validateActionArguments("bulkUpdateUsersAction", { change });
    const ids = Array.from(new Set(change.userIds)).slice(0, 500);
    if (
      !ids.length ||
      (change.role === undefined && change.departmentId === undefined)
    )
      return { success: true, updated: 0 };
    const updated = await runAtomicMutation(async () => {
      for (const id of ids) {
        await checkUserManagement(actor, id, change.role);
        await updateUser(id, {
          ...(change.role !== undefined ? { role: change.role } : {}),
          ...(change.departmentId !== undefined
            ? { department_id: change.departmentId || null }
            : {}),
        });
      }
      await createActivityLog({
        user_id: actor.id,
        action: "update",
        entity_type: "user",
        entity_id: "bulk",
        details: {
          count: ids.length,
          role: change.role ?? null,
          departmentId: change.departmentId ?? null,
        },
      });
      return ids.length;
    });
    revalidatePath(ROUTES.users.list);
    return { success: true, updated };
  });
}

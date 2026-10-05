"use server";
import { ROUTES } from "../../constants/routes";
import { measureOperation } from "@ishoot/database";
import { runAtomicMutation } from "@ishoot/database";
import { validateActionArguments } from "../../lib/action-input";

import {
  getUserById,
  claimUpload,
  getEffectivePermissions,
  db,
  createUser,
  updateUserRole,
  updateUser,
  deleteUser,
  createActivityLog,
  setUserDiscountLimit,
  UserRole,
} from "@ishoot/database";
import { revalidatePath } from "next/cache";
import { requirePermission } from "../../lib/auth";

async function checkUserManagement(
  actor: { id: string; role: string; permissions?: any },
  id?: string,
  role?: string,
) {
  const target = id ? await getUserById(id) : null;
  if (id && !target) throw new Error("User not found");
  if (
    actor.role !== "super_admin" &&
    (target?.role === "super_admin" || role === "super_admin")
  )
    throw new Error(
      "Only super administrators can manage super administrators",
    );
  if (
    role &&
    !(await db.role.findUnique({ where: { id: role }, select: { id: true } }))
  )
    throw new Error("Role not found");
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
      throw new Error("Cannot manage a user with permissions above your own");
  }
}

async function attachUserSignature(
  url: string | undefined,
  targetId: string,
  actorId: string,
) {
  if (!url?.startsWith("/api/files/")) return;
  const existing = await db.attachment.findFirst({
    where: { entityType: "user_signature", entityId: targetId, fileUrl: url },
    select: { id: true },
  });
  if (existing) return;
  const upload = await db.uploadObject.findUnique({ where: { fileUrl: url } });
  if (
    !upload ||
    upload.isPublic ||
    !["image/png", "image/jpeg", "image/webp"].includes(upload.mimeType)
  )
    throw new Error("Choose a private signature image uploaded by you");
  const claimed = await claimUpload(db, url, actorId);
  await db.attachment.create({
    data: {
      entityType: "user_signature",
      entityId: targetId,
      fileUrl: url,
      fileName: claimed.fileName,
      fileSize: claimed.fileSize,
      mimeType: claimed.mimeType,
      uploadedById: actorId,
    },
  });
}

export async function createUserAction(data: {
  employeeId: string;
  email: string;
  password?: string;
  full_name: string;
  role: string;
  phone?: string;
  department?: string;
  manager_id?: string;
  signature_url?: string;
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
      await db.$queryRaw`SELECT pg_advisory_xact_lock(19041005)::text`;
      await checkUserManagement(actor, undefined, data.role);

      const employee = await db.employee.findUnique({
        where: { id: data.employeeId },
      });
      if (
        !employee ||
        employee.userId ||
        !["active", "on_leave"].includes(employee.status)
      )
        throw new Error("Select an active employee without a user account");
      const user = await createUser({
        ...data,
        password: initialPassword,
      });
      await db.employee.update({
        where: { id: data.employeeId },
        data: { userId: user.id },
      });
      await attachUserSignature(data.signature_url, user.id, actor.id);
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
      await db.$queryRaw`SELECT pg_advisory_xact_lock(19041005)::text`;
      await checkUserManagement(actor, id, role);

      const before = await getUserById(id);
      const user = await updateUserRole(id, role);
      if (!user) throw new Error("User role update failed");
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
    manager_id?: string;
    signature_url?: string;
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
    // Runtime allowlist: TypeScript does not filter forged server-action payloads.
    const { user } = await runAtomicMutation(async () => {
      await db.$queryRaw`SELECT pg_advisory_xact_lock(19041005)::text`;
      await checkUserManagement(actor, id, data.role);

      const before = await getUserById(id);
      const user = await updateUser(id, {
        full_name: data.full_name,
        email: data.email,
        role: data.role,
        phone: data.phone,
        department: data.department,
        manager_id: data.manager_id,
        signature_url: data.signature_url,
        is_active: data.is_active,
        password: data.password,
      });
      if (!user) throw new Error("User update failed");
      await attachUserSignature(data.signature_url, user.id, actor.id);
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
    if (id === actor.id) throw new Error("Cannot suspend your own account");
    if (!reason || reason.trim().length === 0)
      throw new Error("Suspension reason is required");

    await runAtomicMutation(async () => {
      await db.$queryRaw`SELECT pg_advisory_xact_lock(19041005)::text`;
      await checkUserManagement(actor, id);

      const target = await getUserById(id);
      if (!target) throw new Error("User not found");

      if (target.role === "super_admin") {
        const activeSuperAdmins = await db.user.count({
          where: {
            role: "super_admin",
            isActive: true,
            suspendedAt: null,
            archivedAt: null,
          },
        });
        if (activeSuperAdmins <= 1) {
          throw new Error("Cannot suspend the last active Super Admin");
        }
      }

      await db.user.update({
        where: { id },
        data: {
          isActive: false,
          suspendedAt: new Date(),
          suspendedById: actor.id,
          suspensionReason: reason.trim(),
        },
      });

      // Revoke all active sessions immediately
      await db.session.deleteMany({ where: { userId: id } });

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
      await db.$queryRaw`SELECT pg_advisory_xact_lock(19041005)::text`;
      await checkUserManagement(actor, id);

      const target = await getUserById(id);
      if (!target) throw new Error("User not found");

      await db.user.update({
        where: { id },
        data: {
          isActive: true,
          suspendedAt: null,
          suspendedById: null,
          suspensionReason: null,
          archivedAt: null,
          archivedById: null,
        },
      });

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
    if (id === actor.id) throw new Error("Cannot archive your own account");

    await runAtomicMutation(async () => {
      await db.$queryRaw`SELECT pg_advisory_xact_lock(19041005)::text`;
      await checkUserManagement(actor, id);

      const target = await getUserById(id);
      if (!target) throw new Error("User not found");

      if (target.role === "super_admin") {
        const activeSuperAdmins = await db.user.count({
          where: {
            role: "super_admin",
            isActive: true,
            suspendedAt: null,
            archivedAt: null,
          },
        });
        if (activeSuperAdmins <= 1) {
          throw new Error("Cannot archive the last active Super Admin");
        }
      }

      await db.user.update({
        where: { id },
        data: {
          isActive: false,
          archivedAt: new Date(),
          archivedById: actor.id,
        },
      });

      // Revoke all active sessions immediately
      await db.session.deleteMany({ where: { userId: id } });

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
    if (id === actor.id) throw new Error("Cannot delete your own account");
    await runAtomicMutation(async () => {
      await db.$queryRaw`SELECT pg_advisory_xact_lock(19041005)::text`;
      await checkUserManagement(actor, id);

      const target = await getUserById(id);
      if (!target) throw new Error("User not found");

      if (target.role === "super_admin") {
        const activeSuperAdmins = await db.user.count({
          where: {
            role: "super_admin",
            isActive: true,
            suspendedAt: null,
            archivedAt: null,
          },
        });
        if (activeSuperAdmins <= 1) {
          throw new Error("Cannot delete the last active Super Admin");
        }
      }

      // Check if user has associated financial, audit, invoice, or payroll records
      const [invoiceCount, expenseCount, approvalCount, activityCount] =
        await Promise.all([
          db.invoice.count({ where: { createdById: id } }),
          db.expense.count({ where: { createdById: id } }),
          db.approvalRequest.count({ where: { requestedById: id } }),
          db.activityLog.count({ where: { userId: id } }),
        ]);

      if (
        invoiceCount > 0 ||
        expenseCount > 0 ||
        approvalCount > 0 ||
        activityCount > 5
      ) {
        throw new Error(
          "User cannot be deleted because they have associated financial, audit, or workflow records. Archive the user instead.",
        );
      }

      if (!(await deleteUser(id))) throw new Error("User deletion failed");
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

/** Per-user discount margin: discounts up to this % of the subtotal need no approval. Null = company default. */
export async function updateUserDiscountLimitAction(id: string, limit: number | null) {
  return measureOperation("action:updateUserDiscountLimitAction", async () => {
    const actor = await requirePermission("users", "write");
    validateActionArguments("updateUserDiscountLimitAction", { id, limit });
    const result = await runAtomicMutation(async () => {
      const before = await db.user.findUniqueOrThrow({ where: { id }, select: { discountLimitPercent: true } });
      const result = await setUserDiscountLimit(id, limit);
      await createActivityLog({
        user_id: actor.id,
        action: "update",
        entity_type: "user",
        entity_id: id,
        details: { discountLimitPercent: { from: before.discountLimitPercent == null ? null : Number(before.discountLimitPercent), to: result.discount_limit_percent } },
      });
      return result;
    });
    revalidatePath(ROUTES.users.list);
    return { success: true, ...result };
  });
}

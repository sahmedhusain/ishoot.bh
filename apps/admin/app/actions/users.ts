"use server";
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

      const user = await createUser({
        ...data,
        password: initialPassword,
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
          manager_id: data.manager_id,
        },
      });
      return { user };
    });

    revalidatePath("/dashboard/users");
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

      const user = await updateUserRole(id, role);
      if (!user) throw new Error("User role update failed");
      await createActivityLog({
        user_id: actor.id,
        action: "update",
        entity_type: "user",
        entity_id: id,
        details: { newRole: role },
      });
      return { user };
    });

    revalidatePath("/dashboard/users");
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
        details: { updatedFields: Object.keys(data) },
      });
      return { user };
    });

    revalidatePath("/dashboard/users");
    return { success: true, user };
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

      if (!(await deleteUser(id))) throw new Error("User deletion failed");
      await createActivityLog({
        user_id: actor.id,
        action: "delete",
        entity_type: "user",
        entity_id: id,
      });
      return {};
    });

    revalidatePath("/dashboard/users");
    return { success: true };
  });
}

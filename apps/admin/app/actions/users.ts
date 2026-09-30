"use server";

import {
  createUser,
  updateUserRole,
  updateUser,
  deleteUser,
  createActivityLog,
  UserRole,
} from "@ishoot/database";
import { revalidatePath } from "next/cache";
import { requirePermission } from "../../lib/auth";

export async function createUserAction(data: {
  email: string;
  password?: string;
  full_name: string;
  role: UserRole;
  phone?: string;
  department?: string;
}) {
  const actor = await requirePermission("users", "write");
  const initialPassword = data.password
    ? data.password
    : (process.env.DEFAULT_USER_PASSWORD ? process.env.DEFAULT_USER_PASSWORD : "");
  if (!initialPassword) {
    throw new Error("Password is required to create a user");
  }

  const user = await createUser({
    ...data,
    password: initialPassword,
  });

  await createActivityLog({
    user_id: actor.id,
    action: "create",
    entity_type: "user",
    entity_id: user.id,
    details: { email: user.email, role: user.role },
  });

  revalidatePath("/dashboard/users");
  return { success: true, user };
}

export async function updateUserRoleAction(id: string, role: UserRole) {
  const actor = await requirePermission("users", "write");
  const user = await updateUserRole(id, role);

  await createActivityLog({
    user_id: actor.id,
    action: "update",
    entity_type: "user",
    entity_id: id,
    details: { newRole: role },
  });

  revalidatePath("/dashboard/users");
  return { success: true, user };
}


export async function deleteUserAction(id: string) {
  const actor = await requirePermission("users", "delete");
  await deleteUser(id);

  await createActivityLog({
    user_id: actor.id,
    action: "delete",
    entity_type: "user",
    entity_id: id,
  });

  revalidatePath("/dashboard/users");
  return { success: true };
}

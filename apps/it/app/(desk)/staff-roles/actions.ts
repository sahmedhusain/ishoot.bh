"use server";
import { revalidatePath } from "next/cache";
import {
  createStaffRoleForIT,
  updateStaffRoleForIT,
  deleteStaffRoleForIT,
  type StaffRoleDraft,
} from "@platform/api-client";
import { asUser, requireAllowed } from "../../../lib/session";
import { staffCommand } from "../../../lib/identity-errors";
export async function saveStaffRoleAction(
  draft: StaffRoleDraft,
  create: boolean,
) {
  const user = await requireAllowed("staff_roles", create ? "create" : "edit");
  const result = await asUser(() =>
    staffCommand(() =>
      create
        ? createStaffRoleForIT(user.token, draft)
        : updateStaffRoleForIT(user.token, draft.id, draft),
    ),
  );
  revalidatePath("/staff-roles");
  revalidatePath("/staff-accounts");
  return result;
}
export async function deleteStaffRoleAction(id: string) {
  const user = await requireAllowed("staff_roles", "delete");
  const result = await asUser(() =>
    staffCommand(() => deleteStaffRoleForIT(user.token, id)),
  );
  revalidatePath("/staff-roles");
  return result;
}

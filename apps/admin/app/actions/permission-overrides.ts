"use server";
import { revalidatePath } from "next/cache";
import {
  ALL_ACTIONS,
  ALL_RESOURCES,
  createActivityLog,
  measureOperation,
  runAtomicMutation,
} from "@platform/database";
import { ROUTES } from "../../constants/routes";
import { validateActionArguments } from "../../lib/action-input";
import { requirePermission } from "../../lib/auth";

export async function setUserPermissionOverridesAction(
  userId: string,
  overrides: Record<string, boolean>,
) {
  return measureOperation(
    "action:setUserPermissionOverridesAction",
    async () => {
      const actor = await requirePermission("users", "write");
      validateActionArguments("setUserPermissionOverridesAction", {
        userId,
        overrides,
      });
      if (actor.role !== "super_admin")
        throw new Error(
          "Only super administrators can manage role permissions",
        );
      const valid = new Set(
        ALL_RESOURCES.flatMap((resource) =>
          ALL_ACTIONS.map((action) => `${resource}:${action}`),
        ),
      );
      for (const [key, value] of Object.entries(overrides))
        if (
          !valid.has(key) ||
          key.endsWith(":write") ||
          typeof value !== "boolean"
        )
          throw new Error("Invalid permission resource");
      if (userId === "super-admin" || userId === "usr_super_admin")
        throw new Error("Super Admin accounts are never changed here");
      const stored: Record<string, boolean> = { ...overrides };
      for (const resource of ALL_RESOURCES) {
        const create = overrides[`${resource}:create`];
        const edit = overrides[`${resource}:edit`];
        if (create !== undefined || edit !== undefined)
          stored[`${resource}:write`] = create === true || edit === true;
      }
      await runAtomicMutation(async () => {
        await createActivityLog({
          user_id: actor.id,
          action: "update_permissions",
          entity_type: "user",
          entity_id: userId,
          diff_payload: { before: {}, after: stored },
        });
      });
      revalidatePath(ROUTES.users.list);
      revalidatePath(ROUTES.home, "layout");
      return { success: true };
    },
  );
}

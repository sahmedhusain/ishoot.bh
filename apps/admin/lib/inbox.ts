// Who the signed-in person is to the notify and realtime services (docs/adr/0012). The admin still owns staff sign-in
// and permissions, so it tells the services which notification categories and live topics the person may have.
import { allowedCategories } from "@platform/contracts";
import type { InboxOwner } from "@platform/api-client";
import { getCurrentPermissions, requireAuth } from "./auth";

/** Whether the signed-in person holds a permission (super admins hold every one). */
async function allows() {
  const [user, permissions] = await Promise.all([requireAuth(), getCurrentPermissions()]);
  return {
    user,
    allows: (resource: string, action: string) =>
      user.role === "super_admin" || permissions[`${resource}:${action}`] === true,
  };
}

/** The signed-in person's inbox, limited to the categories their permissions allow. */
export async function myInboxOwner(): Promise<InboxOwner> {
  const { user, allows: can } = await allows();
  return { realm: "staff", userId: user.id, categories: allowedCategories("staff", can) };
}

/** The live topic of a permission resource: everyone who may read it hears when its records change. */
export const resourceTopic = (resource: string) => `staff.res.${resource}`;

/** Every staff member's stream follows this topic (company-wide updates). */
export const STAFF_TOPIC = "staff.all";

/** The topics the signed-in person's stream follows: company-wide, and each resource they may read. */
export async function myLiveTopics(resources: readonly string[]): Promise<string[]> {
  const { allows: can } = await allows();
  return [STAFF_TOPIC, ...resources.filter((r) => can(r, "read")).map(resourceTopic)];
}

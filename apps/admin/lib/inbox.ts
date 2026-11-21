import { allowedCategories } from "@platform/contracts";
import type { InboxOwner } from "@platform/api-client";
import { getCurrentPermissions, requireAuth } from "./auth";

async function allows(existingUser?: { id: string; role: string }) {
  const user = existingUser ?? (await requireAuth());
  const permissions = await getCurrentPermissions().catch(() => ({} as Record<string, boolean>));
  return {
    user,
    allows: (resource: string, action: string) =>
      user.role === "super_admin" || permissions[`${resource}:${action}`] === true,
  };
}

export async function myInboxOwner(existingUser?: { id: string; role: string }): Promise<InboxOwner> {
  const { user, allows: can } = await allows(existingUser);
  return { realm: "staff", userId: user.id, categories: allowedCategories("staff", can) };
}

export const resourceTopic = (resource: string) => `staff.res.${resource}`;

export const STAFF_TOPIC = "staff.all";

export async function myLiveTopics(resources: readonly string[]): Promise<string[]> {
  const { allows: can } = await allows();
  return [STAFF_TOPIC, ...resources.filter((r) => can(r, "read")).map(resourceTopic)];
}

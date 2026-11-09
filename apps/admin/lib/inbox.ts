import { allowedCategories } from "@platform/contracts";
import type { InboxOwner } from "@platform/api-client";
import { getCurrentPermissions, requireAuth } from "./auth";

async function allows() {
  const [user, permissions] = await Promise.all([requireAuth(), getCurrentPermissions()]);
  return {
    user,
    allows: (resource: string, action: string) =>
      user.role === "super_admin" || permissions[`${resource}:${action}`] === true,
  };
}

export async function myInboxOwner(): Promise<InboxOwner> {
  const { user, allows: can } = await allows();
  return { realm: "staff", userId: user.id, categories: allowedCategories("staff", can) };
}

export const resourceTopic = (resource: string) => `staff.res.${resource}`;

export const STAFF_TOPIC = "staff.all";

export async function myLiveTopics(resources: readonly string[]): Promise<string[]> {
  const { allows: can } = await allows();
  return [STAFF_TOPIC, ...resources.filter((r) => can(r, "read")).map(resourceTopic)];
}

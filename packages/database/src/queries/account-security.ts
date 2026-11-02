// A staff member's own sign-in security lives in identity (backend/services/identity): the admin calls it with the
// person's token. These record what they did in the admin's activity log.
import { db } from "../db";

export type OwnSecurityAction = "change_password" | "revoke_session" | "revoke_other_sessions";

export async function logOwnSecurityChange(userId: string, action: OwnSecurityAction, entityId = userId) {
  await db.activityLog.create({
    data: { userId, action, entityType: action === "revoke_session" ? "session" : "auth", entityId },
  });
}

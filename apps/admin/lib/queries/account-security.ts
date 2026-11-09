import { db } from "../atomic";

export type OwnSecurityAction = "change_password" | "revoke_session" | "revoke_other_sessions";

export async function logOwnSecurityChange(userId: string, action: OwnSecurityAction, entityId = userId) {
  await db.activityLog.create({
    data: { userId, action, entityType: action === "revoke_session" ? "session" : "auth", entityId },
  });
}

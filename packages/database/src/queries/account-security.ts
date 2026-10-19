import { serverMessages } from "@ishoot/locales";
import bcrypt from "bcryptjs";
import { db, runAtomicMutation } from "../db";
import { PASSWORD_HASH_ROUNDS } from "./users";
import { verifyMfa } from "../services/mfa";
/** Change only the authenticated account; verify current credentials and revoke every old session atomically. */
export async function changeOwnPassword(
  userId: string,
  input: { currentPassword: string; newPassword: string; code?: string },
) {
  if (
    input.newPassword.length < 12 ||
    Buffer.byteLength(input.newPassword, "utf8") > 72
  )
    throw new Error(
      serverMessages.profileSecurityError0,
    );
  if (!input.currentPassword || input.currentPassword.length > 1024)
    throw new Error(serverMessages.profileSecurityError1);
  return runAtomicMutation(async () => {
    await db.$queryRaw`SELECT id FROM "User" WHERE id=${userId} FOR UPDATE`;
    const user = await db.user.findUniqueOrThrow({
      where: { id: userId },
      select: { passwordHash: true, isActive: true, mfaEnabled: true },
    });
    if (
      !user.isActive ||
      !(await bcrypt.compare(input.currentPassword, user.passwordHash))
    )
      throw new Error(serverMessages.profileSecurityError1);
    if (await bcrypt.compare(input.newPassword, user.passwordHash))
      throw new Error(serverMessages.profileSecurityError2);
    if (user.mfaEnabled && !(await verifyMfa(userId, input.code ?? "")))
      throw new Error(serverMessages.profileSecurityError3);
    await db.user.update({
      where: { id: userId },
      data: {
        passwordHash: await bcrypt.hash(
          input.newPassword,
          PASSWORD_HASH_ROUNDS,
        ),
      },
    });
    await db.session.deleteMany({ where: { userId } });
    await db.authChallenge.deleteMany({
      where: { userId, type: { in: ["password_reset", "invitation"] } },
    });
    await db.activityLog.create({
      data: {
        userId,
        action: "change_password",
        entityType: "auth",
        entityId: userId,
      },
    });
  });
}
export async function revokeOwnSession(
  userId: string,
  id: string,
  currentSessionId?: string,
) {
  if (id === currentSessionId)
    throw new Error(serverMessages.profileSecurityError4);
  return runAtomicMutation(async () => {
    const result = await db.session.deleteMany({ where: { id, userId } });
    if (!result.count) throw new Error(serverMessages.profileSecurityError5);
    await db.activityLog.create({
      data: {
        userId,
        action: "revoke_session",
        entityType: "session",
        entityId: id,
      },
    });
  });
}
export async function revokeOtherSessions(
  userId: string,
  currentSessionId: string,
) {
  return runAtomicMutation(async () => {
    await db.session.deleteMany({
      where: { userId, id: { not: currentSessionId } },
    });
    await db.activityLog.create({
      data: {
        userId,
        action: "revoke_other_sessions",
        entityType: "auth",
        entityId: userId,
      },
    });
  });
}

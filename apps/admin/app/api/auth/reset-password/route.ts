import { serverMessages } from "@platform/locales";

import { measureOperation, db, consumeAbuseLimit } from "@platform/database";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { sendEmail } from "@platform/email";

export async function POST(req: NextRequest) {
  return measureOperation("admin:auth/reset-password:POST", async () => {
    try {
      const { email, token, newPassword } = await req.json();
      if (!email || !token || !newPassword || typeof newPassword !== "string") {
        return NextResponse.json(
          { error: serverMessages.runtimeMissingRequiredFields },
          { status: 400 },
        );
      }

      const emailNorm = email.trim().toLowerCase();
      await consumeAbuseLimit("reset-password", emailNorm, 5); // 5 attempts per minute

      const challenges = await db.authChallenge.findMany({
        where: {
          email: emailNorm,
          type: { in: ["password_reset", "invitation"] },
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: "desc" },
      });

      let validChallenge = null;
      for (const challenge of challenges) {
        if (challenge.attempts >= 3) continue;
        const isValid = await bcrypt.compare(token, challenge.codeHash);

        await db.authChallenge.update({
          where: { id: challenge.id },
          data: { attempts: { increment: 1 } },
        });

        if (isValid && challenge.attempts < 3) {
          validChallenge = challenge;
          break;
        }
      }

      if (!validChallenge || !validChallenge.userId) {
        return NextResponse.json(
          { error: serverMessages.runtimeInvalidOrExpiredResetLink },
          { status: 400 },
        );
      }

      const user = await db.user.findUnique({
        where: { id: validChallenge.userId },
      });
      if (!user || !user.isActive) {
        return NextResponse.json(
          { error: serverMessages.runtimeUserAccountIsInactiveOrNotFound },
          { status: 400 },
        );
      }

      const newPasswordHash = await bcrypt.hash(newPassword, 12);

      await db.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: user.id },
          data: { passwordHash: newPasswordHash },
        });

        // Revoke all existing sessions
        await tx.session.deleteMany({
          where: { userId: user.id },
        });

        // Consume all pending challenges of this type for the user
        await tx.authChallenge.deleteMany({
          where: {
            userId: user.id,
            type: { in: ["password_reset", "invitation"] },
          },
        });
      });

      await sendEmail({
        to: user.email,
        subject: "Security Alert: Password Changed",
        html: `<p>Hello ${user.fullName},</p><p>Your password was just changed. If you did not perform this action, please contact your administrator immediately.</p>`,
      });

      return NextResponse.json({ success: true });
    } catch (err: any) {
      if (err instanceof Error && err.message === "RATE_LIMIT") {
        return NextResponse.json(
          { error: serverMessages.runtimeTooManyAttemptsTryAgainLater },
          { status: 429 },
        );
      }
      return NextResponse.json(
        { error: serverMessages.internalServerErrorLower },
        { status: 500 },
      );
    }
  });
}

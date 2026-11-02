import { trustedClientIp } from "@platform/database/services/abuse-limits";
import { serverMessages } from "@platform/locales";

import { measureOperation, consumeAbuseLimit } from "@platform/database";
import { getSessionUser } from "@platform/database/queries/sessions";
import { NextRequest, NextResponse } from "next/server";
import { confirmPasswordReset, isApiError, queueMessage } from "@platform/api-client";
import { escapeEmailHtml } from "@platform/email";
import { REALM } from "../../../../lib/identity-session";

/** Uses an identity reset link once to set a new password; identity ends every session of the account. */
export async function POST(req: NextRequest) {
  return measureOperation("admin:auth/reset-password:POST", async () => {
    try {
      const { email, token, newPassword } = await req.json();
      if (
        !email ||
        !token ||
        !newPassword ||
        typeof newPassword !== "string" ||
        typeof token !== "string"
      ) {
        return NextResponse.json(
          { error: serverMessages.runtimeMissingRequiredFields },
          { status: 400 },
        );
      }
      await consumeAbuseLimit(
        "reset-password",
        String(email).trim().toLowerCase().slice(0, 254),
        trustedClientIp(req.headers),
        5,
      ); // 5 per minute

      let subjectId: string;
      try {
        ({ subjectId } = await confirmPasswordReset(
          REALM,
          token.slice(0, 64),
          newPassword.slice(0, 1024),
          String(email).trim().toLowerCase().slice(0, 254),
          trustedClientIp(req.headers),
        ));
      } catch (error) {
        if (isApiError(error, "reset_invalid"))
          return NextResponse.json(
            { error: serverMessages.runtimeInvalidOrExpiredResetLink },
            { status: 400 },
          );
        if (isApiError(error) && error.status === 422)
          return NextResponse.json(
            { error: serverMessages.profileSecurityError0 },
            { status: 400 },
          );
        throw error;
      }
      const user = await getSessionUser(subjectId);
      await queueMessage({
        channel: "email",
        to: String(email).trim().toLowerCase(),
        subject: "Security Alert: Password Changed",
        text: `Hello ${user?.full_name || String(email).trim()},\n\nYour password was just changed. If you did not perform this action, please contact your administrator immediately.`,
        html: `<p>Hello ${escapeEmailHtml(user?.full_name || String(email).trim())},</p><p>Your password was just changed. If you did not perform this action, please contact your administrator immediately.</p>`,
        actorId: "identity",
        idempotencyKey: `pwd-changed:${subjectId}:${Date.now()}`,
      });
      return NextResponse.json({ success: true });
    } catch (err) {
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

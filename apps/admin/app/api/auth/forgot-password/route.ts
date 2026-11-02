import { trustedClientIp } from "@platform/database/services/abuse-limits";
import { serverMessages, getTranslations } from "@platform/locales";

import { measureOperation, consumeAbuseLimit } from "@platform/database";
import { getSessionUser } from "@platform/database/queries/sessions";
import { NextRequest, NextResponse } from "next/server";
import { requestPasswordReset, queueMessage } from "@platform/api-client";
import { escapeEmailHtml } from "@platform/email";
import { publicOrigin } from "../../../../lib/public-origin";
import { REALM } from "../../../../lib/identity-session";

/** E-mails a one-use reset link issued by identity. Answers the same whether or not the address has an account. */
export async function POST(req: NextRequest) {
  return measureOperation("admin:auth/forgot-password:POST", async () => {
    try {
      const { email } = await req.json();
      if (!email || typeof email !== "string" || !email.trim()) {
        return NextResponse.json(
          { error: serverMessages.runtimeEmailIsRequired },
          { status: 400 },
        );
      }
      const emailNorm = email.trim().toLowerCase().slice(0, 254);
      await consumeAbuseLimit("forgot-password", emailNorm, 3); // 3 per minute

      const reset = await requestPasswordReset(
        REALM,
        emailNorm,
        trustedClientIp(req.headers),
      );
      const user = reset ? await getSessionUser(reset.subjectId) : null;
      if (reset) {
        const resetUrl = `${await publicOrigin()}/login/reset?token=${encodeURIComponent(reset.token)}&email=${encodeURIComponent(emailNorm)}`;
        await queueMessage({
          channel: "email",
          to: reset.email,
          subject: "Password Reset Request",
          text: `Hello ${user?.full_name || reset.email},\n\nYou requested a password reset. Open the following link to reset your password:\n${resetUrl}\n\nIf you did not request this, please ignore this email.\nThis link expires in 15 minutes.`,
          html: `<p>Hello ${escapeEmailHtml(user?.full_name || reset.email)},</p><p>You requested a password reset. Click the link below to reset your password:</p><p><a href="${escapeEmailHtml(resetUrl)}">Reset Password</a></p><p>If you did not request this, please ignore this email.</p><p>This link expires in 15 minutes.</p>`,
          actorId: "identity",
          idempotencyKey: `pwd-reset:${reset.token}`,
        });
      }
      // Always return success to prevent user enumeration
      return NextResponse.json({
        success: true,
        message: getTranslations("en").admin.copy.resetLinkSent,
      });
    } catch (err) {
      if (err instanceof Error && err.message === "RATE_LIMIT") {
        return NextResponse.json(
          { error: serverMessages.runtimeTooManyRequestsTryAgainLater },
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

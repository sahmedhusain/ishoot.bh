import { serverMessages, getTranslations } from "@ishoot/locales";


import { measureOperation, db, consumeAbuseLimit } from "@ishoot/database";
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { sendEmail } from "@ishoot/email";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  return measureOperation("admin:auth/forgot-password:POST", async () => {
    try {
      const { email } = await req.json();
      if (!email || typeof email !== "string" || !email.trim()) {
        return NextResponse.json({ error: serverMessages.runtimeEmailIsRequired }, { status: 400 });
      }

      const emailNorm = email.trim().toLowerCase();
      await consumeAbuseLimit("forgot-password", emailNorm, 3); // 3 per minute

      const user = await db.user.findUnique({ where: { email: emailNorm } });
      
      if (user && user.isActive) {
        const resetToken = crypto.randomBytes(32).toString("hex");
        const codeHash = await bcrypt.hash(resetToken, 10);
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

        await db.authChallenge.create({
          data: {
            userId: user.id,
            email: emailNorm,
            type: "password_reset",
            codeHash,
            expiresAt
          }
        });

        const resetUrl = `${process.env.ADMIN_APP_URL || "http://localhost:3000"}/login/reset?token=${resetToken}&email=${encodeURIComponent(emailNorm)}`;
        
        await sendEmail({
          to: user.email,
          subject: "Password Reset Request",
          html: `<p>Hello ${user.fullName},</p><p>You requested a password reset. Click the link below to reset your password:</p><p><a href="${resetUrl}">Reset Password</a></p><p>If you did not request this, please ignore this email.</p><p>This link expires in 15 minutes.</p>`
        });
      }

      // Always return success to prevent user enumeration
      return NextResponse.json({ success: true, message: getTranslations("en").admin.copy.resetLinkSent });
    } catch (err: any) {
      if (err instanceof Error && err.message === "RATE_LIMIT") {
        return NextResponse.json({ error: serverMessages.runtimeTooManyRequestsTryAgainLater }, { status: 429 });
      }
      return NextResponse.json({ error: serverMessages.internalServerErrorLower }, { status: 500 });
    }
  });
}

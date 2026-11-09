import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { requestPasswordReset, queueMessage } from "@platform/api-client";
import { REALM } from "../../../../lib/credentials";
import { itPublicOrigin } from "../../../../lib/origin";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email || typeof email !== "string" || !email.trim()) {
      return NextResponse.json(
        { error: "Email or username is required" },
        { status: 400 },
      );
    }
    const emailNorm = email.trim().toLowerCase().slice(0, 254);
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined;

    const reset = await requestPasswordReset(REALM, emailNorm, clientIp);
    if (reset) {
      const origin = await itPublicOrigin();
      const resetUrl = `${origin}/login/reset?token=${encodeURIComponent(reset.token)}&email=${encodeURIComponent(emailNorm)}`;
      await queueMessage({
        channel: "email",
        to: reset.email,
        subject: "IT Account Password Reset Request",
        text: `Hello,\n\nYou requested a password reset for your IT account. Open the following link to reset your password:\n${resetUrl}\n\nIf you did not request this, please ignore this email.\nThis link expires in 15 minutes.`,
        html: `<p>Hello,</p><p>You requested a password reset for your IT account. Click the link below to reset your password:</p><p><a href="${resetUrl}">Reset IT Password</a></p><p>If you did not request this, please ignore this email.</p><p>This link expires in 15 minutes.</p>`,
        actorId: "identity",
        idempotencyKey: `it-pwd-reset:${createHash("sha256").update(reset.token).digest("hex")}`,
      });
    }

    return NextResponse.json({
      success: true,
      message: "If an IT account exists with this address, a reset link has been dispatched.",
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

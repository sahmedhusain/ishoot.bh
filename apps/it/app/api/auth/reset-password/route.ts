import { NextRequest, NextResponse } from "next/server";
import { confirmPasswordReset, isApiError, queueMessage } from "@platform/api-client";
import { REALM } from "../../../../lib/credentials";

export async function POST(req: NextRequest) {
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
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const emailNorm = String(email).trim().toLowerCase().slice(0, 254);
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined;

    let subjectId: string;
    try {
      ({ subjectId } = await confirmPasswordReset(
        REALM,
        token.slice(0, 64),
        newPassword.slice(0, 1024),
        emailNorm,
        clientIp,
      ));
    } catch (error) {
      if (isApiError(error, "reset_invalid")) {
        return NextResponse.json(
          { error: "Invalid or expired reset link" },
          { status: 400 },
        );
      }
      throw error;
    }

    await queueMessage({
      channel: "email",
      to: emailNorm,
      subject: "Security Alert: IT Password Changed",
      text: `Hello,\n\nYour IT account password was just changed. If you did not perform this action, please contact your administrator immediately.`,
      html: `<p>Hello,</p><p>Your IT account password was just changed. If you did not perform this action, please contact your administrator immediately.</p>`,
      actorId: "identity",
      idempotencyKey: `it-pwd-changed:${subjectId}:${Date.now()}`,
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

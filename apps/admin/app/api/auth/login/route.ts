import { measureOperation } from "@ishoot/database";
import { NextRequest, NextResponse } from "next/server";
import {
  verifyUserCredentials,
  db,
  verifyMfa,
  createSession,
  createActivityLog,
  consumeAbuseLimit,
  trustedClientIp,
  runAtomicMutation,
} from "@ishoot/database";
import { readLoginInput } from "../../../../lib/login-input";
import { getTranslations } from "@ishoot/locales";
import { signSessionToken } from "../../../../lib/jwt";
import {
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_OPTIONS,
} from "../../../../lib/auth";

export async function POST(req: NextRequest) {
  return measureOperation("admin:auth/login:POST", async () => {
  const trans = getTranslations("en");
  try {
    const body = await readLoginInput(req);
    const { email, password } = body;

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      !password ||
      email.length > 254 ||
      password.length > 1024
    ) {
      return NextResponse.json(
        { error: trans.api.auth.requiredFields },
        { status: 400 },
      );
    }

    await consumeAbuseLimit("login-account", email.trim().toLowerCase(), 10);
    const user = await verifyUserCredentials(email, password);
    if (!user) {
      return NextResponse.json(
        { error: trans.api.auth.invalidCredentials },
        { status: 401 },
      );
    }

    return await runAtomicMutation(async () => {
      await db.$queryRaw`SELECT id FROM "User" WHERE id=${user.id} FOR UPDATE`;
    const security = await db.user.findUniqueOrThrow({ where: { id: user.id }, select: { mfaEnabled: true, isActive: true } });
    if (!security.isActive) return NextResponse.json({error: trans.api.auth.invalidCredentials}, {status:401});
    if (security.mfaEnabled && (typeof body.otp !== "string" || !(await verifyMfa(user.id, body.otp)))) {
      return NextResponse.json({ error: "Enter an authentication or recovery code", mfaRequired: true }, { status: 401, headers: { "Cache-Control": "no-store" } });
    }

    const token = await signSessionToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      fullName: user.full_name,
    });

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const ipAddress = trustedClientIp(req.headers);
    const userAgent = req.headers.get("user-agent") || undefined;

    await runAtomicMutation(async () => {
    await createSession({
      userId: user.id,
      token,
      expiresAt,
      ipAddress,
      userAgent,
    });

    await createActivityLog({
      user_id: user.id,
      action: "login",
      entity_type: "auth",
      entity_id: user.id,
      details: { role: user.role, department: user.department },
      ip_address: ipAddress,
      user_agent: userAgent,
    });

    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        role: user.role,
        department: user.department,
        avatarUrl: user.avatar_url,
      },
    });

    response.cookies.set(SESSION_COOKIE_NAME, token, SESSION_COOKIE_OPTIONS);

    return response;
    });
  } catch (err: any) {
    if (err instanceof Error && err.message === "RATE_LIMIT")
      return NextResponse.json(
        { error: "Too many login attempts. Try again in a minute." },
        { status: 429, headers: { "Retry-After": "60" } },
      );
    if (err instanceof Error && err.message === "INVALID_INPUT")
      return NextResponse.json(
        { error: trans.api.auth.requiredFields },
        { status: 400 },
      );
    console.error("Login error:", err);
    return NextResponse.json(
      { error: trans.api.auth.serverError },
      { status: 500 },
    );
  }

  });
}

import { serverMessages, getTranslations } from "@ishoot/locales";
import { NextRequest, NextResponse, after } from "next/server";
import { db, runAtomicMutation } from "@ishoot/database/db";
import { measureOperation } from "@ishoot/database/observability";
import { verifyUserCredentials } from "@ishoot/database/queries/users";
import { createSession } from "@ishoot/database/queries/sessions";
import { createActivityLog } from "@ishoot/database/queries/activity";
import { consumeAbuseLimit, trustedClientIp } from "@ishoot/database/services/abuse-limits";
import { verifyMfa } from "@ishoot/database/services/mfa";
import { readLoginInput } from "../../../../lib/login-input";

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
    const [security] = await db.$queryRaw<Array<{ mfaEnabled: boolean; isActive: boolean }>>`SELECT "mfaEnabled", "isActive" FROM "User" WHERE id=${user.id} FOR UPDATE`;
    if (!security?.isActive) return NextResponse.json({error: trans.api.auth.invalidCredentials}, {status:401});
    if (security.mfaEnabled && (typeof body.otp !== "string" || !(await verifyMfa(user.id, body.otp)))) {
      return NextResponse.json({ error: serverMessages.runtimeEnterAnAuthenticationOrRecoveryCode, mfaRequired: true }, { status: 401, headers: { "Cache-Control": "no-store" } });
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

    await createSession({
      userId: user.id,
      token,
      expiresAt,
      ipAddress,
      userAgent,
    });

    // Audit write is not needed to answer the login; run it after the response is sent.
    after(() => createActivityLog({
      user_id: user.id,
      action: "login",
      entity_type: "auth",
      entity_id: user.id,
      details: { role: user.role, department: user.department },
      ip_address: ipAddress,
      user_agent: userAgent,
    }).catch((error) => console.error("Login activity log failed:", error)));

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
        { error: serverMessages.runtimeTooManyLoginAttemptsTryAgainInAMinute },
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

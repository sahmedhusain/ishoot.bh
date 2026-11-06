import { serverMessages, getTranslations } from "@platform/locales";
import { NextRequest, NextResponse, after } from "next/server";
import { isApiError, signIn, type LoginCredential } from "@platform/api-client";
import { outsideTransaction } from "@platform/database/db";
import { measureOperation } from "@platform/database/observability";
import { getSessionUser } from "@platform/database/queries/sessions";
import { createActivityLog } from "@platform/database/queries/activity";
import { trustedClientIp } from "@platform/database/services/abuse-limits";
import { readLoginInput } from "../../../../lib/login-input";
import { REALM, sessionCookies } from "../../../../lib/identity-session";

/**
 * Staff sign-in through identity, which checks the password and, when two-step sign-in is on, the authenticator or
 * recovery code, and limits attempts per account and address. The session lives in httpOnly cookies.
 */
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
        return NextResponse.json({ error: trans.api.auth.requiredFields }, { status: 400 });
      }
      const ipAddress = trustedClientIp(req.headers);
      const userAgent = req.headers.get("user-agent")?.slice(0, 512) || undefined;
      let credential: LoginCredential;
      try {
        credential = await signIn(REALM, {
          email: email.trim().toLowerCase(),
          password,
          otp: typeof body.otp === "string" && body.otp ? body.otp.replace(/\s+/g, "").slice(0, 64) : undefined,
          clientIp: ipAddress?.slice(0, 45),
          userAgent,
        });
      } catch (error) {
        if (isApiError(error, "mfa_required"))
          return NextResponse.json(
            { error: serverMessages.runtimeEnterAnAuthenticationOrRecoveryCode, mfaRequired: true },
            { status: 401, headers: { "Cache-Control": "no-store" } },
          );
        if (isApiError(error) && error.status === 429)
          return NextResponse.json(
            { error: serverMessages.runtimeTooManyLoginAttemptsTryAgainInAMinute },
            { status: 429, headers: { "Retry-After": "60" } },
          );
        if (isApiError(error) && (error.status === 401 || error.status === 422))
          return NextResponse.json({ error: trans.api.auth.invalidCredentials }, { status: 401 });
        throw error;
      }
      let user = await getSessionUser(credential.subjectId);
      if (!user) {
        const primaryRole = (credential.roles && credential.roles[0]) || "super_admin";
        user = {
          id: credential.subjectId,
          full_name: credential.subjectId === "super-admin"
            ? (process.env.SUPER_ADMIN_NAME || "Super Admin")
            : email.split("@")[0],
          email: email.trim().toLowerCase(),
          role: primaryRole as any,
          is_active: true,
          department: "executive",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      }

      // The audit write is not needed to answer the login; run it after the response is sent.
      after(() =>
        outsideTransaction(() =>
          createActivityLog({
            user_id: user.id,
            action: "login",
            entity_type: "auth",
            entity_id: user.id,
            details: { role: user.role, department: user.department },
            ip_address: ipAddress,
            user_agent: userAgent,
          }),
        ).catch((error) => console.error("Login activity log failed:", error)),
      );

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
      for (const c of sessionCookies(credential)) response.cookies.set(c.name, c.value, c.options);
      return response;
    } catch (err) {
      if (err instanceof Error && err.message === "INVALID_INPUT")
        return NextResponse.json({ error: trans.api.auth.requiredFields }, { status: 400 });
      console.error("Login error:", err);
      return NextResponse.json({ error: trans.api.auth.serverError }, { status: 500 });
    }
  });
}

import { serverMessages } from "@platform/locales";

import { measureOperation } from "@platform/database";
import { NextRequest, NextResponse } from "next/server";
import { consumeAbuseLimit, getCompanySettings } from "@platform/database";
import {
  beginMFAEnrollment,
  cancelMFAEnrollment,
  confirmMFAEnrollment,
  disableMFA,
  isApiError,
} from "@platform/api-client";
import { getCurrentUser, getStaffToken } from "../../../../lib/auth";
import { readLoginInput } from "../../../../lib/login-input";

/** Manages the signed-in person's authenticator through identity, which rechecks the password on every step. */
export async function POST(req: NextRequest) {
  return measureOperation("admin:auth/mfa:POST", async () => {
    const user = await getCurrentUser();
    const token = (await getStaffToken())?.token;
    if (!user || !token)
      return NextResponse.json(
        { error: serverMessages.unauthorized },
        { status: 401 },
      );
    try {
      await consumeAbuseLimit("mfa-management", user.id, 10);
      const input = await readLoginInput(req);
      if (typeof input.password !== "string" || input.password.length > 1024)
        return NextResponse.json(
          { error: serverMessages.runtimePasswordVerificationFailed },
          { status: 401 },
        );
      const password = input.password;
      const headers = { "Cache-Control": "private, no-store" };
      if (input.mode === "enroll") {
        const company = await getCompanySettings();
        const setup = await beginMFAEnrollment(token, password);
        const issuer = company.company_name_en;
        const uri = `otpauth://totp/${encodeURIComponent(issuer + ":" + user.email)}?${new URLSearchParams({ secret: setup.secret, issuer, algorithm: "SHA1", digits: String(setup.digits), period: String(setup.periodSeconds) })}`;
        return NextResponse.json({ secret: setup.secret, uri }, { headers });
      }
      if (input.mode === "cancel") {
        await cancelMFAEnrollment(token, password);
        return NextResponse.json({ cancelled: true }, { headers });
      }
      if (typeof input.code !== "string" || input.code.length > 32)
        throw new Error("Invalid code");
      // Identity ends every session of the account, this one included, once the authenticator changes.
      if (input.mode === "confirm") {
        const { recoveryCodes } = await confirmMFAEnrollment(token, password, input.code);
        return NextResponse.json({ recoveryCodes, enabled: true }, { headers });
      }
      if (input.mode === "disable") {
        await disableMFA(token, password, input.code);
        return NextResponse.json({ enabled: false }, { headers });
      }
      return NextResponse.json(
        { error: serverMessages.runtimeInvalidOperation },
        { status: 400 },
      );
    } catch (error) {
      if (error instanceof Error && error.message === "RATE_LIMIT")
        return NextResponse.json(
          { error: serverMessages.runtimeTooManyAttempts },
          { status: 429 },
        );
      if (isApiError(error) && error.status === 429)
        return NextResponse.json(
          { error: serverMessages.runtimeTooManyAttempts },
          { status: 429 },
        );
      return NextResponse.json(
        {
          error:
            serverMessages.runtimeMFAOperationFailedCheckTheCodeExpiryAndServerConfiguration,
        },
        { status: 400 },
      );
    }
  });
}

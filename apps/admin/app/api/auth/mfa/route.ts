import { measureOperation } from "@ishoot/database";
import { NextRequest, NextResponse } from "next/server";
import { beginMfaEnrollment, completeMfaEnrollment, disableMfa, consumeAbuseLimit, verifyUserCredentials, getCompanySettings } from "@ishoot/database";
import { getCurrentUser } from "../../../../lib/auth";
import { readLoginInput } from "../../../../lib/login-input";
export async function POST(req: NextRequest) {
  return measureOperation("admin:auth/mfa:POST", async () => {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    await consumeAbuseLimit("mfa-management", user.id, 10);
    const input = await readLoginInput(req);
    if (typeof input.password !== "string" || input.password.length > 1024 || !(await verifyUserCredentials(user.email, input.password))) return NextResponse.json({ error: "Password verification failed" }, { status: 401 });
    const headers = { "Cache-Control": "private, no-store" };
    if (input.mode === "enroll") {
      const company = await getCompanySettings();
      const setup = await beginMfaEnrollment(user.id);
      const issuer = company.company_name_en;
      const uri = `otpauth://totp/${encodeURIComponent(issuer + ":" + setup.email)}?${new URLSearchParams({ secret: setup.secret, issuer, algorithm: "SHA1", digits: "6", period: "30" })}`;
      return NextResponse.json({ secret: setup.secret, uri }, { headers });
    }
    if (typeof input.code !== "string" || input.code.length > 32) throw new Error("Invalid code");
    if (input.mode === "confirm") return NextResponse.json({ recoveryCodes: await completeMfaEnrollment(user.id, input.code), enabled: true }, { headers });
    if (input.mode === "disable") { await disableMfa(user.id, input.code); return NextResponse.json({ enabled: false }, { headers }); }
    return NextResponse.json({ error: "Invalid operation" }, { status: 400 });
  } catch (error) {
    if (error instanceof Error && error.message === "RATE_LIMIT") return NextResponse.json({ error: "Too many attempts" }, { status: 429 });
    return NextResponse.json({ error: "MFA operation failed. Check the code, expiry and server configuration." }, { status: 400 });
  }

  });
}

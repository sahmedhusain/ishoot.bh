import { NextRequest, NextResponse } from "next/server";
import { ensureCustomerProfile, measureOperation } from "@platform/database";
import { completeCustomerOAuth, isApiError } from "@platform/api-client";
import { accountsEnabled } from "../../../../../lib/customer";
import {
  SIGNIN_STATE_COOKIE,
  readSignInState,
  clearSignInState,
  setCustomerCredentials,
} from "../../../../../lib/customer-credentials";
import { trustedClientIp } from "@platform/database/services/abuse-limits";

/** Provider proofs and credentials are processed by identity; the website keeps only its callback cookie. */
async function complete(
  req: NextRequest,
  provider: string,
  params: URLSearchParams,
) {
  const state = readSignInState(req.cookies.get(SIGNIN_STATE_COOKIE)?.value);
  const fallback = new URL(`/${state?.locale ?? "ar"}/account`, req.url);
  const fail = (reason: string, keep = false) => {
    fallback.searchParams.set("signin", reason);
    if (state) fallback.searchParams.set("next", state.next);
    const response = NextResponse.redirect(fallback, 303);
    if (!keep) clearSignInState(response);
    return response;
  };
  if (
    (provider !== "google" && provider !== "apple") ||
    !(await accountsEnabled())
  )
    return fail("generic");
  if (
    !state ||
    state.provider !== provider ||
    state.state !== params.get("state")
  )
    return fail("expired");
  if (params.get("error")) return fail("cancelled");
  const code = params.get("code");
  if (!code) return fail("generic");
  let name = "";
  if (provider === "apple" && params.get("user")) {
    try {
      const user = JSON.parse(params.get("user")!) as {
        name?: { firstName?: unknown; lastName?: unknown };
      };
      name = [user.name?.firstName, user.name?.lastName]
        .filter((part): part is string => typeof part === "string")
        .join(" ")
        .slice(0, 120);
    } catch {}
  }
  try {
    const out = await completeCustomerOAuth(provider, {
      state: state.state,
      browserState: state.state,
      code,
      name: name || undefined,
      clientIp: trustedClientIp(req.headers) || undefined,
      userAgent: req.headers.get("user-agent")?.slice(0, 512),
    });
    await ensureCustomerProfile(
      out.credential.subjectId,
      out.email,
      { name: out.name, locale: out.locale },
      true,
    );
    const response = NextResponse.redirect(new URL(out.next, req.url), 303);
    setCustomerCredentials(response, out.credential);
    return response;
  } catch (error) {
    if (isApiError(error, "mfa_required")) return fail("mfa", true);
    return fail(
      isApiError(error, "provider_email_missing") ? "noEmail" : "generic",
    );
  }
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ action: string }> },
) {
  return measureOperation("web:account:callback:GET", async () =>
    complete(req, (await context.params).action, req.nextUrl.searchParams),
  );
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ action: string }> },
) {
  return measureOperation("web:account:callback:POST", async () => {
    const form = await req.formData().catch(() => null);
    const params = new URLSearchParams();
    form?.forEach((value, key) => {
      if (typeof value === "string") params.set(key, value);
    });
    return complete(req, (await context.params).action, params);
  });
}

export const dynamic = "force-dynamic";

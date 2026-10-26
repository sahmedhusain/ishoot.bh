import { NextRequest, NextResponse } from "next/server";
import {
  createCustomerSession,
  customerFromProvider,
  measureOperation,
} from "@platform/database";
import {
  exchangeSignInCode,
  openSignInState,
} from "@platform/database/services/oauth-signin";
import {
  SIGNIN_STATE_COOKIE,
  errorKey,
  setCustomerCookie,
  signInCredentials,
  signInSecret,
  storeEnabled,
} from "../../../../../lib/customer";
import { publicSiteUrl } from "../../../../../lib/site-url";

/**
 * Where Google (GET) and Apple (form POST) send the person back: the state must match the signed cookie, the code
 * is exchanged with the provider, and the account is found, linked or created.
 */
async function complete(
  req: NextRequest,
  provider: string,
  params: URLSearchParams,
) {
  const state = openSignInState(
    req.cookies.get(SIGNIN_STATE_COOKIE)?.value,
    signInSecret(),
  );
  const fallback = new URL(`/${state?.locale ?? "ar"}/account`, req.url);
  const fail = (reason: string) => {
    fallback.searchParams.set("signin", reason);
    const response = NextResponse.redirect(fallback, 303);
    response.cookies.delete(SIGNIN_STATE_COOKIE);
    return response;
  };
  if (
    (provider !== "google" && provider !== "apple") ||
    !(await storeEnabled())
  )
    return fail("generic");
  if (
    !state ||
    state.provider !== provider ||
    params.get("state") !== state.state
  )
    return fail("expired");
  if (params.get("error")) return fail("cancelled");
  const credentials = await signInCredentials(provider);
  const code = params.get("code");
  if (!credentials || !code) return fail("generic");
  try {
    const redirectUri = new URL(
      `/api/account/${provider}/callback`,
      await publicSiteUrl(),
    ).toString();
    const who = await exchangeSignInCode(provider, {
      code,
      verifier: state.verifier,
      redirectUri,
      nonce: state.nonce,
      credentials,
    });
    // Apple sends the name only the first time, alongside the code.
    let name = who.name;
    if (provider === "apple" && params.get("user")) {
      try {
        const user = JSON.parse(params.get("user")!) as {
          name?: { firstName?: string; lastName?: string };
        };
        name =
          [user.name?.firstName, user.name?.lastName]
            .filter(Boolean)
            .join(" ") || name;
      } catch {}
    }
    const customer = await customerFromProvider(provider, {
      ...who,
      name,
      locale: state.locale,
    });
    const token = await createCustomerSession(
      customer.id,
      req.headers.get("user-agent"),
    );
    const response = NextResponse.redirect(new URL(state.next, req.url), 303);
    setCustomerCookie(response, token);
    response.cookies.delete(SIGNIN_STATE_COOKIE);
    return response;
  } catch (error) {
    return fail(
      errorKey(error) === "customerProviderEmailMissing"
        ? "noEmail"
        : "generic",
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
    form?.forEach(
      (value, key) => typeof value === "string" && params.set(key, value),
    );
    return complete(req, (await context.params).action, params);
  });
}

export const dynamic = "force-dynamic";

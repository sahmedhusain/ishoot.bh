import { NextResponse } from "next/server";
import type { LoginCredential } from "@platform/api-client";
import { sessionCookies } from "./identity-session";

export const SIGNIN_STATE_COOKIE = "platform_signin";
export const safeNextPath = (
  next: string | null | undefined,
  fallback: string,
) =>
  next && /^\/(en|ar)(\/[A-Za-z0-9\-_/]*)?$/.test(next) && !next.includes("//")
    ? next
    : fallback;

type SignInState = {
  state: string;
  provider: "google" | "apple";
  locale: "en" | "ar";
  next: string;
};

export function readSignInState(raw: string | undefined): SignInState | null {
  if (!raw || raw.length > 4096) return null;
  try {
    const state = JSON.parse(raw) as SignInState;
    if (
      typeof state.state !== "string" ||
      state.state.length !== 43 ||
      !["google", "apple"].includes(state.provider) ||
      !["en", "ar"].includes(state.locale)
    )
      return null;
    return {
      ...state,
      next: safeNextPath(state.next, `/${state.locale}/account`),
    };
  } catch {
    return null;
  }
}

export function clearSignInState(response: NextResponse) {
  response.cookies.set(SIGNIN_STATE_COOKIE, "", {
    path: "/api/account",
    expires: new Date(0),
    httpOnly: true,
  });
}

/** The opaque flow state binds the provider callback to the initiating browser; nonce/PKCE stay in identity. */
export function setSignInState(
  response: NextResponse,
  state: SignInState,
  expires: string,
) {
  response.cookies.set(SIGNIN_STATE_COOKIE, JSON.stringify(state), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" || state.provider === "apple",
    sameSite: state.provider === "apple" ? "none" : "lax",
    path: "/api/account",
    expires: new Date(expires),
  });
}

export function setCustomerCredentials(
  response: NextResponse,
  credential: LoginCredential,
) {
  for (const cookie of sessionCookies(credential))
    response.cookies.set(cookie.name, cookie.value, cookie.options);
  response.cookies.delete("platform_customer");
  clearSignInState(response);
}

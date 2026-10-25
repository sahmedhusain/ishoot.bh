import { cache } from "react";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { serverMessages } from "@platform/locales";
import { CUSTOMER_SESSION_DAYS, customerFromSession, db, isFeatureEnabled } from "@platform/database";
import { decryptIntegrationCredentials } from "@platform/database/services/integration-credentials";

export const CUSTOMER_COOKIE = "platform_customer";
export const SIGNIN_STATE_COOKIE = "platform_signin";

/** The signed-in customer for this request, or null. */
export const currentCustomer = cache(async () => customerFromSession((await cookies()).get(CUSTOMER_COOKIE)?.value));

export function setCustomerCookie(response: NextResponse, token: string) {
  response.cookies.set(CUSTOMER_COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: CUSTOMER_SESSION_DAYS * 86_400 });
}

/** The secret that signs the sign-in state cookie. */
export function signInSecret() {
  const secret = process.env.CUSTOMER_AUTH_SECRET || process.env.REVALIDATION_SECRET;
  if (!secret) throw new Error(serverMessages.customerSignInUnavailable);
  return secret;
}

/** Customer accounts exist only while the online store module is on. */
export const storeEnabled = () => isFeatureEnabled("store");

/** Google or Apple sign-in credentials when that integration is on, else null. */
export async function signInCredentials(provider: "google" | "apple") {
  const row = await db.integrationSetting.findUnique({ where: { provider: `${provider}_signin` } });
  if (!row?.isActive || !row.credentials) return null;
  return decryptIntegrationCredentials(row.credentials);
}

/** Which sign-in providers the account page offers. */
export async function signInProviders() {
  const rows = await db.integrationSetting.findMany({ where: { provider: { in: ["google_signin", "apple_signin"] }, isActive: true, credentials: { not: null } }, select: { provider: true } });
  return { google: rows.some((r) => r.provider === "google_signin"), apple: rows.some((r) => r.provider === "apple_signin") };
}

/** Form posts from this website only (the browser sends the Origin header on POST). */
export function sameOrigin(req: NextRequest) {
  const origin = req.headers.get("origin");
  return !!origin && origin === req.nextUrl.origin;
}

/** An error for the website: the key of a known server message (the page words it), else a generic one. */
export function errorKey(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  const key = Object.entries(serverMessages).find(([, text]) => text === message)?.[0];
  return key ?? "generic";
}

export const jsonError = (error: unknown, status = 400) => NextResponse.json({ error: errorKey(error) }, { status: errorKey(error) === "rateLimit" ? 429 : status });

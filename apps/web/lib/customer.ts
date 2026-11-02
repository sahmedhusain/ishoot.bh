import { pickupAvailable } from "@platform/database/constants/website-commerce";
import { getSite } from "./site";
import { cache } from "react";
import { cookies } from "next/headers";
import {
  getOwnAccount,
  isApiError,
  customerSignInProviders,
} from "@platform/api-client";
import { ACCESS_COOKIE, verifyAccessToken } from "./identity-session";
import { NextRequest, NextResponse } from "next/server";
import { serverMessages } from "@platform/locales";
import {
  getCustomerProfile,
  isFeatureEnabled,
  getStoreSettings,
  onlinePaymentAvailable,
} from "@platform/database";

/** The signed-in customer for this request: verified token, live identity account, then its business profile. */
export const currentCustomer = cache(async () => {
  const token = await verifyAccessToken(
    (await cookies()).get(ACCESS_COOKIE)?.value,
  );
  if (!token) return null;
  try {
    const security = await getOwnAccount(token.token);
    const customer = await getCustomerProfile(token.customerId);
    if (!customer || customer.email !== security.email) return null;
    return {
      ...customer,
      has_password: security.hasPassword,
      google: security.google,
      apple: security.apple,
    };
  } catch (error) {
    if (isApiError(error) && error.status === 401) return null;
    throw error;
  }
});

/** Signs inquiry upload grants until the inquiry service owns attachments. */
export function signInSecret() {
  const secret =
    process.env.CUSTOMER_AUTH_SECRET || process.env.REVALIDATION_SECRET;
  if (!secret) throw new Error(serverMessages.customerSignInUnavailable);
  return secret;
}

/** Customer accounts exist only while the online store module is on. */
export const storeEnabled = cache(async () => {
  if (!(await isFeatureEnabled("store"))) return false;
  const { enabled, website, config } = await getSite();
  return enabled && !!website && config.commerce.capabilities.shop;
});
export const accountsEnabled = async () =>
  (await storeEnabled()) &&
  (await getSite()).config.commerce.capabilities.accounts;
export const orderingEnabled = cache(async () => {
  if (!(await storeEnabled())) return false;
  const [{ config }, settings] = await Promise.all([
    getSite(),
    getStoreSettings(),
  ]);
  const capabilities = config.commerce.capabilities;
  const payment =
    settings.cod_enabled ||
    settings.bank_transfer_enabled ||
    (await onlinePaymentAvailable());
  return (
    payment &&
    capabilities.ordering &&
    (capabilities.accounts || settings.guest_checkout) &&
    ((capabilities.delivery && settings.delivery_enabled) ||
      (pickupAvailable(config.commerce) && settings.pickup_enabled))
  );
});

/** Enabled provider names only; OAuth credentials never reach the frontend process. */
export const signInProviders = customerSignInProviders;

/** Form posts from this website only (the browser sends the Origin header on POST). */
export function sameOrigin(req: NextRequest) {
  const origin = req.headers.get("origin");
  return !!origin && origin === req.nextUrl.origin;
}

/** An error for the website: the key of a known server message (the page words it), else a generic one. */
export function errorKey(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  const key = Object.entries(serverMessages).find(
    ([, text]) => text === message,
  )?.[0];
  return key ?? "generic";
}

export const jsonError = (error: unknown, status = 400) =>
  NextResponse.json(
    { error: errorKey(error) },
    { status: errorKey(error) === "rateLimit" ? 429 : status },
  );

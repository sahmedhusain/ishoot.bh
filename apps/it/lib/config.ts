// The IT dashboard's settings, from the environment (documented in .env.example, "IT dashboard"). Server-only.
import type { Locale } from "@platform/locales";

const env = (name: string, fallback?: string) => {
  const value = process.env[name] || fallback;
  if (value === undefined)
    throw new Error(`${name} is not set (see .env.example)`);
  return value;
};

export const config = {
  /** Identity's issuer and public keys; access tokens are verified against both. */
  identityIssuer: () => env("IDENTITY_ISSUER"),
  identityJwksUrl: () => env("IT_IDENTITY_JWKS_URL"),
  /** Cookie names; the session cookies are httpOnly and never readable by scripts. */
  accessCookie: () => env("IT_ACCESS_COOKIE", "platform_it_access"),
  refreshCookie: () => env("IT_REFRESH_COOKIE", "platform_it_refresh"),
  accountCookie: () => env("IT_ACCOUNT_COOKIE", "platform_it_account"),
  localeCookie: () => env("IT_LOCALE_COOKIE", "platform_it_locale"),
  defaultLocale: () => env("IT_DEFAULT_LOCALE", "ar") as Locale,
  /** A request header set by the trusted ingress with the client's address (empty: none is passed on). */
  clientIpHeader: () => process.env.IT_CLIENT_IP_HEADER?.toLowerCase() || "",
  /** Renew the access token this many seconds before it expires. */
  refreshLeewaySeconds: () => Number(env("IT_REFRESH_LEEWAY_SECONDS", "30")),
  secureCookies: () => process.env.NODE_ENV === "production",
};

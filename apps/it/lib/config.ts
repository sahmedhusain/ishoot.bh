
import type { Locale } from "@platform/locales";

const env = (name: string, fallback?: string) => {
  const value = process.env[name] || fallback;
  if (value === undefined)
    throw new Error(`${name} is not set (see .env.example)`);
  return value;
};

export const config = {

  identityIssuer: () => env("IDENTITY_ISSUER"),
  identityJwksUrl: () => env("IT_IDENTITY_JWKS_URL"),

  accessCookie: () => env("IT_ACCESS_COOKIE", "platform_it_access"),
  refreshCookie: () => env("IT_REFRESH_COOKIE", "platform_it_refresh"),
  accountCookie: () => env("IT_ACCOUNT_COOKIE", "platform_it_account"),
  localeCookie: () => env("IT_LOCALE_COOKIE", "platform_it_locale"),
  defaultLocale: () => env("IT_DEFAULT_LOCALE", "ar") as Locale,

  clientIpHeader: () => process.env.IT_CLIENT_IP_HEADER?.toLowerCase() || "",

  refreshLeewaySeconds: () => Number(env("IT_REFRESH_LEEWAY_SECONDS", "30")),
  secureCookies: () => process.env.NODE_ENV === "production",

  webUrl: () => process.env.WEB_URL || "",
  storeUrl: () => process.env.STORE_URL || "",

  adminUrl: () => process.env.ADMIN_URL || "",
  adminPublicUrl: () =>
    process.env.ADMIN_APP_URL || process.env.ADMIN_URL || "",
  revalidationSecret: () => process.env.REVALIDATION_SECRET || "",
};

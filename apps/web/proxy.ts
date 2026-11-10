import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

import { LANGUAGES } from "@platform/locales/registry";
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  needsRenewal,
  renew,
  sessionCookies,
  clearedCookies,
} from "./lib/identity-session";
const locales = LANGUAGES.map((language) => language.code);

export async function proxy(request: NextRequest) {
  const nonce = Buffer.from(randomUUID()).toString("base64");
  const csp = contentSecurityPolicy(nonce);
  const refresh = request.cookies.get(REFRESH_COOKIE)?.value;
  const cookies = [] as ReturnType<typeof sessionCookies>;
  if (refresh && needsRenewal(request.cookies.get(ACCESS_COOKIE)?.value)) {
    const credential = await renew(refresh);
    cookies.push(
      ...(credential ? sessionCookies(credential) : clearedCookies()),
    );
    for (const cookie of cookies)
      request.cookies.set(cookie.name, cookie.value);
  }
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);
  const response = localized(request, requestHeaders);
  response.headers.set("Content-Security-Policy", csp);
  for (const cookie of cookies)
    response.cookies.set(cookie.name, cookie.value, cookie.options);
  return response;
}

function contentSecurityPolicy(nonce: string) {
  const adminOrigins = [
    origin(process.env.NEXT_PUBLIC_ADMIN_URL || process.env.ADMIN_URL),
    ...(process.env.ADMIN_PREVIEW_ORIGINS || "").split(",").map(origin),
  ].filter(Boolean);
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://www.googletagmanager.com https://connect.facebook.net https://analytics.tiktok.com${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""}`,
    "script-src-attr 'none'",
    `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
    "style-src-attr 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data: https://fonts.gstatic.com",
    "connect-src 'self' https://*.google-analytics.com https://analytics.google.com https://www.facebook.com https://connect.facebook.net https://analytics.tiktok.com",
    "media-src 'self' blob: https:",
    "frame-src 'self' blob: https:",
    `frame-ancestors 'self' ${adminOrigins.join(" ")}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self' https:",
    ...(process.env.NODE_ENV === "production" ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
}

function origin(value?: string) {
  try {
    return value ? new URL(value).origin : "";
  } catch {
    return "";
  }
}

function localized(request: NextRequest, requestHeaders: Headers) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/fonts") ||
    pathname.startsWith("/images") ||
    pathname === "/opengraph-image" ||
    pathname.includes(".")
  ) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`,
  );

  if (!pathnameHasLocale) {
    const acceptLang = request.headers.get("accept-language") || "";
    const preferred = acceptLang
      .split(",")
      .map((entry) => entry.trim().split(/[;-]/)[0].toLowerCase());
    const detectedLocale =
      preferred.find((language) => locales.includes(language as never)) ?? "en";

    return NextResponse.redirect(
      new URL(
        `/${detectedLocale}${pathname.startsWith("/") ? pathname : `/${pathname}`}`,
        request.url,
      ),
    );
  }

  requestHeaders.set("x-pathname", pathname);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

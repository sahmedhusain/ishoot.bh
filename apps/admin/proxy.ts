import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  clearedCookies,
  needsRenewal,
  renew,
  sessionCookies,
  type CookieSpec,
} from "./lib/identity-session";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const nonce = Buffer.from(randomUUID()).toString("base64");
  const webOrigin = origin(
    process.env.NEXT_PUBLIC_WEB_URL || process.env.WEB_URL,
  );
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${process.env.NODE_ENV === "development" ? " 'unsafe-eval' 'unsafe-inline'" : ""}`,
    "script-src-attr 'none'",
    `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
    "style-src-attr 'unsafe-inline'",
    "font-src 'self' data: https://fonts.gstatic.com",
    "img-src 'self' data: blob: https:",
    "media-src 'self' blob: https:",
    "connect-src 'self' https: wss:",
    `frame-src 'self' blob:${webOrigin ? ` ${webOrigin}` : ""}`,
    "frame-ancestors 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self' https:",
    ...(process.env.NODE_ENV === "production"
      ? ["upgrade-insecure-requests"]
      : []),
  ].join("; ");
  const next = () => {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-nonce", nonce);
    requestHeaders.set("Content-Security-Policy", csp);
    const cookieHeader = request.cookies.getAll().map(c => `${c.name}=${c.value}`).join("; ");
    if (cookieHeader) requestHeaders.set("cookie", cookieHeader);
    return withSecurityPolicy(
      NextResponse.next({ request: { headers: requestHeaders } }),
      csp,
    );
  };

  if (pathname.startsWith("/uploads/")) {
    const target = request.nextUrl.clone();
    target.pathname = pathname.replace("/uploads/", "/api/files/");
    return NextResponse.rewrite(target);
  }

  if (pathname.startsWith("/_next") || pathname.includes(".")) {
    return next();
  }

  const api = pathname.startsWith("/api/");
  const protectedPage =
    pathname === "/" ||
    pathname.startsWith("/dashboard") ||
    pathname === "/setup";
  const refresh = request.cookies.get(REFRESH_COOKIE)?.value;
  if (
    !protectedPage &&
    !(
      api &&
      refresh &&
      ![
        "/api/auth/login",
        "/api/auth/logout",
        "/api/auth/forgot-password",
        "/api/auth/reset-password",
      ].includes(pathname)
    )
  )
    return next();

  const access = request.cookies.get(ACCESS_COOKIE)?.value;
  let renewed: CookieSpec[] | null = null;
  if (needsRenewal(access)) {
    const credential = refresh ? await renew(refresh) : null;
    if (!credential) {
      if (api) return withCookies(next(), clearedCookies());
      const login = new URL("/login", request.url);
      if (pathname !== "/") login.searchParams.set("callbackUrl", pathname);
      return withCookies(
        withSecurityPolicy(NextResponse.redirect(login), csp),
        clearedCookies(),
      );
    }
    renewed = sessionCookies(credential);
    for (const c of renewed) request.cookies.set(c.name, c.value);
  }

  const response =
    pathname === "/"
      ? NextResponse.redirect(new URL("/dashboard", request.url))
      : next();
  withSecurityPolicy(response, csp);
  return renewed ? withCookies(response, renewed) : response;
}

function origin(value?: string) {
  try {
    return value ? new URL(value).origin : "";
  } catch {
    return "";
  }
}

function withSecurityPolicy(response: NextResponse, policy: string) {
  response.headers.set("Content-Security-Policy", policy);
  return response;
}

function withCookies(response: NextResponse, cookies: CookieSpec[]) {
  for (const c of cookies) response.cookies.set(c.name, c.value, c.options);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

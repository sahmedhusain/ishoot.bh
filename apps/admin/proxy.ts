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

  if (pathname.startsWith("/uploads/")) {
    const target = request.nextUrl.clone();
    target.pathname = pathname.replace("/uploads/", "/api/files/");
    return NextResponse.rewrite(target);
  }

  if (pathname.startsWith("/_next") || pathname.includes(".")) {
    return NextResponse.next();
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
    return NextResponse.next();

  const access = request.cookies.get(ACCESS_COOKIE)?.value;
  let renewed: CookieSpec[] | null = null;
  if (needsRenewal(access)) {
    const credential = refresh ? await renew(refresh) : null;
    if (!credential) {
      if (api) return withCookies(NextResponse.next(), clearedCookies());
      const login = new URL("/login", request.url);
      if (pathname !== "/") login.searchParams.set("callbackUrl", pathname);
      return withCookies(NextResponse.redirect(login), clearedCookies());
    }
    renewed = sessionCookies(credential);
    for (const c of renewed) request.cookies.set(c.name, c.value);
  }

  const response =
    pathname === "/"
      ? NextResponse.redirect(new URL("/dashboard", request.url))
      : NextResponse.next({ request: { headers: request.headers } });
  return renewed ? withCookies(response, renewed) : response;
}

function withCookies(response: NextResponse, cookies: CookieSpec[]) {
  for (const c of cookies) response.cookies.set(c.name, c.value, c.options);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

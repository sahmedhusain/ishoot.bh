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
  const response = localized(request);
  for (const cookie of cookies)
    response.cookies.set(cookie.name, cookie.value, cookie.options);
  return response;
}

function localized(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/fonts") ||
    pathname.startsWith("/images") ||
    pathname === "/opengraph-image" ||
    pathname.includes(".")
  ) {
    return NextResponse.next({ request: { headers: request.headers } });
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

  // Pages that redirect between languages need the requested path, which server components cannot read.
  const forwarded = new Headers(request.headers);
  forwarded.set("x-pathname", pathname);
  return NextResponse.next({ request: { headers: forwarded } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

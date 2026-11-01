import { NextRequest, NextResponse } from "next/server";

import { LANGUAGES } from "@platform/locales/registry";
const locales = LANGUAGES.map((language) => language.code);

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/fonts") ||
    pathname.startsWith("/images") ||
    pathname === "/opengraph-image" ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`,
  );

  if (!pathnameHasLocale) {
    const acceptLang = request.headers.get("accept-language") || "";
    const preferred = acceptLang.split(",").map((entry) => entry.trim().split(/[;-]/)[0].toLowerCase());
    const detectedLocale = preferred.find((language) => locales.includes(language as never)) ?? "en";

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
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};

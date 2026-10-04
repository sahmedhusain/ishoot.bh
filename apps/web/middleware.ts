import { NextRequest, NextResponse } from "next/server";

const locales = ["en", "ar"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/fonts") ||
    pathname.startsWith("/images") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`,
  );

  if (!pathnameHasLocale) {
    const acceptLang = request.headers.get("accept-language") || "";
    const detectedLocale = acceptLang.startsWith("en") ? "en" : "ar";

    return NextResponse.redirect(
      new URL(
        `/${detectedLocale}${pathname.startsWith("/") ? pathname : `/${pathname}`}`,
        request.url,
      ),
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};

import { NextResponse, type NextRequest } from "next/server";
import {
  clearedCookies,
  needsRenewal,
  renew,
  sessionCookies,
  type CookieSpec,
} from "./lib/credentials";
import { config as settings } from "./lib/config";

export async function proxy(request: NextRequest) {
  const access = request.cookies.get(settings.accessCookie())?.value;
  if (!needsRenewal(access)) return NextResponse.next();

  const refresh = request.cookies.get(settings.refreshCookie())?.value;
  const email = request.cookies.get(settings.accountCookie())?.value ?? "";
  const credential = refresh ? await renew(refresh) : null;
  if (!credential)
    return withCookies(
      NextResponse.redirect(new URL("/login", request.url)),
      clearedCookies(),
    );

  const cookies = sessionCookies(credential, email);

  for (const c of cookies) request.cookies.set(c.name, c.value);
  return withCookies(
    NextResponse.next({ request: { headers: request.headers } }),
    cookies,
  );
}

function withCookies(response: NextResponse, cookies: CookieSpec[]) {
  for (const c of cookies) response.cookies.set(c.name, c.value, c.options);
  return response;
}

export const config = {

  matcher: ["/((?!login|_next/static|_next/image|favicon.ico).*)"],
};

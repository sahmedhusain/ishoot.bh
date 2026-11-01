// Session cookies for an identity credential. Shared by sign-in (server actions) and renewal (middleware).
import { decodeJwt } from "jose";
import { refreshSession, type LoginCredential } from "@platform/api-client";
import { config } from "./config";

export const REALM = "it" as const;

export type CookieSpec = {
  name: string;
  value: string;
  options: {
    httpOnly: true;
    secure: boolean;
    sameSite: "strict";
    path: "/";
    expires?: Date;
  };
};

const options = (expires: Date) =>
  ({
    httpOnly: true,
    secure: config.secureCookies(),
    sameSite: "strict",
    path: "/",
    expires,
  }) as const;

/** The cookies that hold a signed-in session. The account cookie only labels the header (who is signed in). */
export function sessionCookies(
  credential: LoginCredential,
  email: string,
): CookieSpec[] {
  const accessExpires = new Date(
    (decodeJwt(credential.accessToken).exp ?? 0) * 1000,
  );
  const sessionExpires = new Date(credential.expiresAt);
  return [
    {
      name: config.accessCookie(),
      value: credential.accessToken,
      options: options(accessExpires),
    },
    {
      name: config.refreshCookie(),
      value: credential.refreshToken,
      options: options(sessionExpires),
    },
    {
      name: config.accountCookie(),
      value: email,
      options: options(sessionExpires),
    },
  ];
}

/** Cookies that end the session in the browser. */
export const clearedCookies = (): CookieSpec[] =>
  [config.accessCookie(), config.refreshCookie(), config.accountCookie()].map(
    (name) => ({
      name,
      value: "",
      options: options(new Date(0)),
    }),
  );

/** True when the access token is missing, unreadable or about to expire. */
export function needsRenewal(accessToken: string | undefined) {
  if (!accessToken) return true;
  try {
    const exp = decodeJwt(accessToken).exp ?? 0;
    return exp * 1000 - Date.now() < config.refreshLeewaySeconds() * 1000;
  } catch {
    return true;
  }
}

// A refresh credential works once, and reusing it ends the whole session (identity detects replay). Requests that
// arrive together share one renewal; the result is kept briefly for requests that started with the old cookie.
// With several app replicas, route a browser to one replica (sticky sessions) for the same guarantee.
const renewals = new Map<string, Promise<LoginCredential | null>>();

export function renew(refreshToken: string): Promise<LoginCredential | null> {
  let pending = renewals.get(refreshToken);
  if (!pending) {
    pending = refreshSession(REALM, refreshToken)
      .then((c) => ("accessToken" in c ? (c as LoginCredential) : null))
      .catch(() => null);
    renewals.set(refreshToken, pending);
    setTimeout(
      () => renewals.delete(refreshToken),
      config.refreshLeewaySeconds() * 1000,
    ).unref?.();
  }
  return pending;
}

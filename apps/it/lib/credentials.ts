
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
    sameSite: "lax";
    path: "/";
    expires?: Date;
  };
};

const isSecure = () => {
  if (process.env.SECURE_COOKIES === "true") return true;
  if (process.env.SECURE_COOKIES === "false") return false;
  const itUrl = process.env.IT_URL || process.env.NEXT_PUBLIC_IT_URL || "";
  return itUrl.startsWith("https://");
};

const options = (expires: Date) =>
  ({
    httpOnly: true,
    secure: isSecure(),
    sameSite: "lax",
    path: "/",
    expires,
  }) as const;

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

export const clearedCookies = (): CookieSpec[] =>
  [config.accessCookie(), config.refreshCookie(), config.accountCookie()].map(
    (name) => ({
      name,
      value: "",
      options: options(new Date(0)),
    }),
  );

export function needsRenewal(accessToken: string | undefined) {
  if (!accessToken) return true;
  try {
    const exp = decodeJwt(accessToken).exp ?? 0;
    return exp * 1000 - Date.now() < config.refreshLeewaySeconds() * 1000;
  } catch {
    return true;
  }
}

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

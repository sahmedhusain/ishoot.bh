import { createRemoteJWKSet, decodeJwt, jwtVerify } from "jose";
import { refreshSession, type LoginCredential } from "@platform/api-client";

export const REALM = "customer" as const;
export const ACCESS_COOKIE = "platform_customer_access";
export const REFRESH_COOKIE = "platform_customer_refresh";
const LEEWAY_SECONDS = 30;

export type CookieSpec = {
  name: string;
  value: string;
  options: {
    httpOnly: true;
    secure: boolean;
    sameSite: "lax";
    path: "/";
    expires: Date;
  };
};

const options = (expires: Date) =>
  ({
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires,
  }) as const;

export function sessionCookies(credential: LoginCredential): CookieSpec[] {
  const accessExpires = new Date(
    (decodeJwt(credential.accessToken).exp ?? 0) * 1000,
  );
  return [
    {
      name: ACCESS_COOKIE,
      value: credential.accessToken,
      options: options(accessExpires),
    },
    {
      name: REFRESH_COOKIE,
      value: credential.refreshToken,
      options: options(new Date(credential.expiresAt)),
    },
  ];
}

export const clearedCookies = (): CookieSpec[] =>
  [ACCESS_COOKIE, REFRESH_COOKIE, "platform_customer"].map((name) => ({
    name,
    value: "",
    options: options(new Date(0)),
  }));

export function needsRenewal(accessToken: string | undefined) {
  if (!accessToken) return true;
  try {
    return (
      (decodeJwt(accessToken).exp ?? 0) * 1000 - Date.now() <
      LEEWAY_SECONDS * 1000
    );
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
      LEEWAY_SECONDS * 1000,
    ).unref?.();
  }
  return pending;
}

export type CustomerToken = {
  customerId: string;
  sessionId: string;
  roles: string[];
  token: string;
};

let keys: ReturnType<typeof createRemoteJWKSet> | undefined;
const setting = (name: string) => {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set (see .env.example)`);
  return value;
};

export async function verifyAccessToken(
  token: string | undefined,
): Promise<CustomerToken | null> {
  if (!token) return null;
  keys ??= createRemoteJWKSet(new URL(setting("IDENTITY_JWKS_URL")));
  try {
    const { payload } = await jwtVerify(token, keys, {
      issuer: setting("IDENTITY_ISSUER"),
      audience: "platform:customer",
    });
    if (
      payload.token_use !== "access" ||
      typeof payload.sub !== "string" ||
      typeof payload.sid !== "string" ||
      !Array.isArray(payload.roles) ||
      !payload.roles.every((role) => typeof role === "string")
    )
      return null;
    return {
      customerId: payload.sub,
      sessionId: payload.sid,
      roles: payload.roles,
      token,
    };
  } catch {
    return null;
  }
}

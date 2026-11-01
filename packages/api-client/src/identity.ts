// The identity service (backend/services/identity): signing people in for this app. Credentials in these responses
// are secrets: keep them in httpOnly cookies and never log them.
import type { components, paths } from "./generated/identity";
import { serviceClient, unwrap, unwrapEmpty } from "./http";

export type Realm = "staff" | "customer" | "it";
export type LoginCredential = components["schemas"]["LoginCredential"];
export type SessionCredential = components["schemas"]["SessionCredential"];

let client: ReturnType<typeof serviceClient<paths>> | undefined;
const identity = () => (client ??= serviceClient<paths>());

/**
 * Checks a password and, when the account has one, an authenticator or recovery code. Fails with the problem code
 * "mfa_required" when the password was right and a code is still needed.
 */
export const signIn = (
  realm: Realm,
  body: { email: string; password: string; otp?: string; clientIp?: string },
) =>
  unwrap(
    identity().POST("/v1/identity/{realm}/sessions/login", {
      params: { path: { realm } },
      body,
    }),
  );

/** Exchanges a refresh credential (usable once) for a new one and a new access token. */
export const refreshSession = (realm: Realm, refreshToken: string) =>
  unwrap(
    identity().POST("/v1/identity/{realm}/sessions/refresh", {
      params: { path: { realm } },
      body: { refreshToken },
    }),
  );

/** Ends the session the refresh credential belongs to. */
export const signOut = (realm: Realm, refreshToken: string) =>
  unwrapEmpty(
    identity().POST("/v1/identity/{realm}/sessions/logout", {
      params: { path: { realm } },
      body: { refreshToken },
    }),
  );

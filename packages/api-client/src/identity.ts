// The identity service (backend/services/identity): signing people in for this app. Credentials in these responses
// are secrets: keep them in httpOnly cookies and never log them.
import type { components, paths } from "./generated/identity";
import { serviceClient, userClient, unwrap, unwrapEmpty } from "./http";

export type Realm = "staff" | "customer" | "it";
export type LoginCredential = components["schemas"]["LoginCredential"];
export type SessionCredential = components["schemas"]["SessionCredential"];
export type ITRole = components["schemas"]["ITRole"];
export type ITProvisioning = components["schemas"]["ITProvisioning"];
export type ITAccountPage = NonNullable<
  paths["/v1/identity/desk/it-accounts"]["get"]["responses"][200]["content"]["application/json"]
>;

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

export const listITAccountsForIT = (token: string, cursor?: string) =>
  unwrap(
    userClient<paths>(token).GET("/v1/identity/desk/it-accounts", {
      params: { query: { cursor } },
    }),
  );

export const createITAccountForIT = (
  token: string,
  input: { email: string; password: string; role: ITRole },
) =>
  unwrap(
    userClient<paths>(token).POST("/v1/identity/desk/it-accounts", {
      body: input,
    }),
  );

export const updateITAccountForIT = (
  token: string,
  id: string,
  input: { role: ITRole; active: boolean },
) =>
  unwrapEmpty(
    userClient<paths>(token).PUT("/v1/identity/desk/it-accounts/{id}", {
      params: { path: { id } },
      body: input,
    }),
  );

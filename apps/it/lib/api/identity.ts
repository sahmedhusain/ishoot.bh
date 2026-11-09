// The identity service (backend/services/identity): signing people in for this app. Credentials in these responses
// are secrets: keep them in httpOnly cookies and never log them.
import type { components, paths } from "./generated/identity";
import { ApiError } from "./errors";
import { serviceClient, userClient, unwrap, unwrapEmpty } from "./http";

export type Realm = "staff" | "customer" | "it";
export type LoginCredential = components["schemas"]["LoginCredential"];
export type SessionCredential = components["schemas"]["SessionCredential"];
export type ITRole = components["schemas"]["ITRole"];
export type ITProvisioning = components["schemas"]["ITProvisioning"];
export type ITAccountPage = NonNullable<
  paths["/v1/identity/desk/it-accounts"]["get"]["responses"][200]["content"]["application/json"]
>;
export type IdentitySessionPage = NonNullable<
  paths["/v1/identity/desk/sessions"]["get"]["responses"][200]["content"]["application/json"]
>;

let client: ReturnType<typeof serviceClient<paths>> | undefined;
const identity = () => (client ??= serviceClient<paths>());

export const listIdentitySessionsForIT = (
  token: string,
  query: { realm?: Realm; subjectId?: string; cursor?: string } = {},
) =>
  unwrap(
    userClient<paths>(token).GET("/v1/identity/desk/sessions", {
      params: { query },
    }),
  );

export const revokeIdentitySessionForIT = (token: string, id: string) =>
  unwrapEmpty(
    userClient<paths>(token).DELETE("/v1/identity/desk/sessions/{id}", {
      params: { path: { id } },
    }),
  );

/**
 * Checks a password and, when the account has one, an authenticator or recovery code. Fails with the problem code
 * "mfa_required" when the password was right and a code is still needed.
 */
export const signIn = (
  realm: Realm,
  body: {
    email: string;
    password: string;
    otp?: string;
    clientIp?: string;
    userAgent?: string;
  },
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

export type StaffAccessPolicy =
  paths["/v1/identity/staff/access"]["get"]["responses"][200]["content"]["application/json"];

/** Live identity-owned staff policy; legacy apps remain on their own auth until cutover. */
export const getStaffAccess = (token: string) =>
  unwrap(userClient<paths>(token).GET("/v1/identity/staff/access"));

export type ITRoleDraft = {
  id: string;
  nameEn: string;
  nameAr: string;
  system: boolean;
  reportingToRole?: string | null;
  grants: Record<string, boolean>;
};

export type ITRolePage = {
  items: ITRoleDraft[];
  nextCursor?: string;
};

export const listITRolesForIT = (token: string, cursor?: string) =>
  unwrap(
    userClient<any>(token).GET("/v1/identity/desk/it-roles", {
      params: { query: { cursor } },
    }),
  ) as Promise<ITRolePage>;

export const saveITRoleForIT = (token: string, draft: ITRoleDraft, create: boolean) =>
  create
    ? (unwrapEmpty(
        userClient<any>(token).POST("/v1/identity/desk/it-roles", {
          body: draft,
        }),
      ) as Promise<void>)
    : (unwrapEmpty(
        userClient<any>(token).PUT("/v1/identity/desk/it-roles/{id}", {
          params: { path: { id: draft.id } },
          body: draft,
        }),
      ) as Promise<void>);

export const deleteITRoleForIT = (token: string, id: string) =>
  unwrapEmpty(
    userClient<any>(token).DELETE("/v1/identity/desk/it-roles/{id}", {
      params: { path: { id } },
    }),
  ) as Promise<void>;

export const listITAccountsForIT = (token: string, cursor?: string) =>
  unwrap(
    userClient<paths>(token).GET("/v1/identity/desk/it-accounts", {
      params: { query: { cursor } },
    }),
  );

export const createITAccountForIT = (
  token: string,
  input: { email: string; password: string; role: string; reportingTo?: string | null },
) =>
  unwrap(
    userClient<paths>(token).POST("/v1/identity/desk/it-accounts", {
      body: input as any,
    }),
  );

export const updateITAccountForIT = (
  token: string,
  id: string,
  input: { role: string; active: boolean; reportingTo?: string | null },
) =>
  unwrapEmpty(
    userClient<paths>(token).PUT("/v1/identity/desk/it-accounts/{id}", {
      params: { path: { id } },
      body: input as any,
    }),
  );

/** Staff and customer accounts, whose profiles the apps own; identity owns their credentials. */
export type ManagedRealm = "staff" | "customer" | "it";

/** Creates or updates an account as the app describes it; returns whether it was new. */
export const syncAccount = (
  realm: ManagedRealm,
  id: string,
  body: { email: string; roles?: string[]; active: boolean; actorId?: string },
) =>
  unwrap(
    identity().PUT("/v1/identity/{realm}/accounts/{id}", {
      params: { path: { realm, id } },
      body,
    }),
  );

/** Sets an account's password; keepSessionId keeps the person's own session when they change it themselves. */
export const setAccountPassword = (
  realm: ManagedRealm,
  id: string,
  body: { password: string; keepSessionId?: string; actorId?: string },
) =>
  unwrapEmpty(
    identity().PUT("/v1/identity/{realm}/accounts/{id}/password", {
      params: { path: { realm, id } },
      body,
    }),
  );

/** Turns two-step sign-in off for an account and signs it out everywhere. */
export const resetAccountMFA = (
  realm: ManagedRealm,
  id: string,
  actorId?: string,
) =>
  unwrapEmpty(
    identity().DELETE("/v1/identity/{realm}/accounts/{id}/mfa", {
      params: { path: { realm, id }, query: actorId ? { actorId } : {} },
    }),
  );

/**
 * A one-use reset token for an active account with the address, for the app to e-mail; null when there is none
 * (answer the person the same way either way).
 */
export async function requestPasswordReset(
  realm: ManagedRealm,
  email: string,
  clientIp?: string,
) {
  try {
    return await unwrap(
      identity().POST("/v1/identity/{realm}/password-resets", {
        params: { path: { realm } },
        body: { email, clientIp },
      }),
    );
  } catch (error) {
    if (error instanceof ApiError && error.code === "account_not_found")
      return null;
    throw error;
  }
}

/** Uses a reset token once; ApiError "reset_invalid" when it is unknown, used or expired. */
export const confirmPasswordReset = (
  realm: ManagedRealm,
  token: string,
  password: string,
  email?: string,
  clientIp?: string,
) =>
  unwrap(
    identity().POST("/v1/identity/{realm}/password-resets/confirm", {
      params: { path: { realm } },
      body: { token, password, email, clientIp },
    }),
  );

// The signed-in person's own account, with their access token (staff and customers).
export type OwnSession = components["schemas"]["OwnSession"];

/** Whether two-step sign-in is on and how many recovery codes are left. */
export const getOwnAccount = (token: string) =>
  unwrap(userClient<paths>(token).GET("/v1/identity/me"));

/** The person's active sessions, newest first; `current` marks this one. */
export const listOwnSessions = async (token: string): Promise<OwnSession[]> =>
  (await unwrap(userClient<paths>(token).GET("/v1/identity/me/sessions")))
    .items;

/** Ends one of the person's sessions. */
export const revokeOwnSession = (token: string, id: string) =>
  unwrapEmpty(
    userClient<paths>(token).DELETE("/v1/identity/me/sessions/{id}", {
      params: { path: { id } },
    }),
  );

/** Ends every session of the person except this one. */
export const revokeOtherOwnSessions = (token: string) =>
  unwrapEmpty(userClient<paths>(token).DELETE("/v1/identity/me/sessions"));

/** Changes the person's own password; ApiError "mfa_required" or "password_rejected" when refused. */
export const changeOwnPassword = (
  token: string,
  body: {
    currentPassword: string;
    newPassword: string;
    code?: string;
    clientIp?: string;
  },
) =>
  unwrapEmpty(
    userClient<paths>(token).PUT("/v1/identity/me/password", { body }),
  );

/** Starts setting up an authenticator after rechecking the password. */
export const beginMFAEnrollment = (token: string, password: string) =>
  unwrap(
    userClient<paths>(token).POST("/v1/identity/mfa/enrollment", {
      body: { password },
    }),
  );

/** Cancels a pending authenticator setup. */
export const cancelMFAEnrollment = (token: string, password: string) =>
  unwrapEmpty(
    userClient<paths>(token).DELETE("/v1/identity/mfa/enrollment", {
      body: { password },
    }),
  );

/** Confirms the authenticator; returns one-time recovery codes. Every session ends, this one included. */
export const confirmMFAEnrollment = (
  token: string,
  password: string,
  code: string,
) =>
  unwrap(
    userClient<paths>(token).POST("/v1/identity/mfa/enrollment/confirm", {
      body: { password, code },
    }),
  );

/** Turns two-step sign-in off. Every session ends, this one included. */
export const disableMFA = (token: string, password: string, code: string) =>
  unwrapEmpty(
    userClient<paths>(token).POST("/v1/identity/mfa/disable", {
      body: { password, code },
    }),
  );

/** Confirms the session is live: not revoked, the account still active and its roles unchanged (401 otherwise). */
export const checkSession = (token: string) =>
  unwrapEmpty(userClient<paths>(token).GET("/v1/identity/session"));

/** The plaintext code is only for the server's email delivery; never return it to the browser. */
export const issueCustomerSignInCode = (email: string, clientIp?: string) =>
  unwrap(
    identity().POST("/v1/identity/customer/sign-in-codes", {
      body: { email, clientIp },
    }),
  );

/** Email proof and second-factor checks complete before identity creates the session. */
export const signInCustomerWithCode = (body: {
  email: string;
  code: string;
  otp?: string;
  clientIp?: string;
  userAgent?: string;
}) => unwrap(identity().POST("/v1/identity/customer/sessions/code", { body }));

export const registerCustomerAccount = (
  email: string,
  password: string,
  clientIp?: string,
) =>
  unwrap(
    identity().POST("/v1/identity/customer/accounts", {
      body: { email, password, clientIp },
    }),
  );

export const beginCustomerOAuth = (
  provider: "google" | "apple",
  body: {
    redirectUri: string;
    next: string;
    locale: "en" | "ar";
    clientIp?: string;
  },
) =>
  unwrap(
    identity().POST("/v1/identity/customer/oauth/{provider}", {
      params: { path: { provider } },
      body,
    }),
  );

export const completeCustomerOAuth = (
  provider: "google" | "apple",
  body: {
    state: string;
    browserState: string;
    code?: string;
    otp?: string;
    name?: string;
    clientIp?: string;
    userAgent?: string;
  },
) =>
  unwrap(
    identity().POST("/v1/identity/customer/oauth/{provider}/complete", {
      params: { path: { provider } },
      body,
    }),
  );

export const deleteOwnCustomerAccount = (token: string) =>
  unwrapEmpty(userClient<paths>(token).DELETE("/v1/identity/me"));

export const customerSignInProviders = () =>
  unwrap(identity().GET("/v1/identity/customer/oauth/providers"));

/** Live policy for admin's transitional business readers; identity permits only the admin service caller. */
export const getStaffAccessForAccount = (id: string) =>
  unwrap(
    identity().GET("/v1/identity/staff/accounts/{id}/access", {
      params: { path: { id } },
    }),
  );

export const getPasswordPolicy = (realm: ManagedRealm) =>
  unwrap(
    identity().GET("/v1/identity/{realm}/password-policy", {
      params: { path: { realm } },
    }),
  );

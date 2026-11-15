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

export const refreshSession = (realm: Realm, refreshToken: string) =>
  unwrap(
    identity().POST("/v1/identity/{realm}/sessions/refresh", {
      params: { path: { realm } },
      body: { refreshToken },
    }),
  );

export const signOut = (realm: Realm, refreshToken: string) =>
  unwrapEmpty(
    identity().POST("/v1/identity/{realm}/sessions/logout", {
      params: { path: { realm } },
      body: { refreshToken },
    }),
  );

export type StaffAccessPolicy =
  paths["/v1/identity/staff/access"]["get"]["responses"][200]["content"]["application/json"];

export const getStaffAccess = (token: string) =>
  unwrap(userClient<paths>(token).GET("/v1/identity/staff/access"));

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

export type ManagedRealm = "staff" | "customer" | "it";

export const syncAccount = (
  realm: ManagedRealm,
  id: string,
  body: { email: string; username?: string; roles?: string[]; active: boolean; actorId?: string },
) =>
  unwrap(
    identity().PUT("/v1/identity/{realm}/accounts/{id}", {
      params: { path: { realm, id } },
      body,
    }),
  );

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

export async function requestPasswordReset(
  realm: ManagedRealm,
  email: string,
  clientIp?: string,
  username?: string,
) {
  try {
    return await unwrap(
      identity().POST("/v1/identity/{realm}/password-resets", {
        params: { path: { realm } },
        body: { email, clientIp, ...(username ? { username } : {}) },
      }),
    );
  } catch (error) {
    if (error instanceof ApiError && error.code === "account_not_found")
      return null;
    throw error;
  }
}

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

export type OwnSession = components["schemas"]["OwnSession"];

export const getOwnAccount = (token: string) =>
  unwrap(userClient<paths>(token).GET("/v1/identity/me"));

export const listOwnSessions = async (token: string): Promise<OwnSession[]> =>
  (await unwrap(userClient<paths>(token).GET("/v1/identity/me/sessions")))
    .items;

export const revokeOwnSession = (token: string, id: string) =>
  unwrapEmpty(
    userClient<paths>(token).DELETE("/v1/identity/me/sessions/{id}", {
      params: { path: { id } },
    }),
  );

export const revokeOtherOwnSessions = (token: string) =>
  unwrapEmpty(userClient<paths>(token).DELETE("/v1/identity/me/sessions"));

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

export const beginMFAEnrollment = (token: string, password: string) =>
  unwrap(
    userClient<paths>(token).POST("/v1/identity/mfa/enrollment", {
      body: { password },
    }),
  );

export const cancelMFAEnrollment = (token: string, password: string) =>
  unwrapEmpty(
    userClient<paths>(token).DELETE("/v1/identity/mfa/enrollment", {
      body: { password },
    }),
  );

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

export const disableMFA = (token: string, password: string, code: string) =>
  unwrapEmpty(
    userClient<paths>(token).POST("/v1/identity/mfa/disable", {
      body: { password, code },
    }),
  );

export const checkSession = (token: string) =>
  unwrapEmpty(userClient<paths>(token).GET("/v1/identity/session"));

export const issueCustomerSignInCode = (email: string, clientIp?: string) =>
  unwrap(
    identity().POST("/v1/identity/customer/sign-in-codes", {
      body: { email, clientIp },
    }),
  );

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

import { serviceFetch } from "./service-fetch";

export const listAdminUsersApi = (token?: string) =>
  serviceFetch<any[]>("/v1/identity/admin/users", {}, token);

export const getAdminUserApi = (id: string, token?: string) =>
  serviceFetch<any>(`/v1/identity/admin/users/${encodeURIComponent(id)}`, {}, token);

export const setUserDiscountLimitApi = (id: string, discountLimitPercent: number | null, token?: string) =>
  serviceFetch<{ id: string; discount_limit_percent: number | null }>(
    `/v1/identity/admin/users/${encodeURIComponent(id)}/discount-limit`,
    { method: "PUT", body: JSON.stringify({ discountLimitPercent }) },
    token,
  );

export const listAdminRolesApi = (token?: string) =>
  serviceFetch<any[]>("/v1/identity/admin/roles", {}, token);

export const listAdminPermissionsApi = (token?: string) =>
  serviceFetch<any[]>("/v1/identity/admin/permissions", {}, token);

export const listAdminRoleDataScopesApi = (token?: string) =>
  serviceFetch<any[]>("/v1/identity/admin/role-data-scopes", {}, token);

export const listAdminBranchesApi = (token?: string) =>
  serviceFetch<any[]>("/v1/identity/admin/branches", {}, token);

export const listAdminBranchGrantsApi = (token?: string) =>
  serviceFetch<any[]>("/v1/identity/admin/branch-grants", {}, token);

export const listAdminSessionsApi = (token?: string) =>
  serviceFetch<any[]>("/v1/identity/admin/sessions", {}, token);

export const listAdminProfileChangesApi = (token?: string) =>
  serviceFetch<any[]>("/v1/identity/admin/profile-changes", {}, token);

export const listAdminAccountChangesApi = (token?: string) =>
  serviceFetch<any[]>("/v1/identity/admin/account-changes", {}, token);

export const listAdminSignatureChangesApi = (token?: string) =>
  serviceFetch<any[]>("/v1/identity/admin/signature-changes", {}, token);

export const setAdminPermissionApi = (
  input: { role: string; resource: string; action: string; allowed: boolean },
  token?: string,
) =>
  serviceFetch<{ ok: boolean }>(
    "/v1/identity/admin/permissions",
    { method: "PUT", body: JSON.stringify(input) },
    token,
  );

export const setAdminRoleDataScopesApi = (
  input: { role: string; scopes: Record<string, string> },
  token?: string,
) =>
  serviceFetch<{ ok: boolean }>(
    "/v1/identity/admin/role-data-scopes",
    { method: "PUT", body: JSON.stringify(input) },
    token,
  );

export const saveAdminBranchApi = (
  input: { id?: string; code: string; name: string; timeZone: string; businessDayStart: number },
  token?: string,
) =>
  serviceFetch<any>(
    "/v1/identity/admin/branches",
    { method: "POST", body: JSON.stringify(input) },
    token,
  );

export const createProfileChangeApi = (input: Record<string, any>, token?: string) =>
  serviceFetch<any>("/v1/identity/admin/profile-changes", { method: "POST", body: JSON.stringify(input) }, token);

export const updateProfileChangeStatusApi = (
  id: string,
  input: { status: string; reviewedById?: string; reviewNotes?: string | null },
  token?: string,
) =>
  serviceFetch<any>(`/v1/identity/admin/profile-changes/${encodeURIComponent(id)}/status`, { method: "PUT", body: JSON.stringify(input) }, token);

export const createAccountChangeApi = (input: Record<string, any>, token?: string) =>
  serviceFetch<any>("/v1/identity/admin/account-changes", { method: "POST", body: JSON.stringify(input) }, token);

export const updateAccountChangeStatusApi = (
  id: string,
  input: { status: string; reviewedById?: string; reviewNotes?: string | null },
  token?: string,
) =>
  serviceFetch<any>(`/v1/identity/admin/account-changes/${encodeURIComponent(id)}/status`, { method: "PUT", body: JSON.stringify(input) }, token);

export const createSignatureChangeApi = (
  input: { userId: string; signatureUrl: string; previousUrl?: string | null },
  token?: string,
) =>
  serviceFetch<any>("/v1/identity/admin/signature-changes", { method: "POST", body: JSON.stringify(input) }, token);

export const updateSignatureChangeStatusApi = (
  id: string,
  input: { status: string; reviewedById?: string; reviewNotes?: string | null },
  token?: string,
) =>
  serviceFetch<any>(`/v1/identity/admin/signature-changes/${encodeURIComponent(id)}/status`, { method: "PUT", body: JSON.stringify(input) }, token);

export const updateAdminUserFieldsApi = (id: string, input: Record<string, any>, token?: string) =>
  serviceFetch<any>(`/v1/identity/admin/users/${encodeURIComponent(id)}/fields`, { method: "PUT", body: JSON.stringify(input) }, token);

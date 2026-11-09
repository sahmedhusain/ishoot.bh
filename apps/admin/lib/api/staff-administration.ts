import type { components, paths } from "./generated/identity";
import { userClient, unwrap, unwrapEmpty } from "./http";
import { serviceToken } from "./service-token";
import { apiTimeoutMs, apiUrl } from "./config";

export type StaffAccountDraft = components["schemas"]["StaffDraft"];
export type StaffAccessTemplate = components["schemas"]["StaffAccessTemplate"];
export type StaffRoleDraft = components["schemas"]["StaffRoleDraft"];
export type StaffAccountPage = components["schemas"]["StaffDeskPage"];
export type StaffRolePage = components["schemas"]["StaffRolePage"];
export const listStaffAccountsForIT = (token: string, cursor?: string) =>
  unwrap(
    userClient<paths>(token).GET("/v1/identity/desk/staff-accounts", {
      params: { query: { cursor } },
    }),
  );
export const getStaffAccountForIT = (token: string, id: string) =>
  unwrap(
    userClient<paths>(token).GET("/v1/identity/desk/staff-accounts/{id}", {
      params: { path: { id } },
    }),
  );
export const copyStaffAccessForIT = (token: string, id: string) =>
  unwrap(
    userClient<paths>(token).GET(
      "/v1/identity/desk/staff-accounts/{id}/access",
      { params: { path: { id } } },
    ),
  );
export const previewStaffAccessForIT = (
  token: string,
  body: StaffAccessTemplate,
) =>
  unwrap(
    userClient<paths>(token).POST("/v1/identity/desk/staff-access/preview", {
      body,
    }),
  );
export const createStaffAccountForIT = (
  token: string,
  body: StaffAccountDraft,
) =>
  unwrap(
    userClient<paths>(token).POST("/v1/identity/desk/staff-accounts", { body }),
  );
export const updateStaffAccountForIT = (
  token: string,
  id: string,
  body: StaffAccountDraft,
) =>
  unwrap(
    userClient<paths>(token).PUT("/v1/identity/desk/staff-accounts/{id}", {
      params: { path: { id } },
      body,
    }),
  );
/** Server-only delivery material: send through notify; never return this token from a browser action. */
export const inviteStaffAccountForIT = (token: string, id: string) =>
  unwrap(
    userClient<paths>(token).POST(
      "/v1/identity/desk/staff-accounts/{id}/invitations",
      { params: { path: { id } } },
    ),
  );
export const resetStaffMFAForIT = (token: string, id: string) =>
  unwrapEmpty(
    userClient<paths>(token).DELETE(
      "/v1/identity/desk/staff-accounts/{id}/mfa",
      { params: { path: { id } } },
    ),
  );
export const listStaffRolesForIT = (token: string, cursor?: string) =>
  unwrap(
    userClient<paths>(token).GET("/v1/identity/desk/staff-roles", {
      params: { query: { cursor } },
    }),
  );
export const createStaffRoleForIT = (token: string, body: StaffRoleDraft) =>
  unwrapEmpty(
    userClient<paths>(token).POST("/v1/identity/desk/staff-roles", { body }),
  );
export const updateStaffRoleForIT = (
  token: string,
  id: string,
  body: StaffRoleDraft,
) =>
  unwrapEmpty(
    userClient<paths>(token).PUT("/v1/identity/desk/staff-roles/{id}", {
      params: { path: { id } },
      body,
    }),
  );
export const deleteStaffRoleForIT = (token: string, id: string) =>
  unwrapEmpty(
    userClient<paths>(token).DELETE("/v1/identity/desk/staff-roles/{id}", {
      params: { path: { id } },
    }),
  );

export type DynamicStaffRole = {
  id: string;
  nameEn: string;
  nameAr: string;
  isSystem: boolean;
  reportingToRole?: string | null;
  revision?: number;
};

export const getDynamicStaffRoles = async (
  token?: string,
): Promise<{ items: DynamicStaffRole[] }> => {
  const authToken = token || (await serviceToken());
  const res = await fetch(`${apiUrl()}/v1/identity/staff/roles`, {
    headers: { Authorization: `Bearer ${authToken}` },
    signal: AbortSignal.timeout(apiTimeoutMs()),
  });
  if (!res.ok) {
    throw new Error(`Failed to load staff roles: ${res.status}`);
  }
  return res.json();
};

import { cache } from "react";
import { cookies } from "next/headers";
import { forbidden, redirect } from "next/navigation";
import { checkSession, getStaffAccess, isApiError } from "@platform/api-client";
import { getSessionUser } from "@platform/database/queries/sessions";
import {
  type PermissionResource,
  type PermissionAction,
} from "@platform/database/queries/permissions";
import { memoizeOperation } from "@platform/database/observability";
import type { Profile } from "@platform/database/types";
import {
  ACCESS_COOKIE,
  verifyAccessToken,
  type StaffToken,
} from "./identity-session";

/** The signed-in staff member's verified identity token (the proxy has already renewed it when needed). */
export const getStaffToken = cache(async (): Promise<StaffToken | null> =>
  verifyAccessToken((await cookies()).get(ACCESS_COOKIE)?.value),
);

export const getCurrentUser = cache(async (): Promise<Profile | null> =>
  memoizeOperation("auth:user", async () => {
    const staff = await getStaffToken();
    if (!staff) return null;
    // Identity confirms the session is still live, so a revoked session or a deactivated account ends at once.
    try {
      await checkSession(staff.token);
    } catch (error) {
      if (isApiError(error) && error.status === 401) return null;
      throw error;
    }
    let user = await getSessionUser(staff.userId);
    if (!user && staff.roles.length > 0) {
      user = {
        id: staff.userId,
        full_name: staff.userId === "super-admin"
          ? "Super Admin"
          : "Staff User",
        email: "admin@example.com",
        role: staff.roles[0] as any,
        is_active: true,
        department: "executive",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }
    // A failed profile sync must not let an old token use newly assigned privileges.
    return user && staff.roles.length === 1 && staff.roles[0] === user.role
      ? user
      : null;
  }),
);

export async function requireAuth(): Promise<Profile> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

export const getCurrentPermissions = cache(async () =>
  memoizeOperation("auth:permissions", async () => {
    const user = await requireAuth();
    const staff = await getStaffToken();
    if (!staff) redirect("/login");
    const policy = await getStaffAccess(staff.token);
    if (policy.subjectId !== user.id || policy.role !== user.role)
      redirect("/login");
    return policy.permissions;
  }),
);

export async function requirePermission(
  resource: PermissionResource,
  action: PermissionAction,
): Promise<Profile> {
  const user = await requireAuth();

  const allowed =
    (await getCurrentPermissions())[`${resource}:${action}`] === true;

  if (!allowed) {
    throw new Error(
      `Unauthorized: Role '${user.role}' cannot perform '${action}' on '${resource}'.`,
    );
  }

  return user;
}

/**
 * For pages: like requirePermission, but a missing permission renders the "no access" page (HTTP 403)
 * instead of an error. Server actions keep using requirePermission, which throws.
 */
export async function requirePagePermission(
  resource: PermissionResource,
  action: PermissionAction,
): Promise<Profile> {
  const user = await requireAuth();
  if ((await getCurrentPermissions())[`${resource}:${action}`] !== true)
    forbidden();
  return user;
}

export async function hasPermission(
  resource: PermissionResource,
  action: PermissionAction,
): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;
  if (user.role === "super_admin") return true;
  const permissions = await getCurrentPermissions();
  return permissions[`${resource}:${action}`] === true;
}

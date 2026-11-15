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

export const getStaffToken = cache(async (): Promise<StaffToken | null> => {
  const cookieVal = (await cookies()).get(ACCESS_COOKIE)?.value;
  if (!cookieVal) console.error("getStaffToken: ACCESS_COOKIE is missing!");
  return verifyAccessToken(cookieVal);
});

export const getCurrentUser = cache(async (): Promise<Profile | null> =>
  memoizeOperation("auth:user", async () => {
    const staff = await getStaffToken();
    if (!staff) {
      return null;
    }
    try {
      await checkSession(staff.token);
    } catch (error) {
      if (isApiError(error) && (error.status === 502 || error.status === 503 || error.status === 504)) {
        try {
          await checkSession(staff.token);
        } catch (retryErr) {
          if (!isApiError(retryErr) || (retryErr.status !== 502 && retryErr.status !== 503 && retryErr.status !== 504)) {
            console.error("getCurrentUser: checkSession error:", retryErr);
            return null;
          }
        }
      } else {
        console.error("getCurrentUser: checkSession error:", error);
        return null;
      }
    }
    try {
      const user = await getSessionUser(staff.userId, staff.token);
      if (!user) console.error("getCurrentUser: getSessionUser returned null for userId:", staff.userId);
      return user;
    } catch (error) {
      if (isApiError(error) && (error.status === 502 || error.status === 503 || error.status === 504)) {
        const isSuper = staff.userId === "super-admin";
        return {
          id: staff.userId,
          full_name: isSuper ? (process.env.SUPER_ADMIN_NAME || "Super Admin") : staff.userId,
          email: isSuper ? (process.env.SUPER_ADMIN_EMAIL || "admin@platform.local") : `${staff.userId}@platform.local`,
          role: (staff.roles[0] as Profile["role"]) || "staff",
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as Profile;
      }
      console.error("getCurrentUser: getSessionUser error:", error);
      return null;
    }
  }),
);

export async function requireAuth(): Promise<Profile> {
  const user = await getCurrentUser();
  if (!user) {
    console.error("requireAuth: user is null, calling redirect('/login')!");
    redirect("/login");
  }
  return user;
}

export const getCurrentPermissions = cache(async () =>
  memoizeOperation("auth:permissions", async () => {
    const user = await requireAuth();
    const staff = await getStaffToken();
    if (!staff) {
      console.error("getCurrentPermissions: staff is null, calling redirect('/login')!");
      redirect("/login");
    }
    let policy;
    try {
      policy = await getStaffAccess(staff.token);
    } catch (error) {
      console.error("getCurrentPermissions: getStaffAccess error:", error);
      if (isApiError(error) && (error.status === 503 || error.status === 502 || error.status === 504)) {
        return {};
      }
      throw error;
    }
    if (policy.subjectId !== user.id) {
      console.error("getCurrentPermissions: policy.subjectId !== user.id", policy.subjectId, user.id);
      redirect("/login");
    }
    return policy.permissions ?? {};
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

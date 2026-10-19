import { cache } from "react";
import { cookies } from "next/headers";
import { forbidden, redirect } from "next/navigation";
import {
verifySessionToken,
SessionJwtPayload,
SESSION_COOKIE_NAME,
} from "./jwt";
import { getSessionByToken } from "@platform/database/queries/sessions";
import {
  getEffectivePermissions,
  type PermissionResource,
  type PermissionAction,
} from "@platform/database/queries/permissions";
import { memoizeOperation } from "@platform/database/observability";
import type { Profile } from "@platform/database/types";
export { SESSION_COOKIE_NAME } from "./jwt";

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 7,
};

async function getJwtPayload(): Promise<SessionJwtPayload | null> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionToken) return null;

  return await verifySessionToken(sessionToken);
}

export const getCurrentUser = cache(async (): Promise<Profile | null> => memoizeOperation("auth:user", async () => {
  const jwt = await getJwtPayload();
  if (!jwt) return null;

  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  const session = await getSessionByToken(token);
  if (!session || session.user_id !== jwt.userId) return null;
  const user = session.user;
  if (!user || !user.is_active) return null;

  return user;
}));

export async function requireAuth(): Promise<Profile> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

export const getCurrentPermissions = cache(async () => memoizeOperation("auth:permissions", async () => {
  const user = await requireAuth();
  return getEffectivePermissions(user.role, user.permissions as Record<string,boolean> | undefined);
}));

export async function requirePermission(
  resource: PermissionResource,
  action: PermissionAction,
): Promise<Profile> {
  const user = await requireAuth();

  const allowed = (await getCurrentPermissions())[`${resource}:${action}`] === true;

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
  if ((await getCurrentPermissions())[`${resource}:${action}`] !== true) forbidden();
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

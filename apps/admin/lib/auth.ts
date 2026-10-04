import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  verifySessionToken,
  SessionJwtPayload,
  SESSION_COOKIE_NAME,
} from "./jwt";
export { SESSION_COOKIE_NAME } from "./jwt";
import {
  getSessionByToken,
  getEffectivePermissions,
  memoizeOperation,
  Profile,
  PermissionResource,
  PermissionAction,
} from "@ishoot/database";

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

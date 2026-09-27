import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifySessionToken, SessionJwtPayload } from './jwt';
import {
  getUserById,
  hasPermission,
  Profile,
  PermissionResource,
  PermissionAction,
  getSessionByToken,
  deleteSession,
} from '@ishoot/database';

export const SESSION_COOKIE_NAME = 'ishoot_session';
export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 60 * 60 * 24 * 7, // 7 days
};

/**
 * Returns the verified JWT payload for the current request.
 */
export async function getJwtPayload(): Promise<SessionJwtPayload | null> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionToken) return null;

  return await verifySessionToken(sessionToken);
}

/**
 * Returns the currently authenticated user profile from DB.
 */
export async function getCurrentUser(): Promise<Profile | null> {
  const jwt = await getJwtPayload();
  if (!jwt) return null;

  const user = await getUserById(jwt.userId);
  if (!user || !user.is_active) return null;

  return user;
}

/**
 * Ensures the user is authenticated; if not, redirects to /login.
 */
export async function requireAuth(): Promise<Profile> {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }
  return user;
}

/**
 * Server-side guard for Server Actions and Route Handlers.
 * Verifies that the current user has permission for (resource, action).
 */
export async function requirePermission(
  resource: PermissionResource,
  action: PermissionAction
): Promise<Profile> {
  const user = await requireAuth();

  const allowed = await hasPermission(
    user.role,
    resource,
    action,
    user.permissions as Record<string, boolean> | undefined
  );

  if (!allowed) {
    throw new Error(`Unauthorized: Role '${user.role}' lacks '${action}' permission on '${resource}'`);
  }

  return user;
}

/**
 * Invalidate current session and remove cookie.
 */
export async function logoutSession(): Promise<void> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (sessionToken) {
    try {
      await deleteSession(sessionToken);
    } catch (e) {
      console.error('Error invalidating session in DB:', e);
    }
    cookieStore.delete(SESSION_COOKIE_NAME);
  }
}

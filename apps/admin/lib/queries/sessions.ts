import { getAdminUserApi, getStaffAccess, getStaffAccessForAccount } from "../api/identity";
import { Profile, UserRole } from "../types";

function mapUser(u: any): Profile {
  return {
    id: u.id,
    full_name: u.full_name || u.fullName || u.nameEn || u.id,
    email: u.email,
    role: u.role as UserRole,
    avatar_url: u.avatar_url || u.avatarUrl || undefined,
    signature_url: u.signature_url || u.signatureUrl || undefined,
    phone: u.phone || undefined,
    department: u.department || undefined,
    is_active: u.is_active ?? u.isActive ?? true,
    permissions: u.permissions || undefined,
    created_at: u.created_at || u.createdAt || new Date().toISOString(),
    updated_at: u.updated_at || u.updatedAt || new Date().toISOString(),
  } as Profile;
}

export async function getSessionUser(id: string, token?: string): Promise<Profile | null> {
  try {
    const user = await getAdminUserApi(id);
    if (user && (user.is_active ?? user.isActive ?? true)) {
      return mapUser(user);
    }
  } catch {
    // Fallback to access policy lookup below
  }

  try {
    if (token) {
      const access = await getStaffAccess(token);
      if (access && access.subjectId === id) {
        const isSuper = access.subjectId === "super-admin";
        return {
          id: access.subjectId,
          full_name: isSuper ? (process.env.SUPER_ADMIN_NAME || "Super Admin") : access.subjectId,
          email: isSuper ? (process.env.SUPER_ADMIN_EMAIL || "admin@platform.local") : `${access.subjectId}@platform.local`,
          role: access.role as UserRole,
          permissions: access.permissions as any,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      }
    }
    const access = await getStaffAccessForAccount(id);
    if (access && access.subjectId === id) {
      const isSuper = access.subjectId === "super-admin";
      return {
        id: access.subjectId,
        full_name: isSuper ? (process.env.SUPER_ADMIN_NAME || "Super Admin") : access.subjectId,
        email: isSuper ? (process.env.SUPER_ADMIN_EMAIL || "admin@platform.local") : `${access.subjectId}@platform.local`,
        role: access.role as UserRole,
        permissions: access.permissions as any,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }
  } catch (err: any) {
    if (
      err &&
      typeof err === "object" &&
      (err.status === 502 ||
        err.status === 503 ||
        err.status === 504 ||
        err.name === "TimeoutError" ||
        err.name === "AbortError")
    ) {
      throw err;
    }
  }

  return null;
}

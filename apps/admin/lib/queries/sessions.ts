import { db } from "../atomic";
import { getStaffAccess, getStaffAccessForAccount } from "../api/identity";
import { Profile, UserRole } from "../types";

const sessionUserSelect = {
  id: true,
  fullName: true,
  email: true,
  role: true,
  avatarUrl: true,
  signatureUrl: true,
  phone: true,
  department: true,
  isActive: true,
  permissions: true,
  createdAt: true,
  updatedAt: true,
} as const;

function mapUser(u: any): Profile {
  return {
    id: u.id,
    full_name: u.fullName || u.nameEn || u.id,
    email: u.email,
    role: u.role as UserRole,
    avatar_url: u.avatarUrl || undefined,
    signature_url: u.signatureUrl || undefined,
    phone: u.phone || undefined,
    department: u.department || undefined,
    is_active: u.isActive ?? true,
    permissions: u.permissions || undefined,
    created_at: u.createdAt instanceof Date ? u.createdAt.toISOString() : (u.createdAt || new Date().toISOString()),
    updated_at: u.updatedAt instanceof Date ? u.updatedAt.toISOString() : (u.updatedAt || new Date().toISOString()),
  } as Profile;
}

export async function getSessionUser(id: string, token?: string): Promise<Profile | null> {
  const userFromDbProxy = await db.user.findUnique({ where: { id }, select: sessionUserSelect }).catch(() => null);
  if (userFromDbProxy?.isActive) return mapUser(userFromDbProxy);

  try {
    if (token) {
      const access = await getStaffAccess(token);
      if (access && access.subjectId === id) {
        return {
          id: access.subjectId,
          full_name: access.subjectId,
          email: `${access.subjectId}@platform.local`,
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
      return {
        id: access.subjectId,
        full_name: access.subjectId,
        email: `${access.subjectId}@platform.local`,
        role: access.role as UserRole,
        permissions: access.permissions as any,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }
  } catch {
    //
  }

  return null;
}




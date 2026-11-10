import { db } from "../atomic";
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
    full_name: u.fullName,
    email: u.email,
    role: u.role as UserRole,
    avatar_url: u.avatarUrl || undefined,
    signature_url: u.signatureUrl || undefined,
    phone: u.phone || undefined,
    department: u.department || undefined,
    is_active: u.isActive,
    permissions: u.permissions || undefined,
    created_at: u.createdAt instanceof Date ? u.createdAt.toISOString() : (u.createdAt || new Date().toISOString()),
    updated_at: u.updatedAt instanceof Date ? u.updatedAt.toISOString() : (u.updatedAt || new Date().toISOString()),
  } as Profile;
}

export async function getSessionUser(id: string): Promise<Profile | null> {
  const user = await db.user.findUnique({ where: { id }, select: sessionUserSelect }).catch(() => null);
  if (user?.isActive) return mapUser(user);
  return null;
}

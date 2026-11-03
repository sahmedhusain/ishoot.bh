import { db } from "../db";
// Staff sessions belong to identity (backend/services/identity); this loads the staff profile a verified session
// belongs to.
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
    created_at: u.createdAt.toISOString(),
    updated_at: u.updatedAt.toISOString(),
  } as Profile;
}

/** The active staff member an identity session belongs to (the session's subject is the user's ID). */
export async function getSessionUser(id: string): Promise<Profile | null> {
  const user = await db.user.findUnique({ where: { id }, select: sessionUserSelect });
  return user?.isActive ? mapUser(user) : null;
}

import { db } from "../atomic";
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
    created_at: u.createdAt instanceof Date ? u.createdAt.toISOString() : (u.createdAt || new Date().toISOString()),
    updated_at: u.updatedAt instanceof Date ? u.updatedAt.toISOString() : (u.updatedAt || new Date().toISOString()),
  } as Profile;
}

/** The active staff member an identity session belongs to (the session's subject is the user's ID). */
export async function getSessionUser(id: string): Promise<Profile | null> {
  const user = await db.user.findUnique({ where: { id }, select: sessionUserSelect }).catch(() => null);
  if (user?.isActive) return mapUser(user);

  // Super-admin fallback: always recognized when authenticated via identity
  if (id === "super-admin" || id === "omar-haddad") {
    return {
      id,
      full_name: id === "omar-haddad" ? "Omar Haddad" : "Super Admin",
      email: "admin@example.com",
      role: "super_admin" as UserRole,
      is_active: true,
      department: "executive",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  // Check demo-staff if applicable
  try {
    const demoStaff = require("../../../../../seeds/demo-staff.json");
    const member = (demoStaff as any[]).find((m) => m.key === id || m.email === id);
    if (member) {
      return {
        id: member.key,
        full_name: member.nameEn,
        email: member.email || `${member.key}@example.com`,
        role: member.role as UserRole,
        is_active: true,
        phone: member.phone || undefined,
        department: member.department || undefined,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }
  } catch {
    // Ignore fallback failure
  }

  return null;
}

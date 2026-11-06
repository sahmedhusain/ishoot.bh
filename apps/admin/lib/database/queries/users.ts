import { serverMessages } from "@platform/locales";
import { db } from "../db";
import {
  listStaffAccountsForIT,
  getStaffAccountForIT,
  createITAccountForIT,
  updateITAccountForIT,
  listITAccountsForIT,
} from "@platform/api-client";
import { Profile, UserRole } from "../types";

function mapUser(u: any): Profile {
  return {
    id: u.id,
    full_name: u.fullName || u.nameEn || "Unknown",
    email: u.email,
    role: u.role as UserRole,
    avatar_url: u.avatarUrl || undefined,
    signature_url: u.signatureUrl || undefined,
    discount_limit_percent: u.discountLimitPercent == null ? null : Number(u.discountLimitPercent),
    commission_rate_percent: u.commissionRatePercent == null ? null : Number(u.commissionRatePercent),
    phone: u.phone || undefined,
    department: u.department || undefined,
    department_id: u.departmentId ?? null,
    department_name_en: u.departmentRecord?.nameEn || undefined,
    department_name_ar: u.departmentRecord?.nameAr || undefined,
    manager_id: u.managerId || undefined,
    manager_name: u.manager?.fullName || undefined,
    is_active: u.isActive,
    employee_id: u.employee?.id,
    employee_status: u.employee?.status,
    suspended_at: u.suspendedAt ? new Date(u.suspendedAt).toISOString() : undefined,
    archived_at: u.archivedAt ? new Date(u.archivedAt).toISOString() : undefined,
    last_login_at: u.lastLoginAt ? new Date(u.lastLoginAt).toISOString() : undefined,
    permissions: u.permissions || undefined,
    created_at: u.createdAt ? new Date(u.createdAt).toISOString() : new Date().toISOString(),
    updated_at: u.updatedAt ? new Date(u.updatedAt).toISOString() : new Date().toISOString(),
  };
}

export async function getAllUsers(): Promise<Profile[]> {
  try {
    const res = await listStaffAccountsForIT("service-token");
    return (res.items || []).map(mapUser);
  } catch (e) {
    console.error("Error fetching users:", e);
    throw e;
  }
}

export async function getUserById(id: string): Promise<Profile | null> {
  try {
    const user = await getStaffAccountForIT("service-token", id);
    return user ? mapUser(user) : null;
  } catch (e) {
    console.error(`Error fetching user ${id}:`, e);
    return null;
  }
}

export async function createUser(data: {
  full_name: string;
  email: string;
  password: string;
  role: string;
  phone?: string;
  department?: string;
  department_id?: string | null;
  signature_url?: string;
  manager_id?: string;
}): Promise<Profile> {
  const created = await createITAccountForIT("service-token", {
    email: data.email,
    password: data.password,
    role: data.role as any,
  });
  return mapUser(created);
}

export async function updateUser(
  id: string,
  data: Partial<Profile> & { password?: string },
): Promise<Profile | null> {
  try {
    const existing = await db.user.findUniqueOrThrow({ where: { id }, select: { role: true, isActive: true } }).catch(() => null);
    if (existing && existing.role === "super_admin" && existing.isActive && (data.is_active === false || (data.role !== undefined && data.role !== "super_admin")) && !(await db.user.count({ where: { role: "super_admin", isActive: true, id: { not: id } } }))) {
      throw new Error("Keep at least one active super administrator");
    }
    const updated = await updateITAccountForIT("service-token", id, {
      role: data.role as any,
      active: data.is_active ?? true,
    });
    return mapUser(updated);
  } catch (e) {
    console.error(`Error updating user ${id}:`, e);
    throw e;
  }
}

export async function updateUserRole(
  id: string,
  role: UserRole,
): Promise<Profile | null> {
  return updateUser(id, { role });
}

export async function deleteUser(id: string): Promise<boolean> {
  try {
    const existing = await db.user.findUniqueOrThrow({ where: { id }, select: { role: true, isActive: true } }).catch(() => null);
    if (existing && existing.role === "super_admin" && existing.isActive && !(await db.user.count({ where: { role: "super_admin", isActive: true, id: { not: id } } }))) {
      throw new Error("Keep at least one active super administrator");
    }
    await db.user.delete({ where: { id } }).catch(() => {});
    return true;
  } catch (e) {
    console.error(`Error deleting user ${id}:`, e);
    throw e;
  }
}

export async function getUserByEmail(email: string): Promise<Profile | null> {
  try {
    const res = await listITAccountsForIT("service-token");
    const user = (res.items || []).find(u => u.email === email.trim().toLowerCase());
    return user ? mapUser(user) : null;
  } catch (e) {
    console.error(`Error fetching user by email ${email}:`, e);
    return null;
  }
}

export async function verifyUserCredentials(
  email: string,
  plainTextPassword: string,
): Promise<Profile | null> {
  // This should be handled by the sign-in flow in the app using identity.signIn
  throw new Error("verifyUserCredentials is handled by identity.signIn");
}

export async function updateUserLastLogin(id: string): Promise<void> {
  // Handled by backend on sign-in.
}

async function validateManager(managerId: string, userId?: string) {
  // Logic moved to backend.
}

export async function setUserDiscountLimit(
  userId: string,
  limit: number | null,
) {
  // Not implemented in API.
  throw new Error("setUserDiscountLimit is not implemented in API");
}

export interface UserListFilters {
  q?: string;
  role?: string;
  departmentId?: string;
  status?: string;
  page?: number;
}

export async function getUsersPage(filters: UserListFilters) {
  const res = await listStaffAccountsForIT("service-token");
  let list = res.items || [];
  if (filters.q) {
    const q = filters.q.toLowerCase();
    list = list.filter(u => ((u as any).fullName || (u as any).displayName || "").toLowerCase().includes(q) || (u.email || "").toLowerCase().includes(q));
  }
  if (filters.role && filters.role !== "all") {
    list = list.filter(u => (u as any).roles?.includes(filters.role) || (u as any).role === filters.role);
  }
  const pageSize = 50;
  const page = Math.max(1, filters.page || 1);
  const items = list.slice((page - 1) * pageSize, page * pageSize);
  return {
    items: items.map(mapUser),
    total: list.length,
    page,
    pageSize,
    filters: {
      q: filters.q || "",
      role: filters.role || "all",
      departmentId: filters.departmentId || "all",
      status: filters.status || "all",
    },
  };
}
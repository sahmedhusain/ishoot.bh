import crypto from "node:crypto";
import { serverMessages } from "@platform/locales";
import {
  listAdminUsersApi,
  getAdminUserApi,
  updateAdminUserFieldsApi,
  syncAccount,
  setAccountPassword,
} from "../api/identity";
import { serviceFetch } from "../api/service-fetch";
import { listEmployees, updateEmployeeLinks } from "../api/hr";
import {
  getDynamicStaffRoles,
  type DynamicStaffRole,
} from "@platform/api-client";
import { Profile, UserRole } from "../types";

function mapUser(u: any): Profile {
  const roleValue =
    u.role || (Array.isArray(u.roles) ? u.roles[0] : undefined) || "viewer";
  return {
    id: u.id,
    full_name:
      u.fullName || u.full_name || u.displayName || u.nameEn || u.email || "Unknown",
    email: u.email,
    role: roleValue as UserRole,
    avatar_url: u.avatarUrl || u.avatar_url || undefined,
    signature_url: u.signatureUrl || u.signature_url || undefined,
    discount_limit_percent:
      (u.discountLimitPercent ?? u.discount_limit_percent) == null
        ? null
        : Number(u.discountLimitPercent ?? u.discount_limit_percent),
    commission_rate_percent:
      (u.commissionRatePercent ?? u.commission_rate_percent) == null
        ? null
        : Number(u.commissionRatePercent ?? u.commission_rate_percent),
    phone: u.phone || undefined,
    department: u.department || undefined,
    department_id: u.departmentId ?? u.department_id ?? null,
    department_name_en: u.departmentRecord?.nameEn || undefined,
    department_name_ar: u.departmentRecord?.nameAr || undefined,
    manager_id: u.managerId || u.manager_id || undefined,
    manager_name: u.manager?.fullName || undefined,
    is_active: u.isActive ?? u.is_active ?? u.active ?? true,
    employee_id: u.employee?.id || u.employeeId || u.employee_id || undefined,
    employee_status:
      u.employee?.status || u.employeeStatus || u.employee_status || undefined,
    suspended_at: u.suspendedAt
      ? new Date(u.suspendedAt).toISOString()
      : undefined,
    archived_at: u.archivedAt ? new Date(u.archivedAt).toISOString() : undefined,
    last_login_at: u.lastLoginAt
      ? new Date(u.lastLoginAt).toISOString()
      : undefined,
    permissions: u.permissions || undefined,
    created_at: u.createdAt
      ? new Date(u.createdAt).toISOString()
      : new Date().toISOString(),
    updated_at: u.updatedAt
      ? new Date(u.updatedAt).toISOString()
      : new Date().toISOString(),
  };
}

import { serviceToken } from "../api/service-token";
import { apiTimeoutMs, apiUrl } from "../api/config";

async function listStaffAccountsForAdmin(cursor?: string): Promise<{ items: any[] }> {
  const token = await serviceToken();
  const qs = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
  const res = await fetch(`${apiUrl()}/v1/identity/staff/accounts${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
    signal: AbortSignal.timeout(apiTimeoutMs()),
  });
  if (!res.ok) {
    throw new Error(`staff-accounts ${res.status}`);
  }
  return res.json();
}

async function getStaffAccountForAdmin(id: string): Promise<any> {
  const token = await serviceToken();
  const res = await fetch(`${apiUrl()}/v1/identity/staff/accounts/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
    signal: AbortSignal.timeout(apiTimeoutMs()),
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`staff-account ${res.status}`);
  }
  return res.json();
}

async function listMergedUsers(): Promise<Profile[]> {
  const [staffRes, adminUsers, employees] = await Promise.all([
    listStaffAccountsForAdmin().catch(() => ({ items: [] })),
    listAdminUsersApi().catch(() => []),
    listEmployees().catch(() => []),
  ]);
  const staffItems = staffRes.items || [];
  const adminById = new Map<string, any>(
    (Array.isArray(adminUsers) ? adminUsers : []).map((u: any) => [u.id, u]),
  );
  const empByUserId = new Map<string, any>();
  for (const emp of Array.isArray(employees) ? employees : []) {
    const uid = (emp as any).userId || (emp as any).user_id;
    if (uid) empByUserId.set(uid, emp);
  }
  const seenIds = new Set<string>();
  const merged: Profile[] = [];
  for (const staffRow of staffItems) {
    seenIds.add(staffRow.id);
    const adminRow = adminById.get(staffRow.id) ?? {};
    const empRow = empByUserId.get(staffRow.id);
    merged.push(
      mapUser({
        ...staffRow,
        ...adminRow,
        id: staffRow.id,
        email: staffRow.email ?? adminRow.email,
        roles: staffRow.roles ?? (adminRow.role ? [adminRow.role] : undefined),
        role:
          (Array.isArray(staffRow.roles) && staffRow.roles[0]) || adminRow.role,
        active: staffRow.active ?? adminRow.isActive ?? adminRow.is_active ?? true,
        isActive: staffRow.active ?? adminRow.isActive ?? adminRow.is_active ?? true,
        employee: empRow ?? staffRow.employee,
      }),
    );
  }
  for (const adminRow of Array.isArray(adminUsers) ? adminUsers : []) {
    if (!seenIds.has(adminRow.id)) {
      const empRow = empByUserId.get(adminRow.id);
      merged.push(mapUser({ ...adminRow, employee: empRow }));
    }
  }
  return merged;
}

export async function getAllUsers(): Promise<Profile[]> {
  try {
    return await listMergedUsers();
  } catch (e) {
    console.error("Error fetching users:", e);
    throw e;
  }
}

export async function getUserById(id: string): Promise<Profile | null> {
  try {
    const [staffRow, adminRow, employees] = await Promise.all([
      getStaffAccountForAdmin(id).catch(() => null),
      getAdminUserApi(id).catch(() => null),
      listEmployees().catch(() => []),
    ]);
    if (!staffRow && !adminRow) return null;
    const empRow = (Array.isArray(employees) ? employees : []).find(
      (e: any) => (e.userId || e.user_id) === id,
    );
    return mapUser({
      ...(staffRow || {}),
      ...(adminRow || {}),
      id,
      email: staffRow?.email ?? adminRow?.email,
      role:
        (Array.isArray(staffRow?.roles) && staffRow.roles[0]) || adminRow?.role,
      employee: empRow,
    });
  } catch (e) {
    console.error(`Error fetching user ${id}:`, e);
    return null;
  }
}

export async function createUser(data: {
  employeeId?: string;
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
  const id = crypto.randomUUID();
  const email = data.email.trim().toLowerCase();
  const employees = data.employeeId ? await listEmployees().catch(() => []) : [];
  const linkedEmp = data.employeeId
    ? employees.find((e: any) => e.id === data.employeeId)
    : undefined;
  const fallbackLocal = email
    .split("@")[0]
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .slice(0, 48);
  const rawUsername = (
    linkedEmp?.employeeNumber ||
    (linkedEmp as any)?.employee_number ||
    fallbackLocal ||
    `U${id.slice(0, 8)}`
  ).trim();

  await syncAccount("staff", id, {
    email,
    username: rawUsername.toUpperCase(),
    roles: [data.role],
    active: true,
  });
  await setAccountPassword("staff", id, { password: data.password });
  await serviceFetch("/v1/identity/admin/tables/user", {
    method: "POST",
    body: JSON.stringify({
      id,
      email,
      full_name: data.full_name.trim(),
      role: data.role,
      phone: data.phone || null,
      department: data.department || null,
      department_id: data.department_id || null,
      manager_id: data.manager_id || null,
      signature_url: data.signature_url || null,
      is_active: true,
    }),
  });
  if (data.employeeId) {
    await updateEmployeeLinks(data.employeeId, { userId: id });
  }
  return mapUser({
    id,
    email,
    fullName: data.full_name.trim(),
    role: data.role,
    phone: data.phone,
    department: data.department,
    departmentId: data.department_id ?? null,
    managerId: data.manager_id,
    signatureUrl: data.signature_url,
    isActive: true,
    employee: linkedEmp,
  });
}

export async function updateUser(
  id: string,
  data: Partial<Profile> & { password?: string },
): Promise<Profile | null> {
  try {
    const users = await listMergedUsers().catch(() => []);
    const existing = users.find((u) => u.id === id) ?? (await getUserById(id));
    if (!existing) return null;
    const otherSuperAdmins = users.filter(
      (u) => u.role === "super_admin" && u.is_active !== false && u.id !== id,
    ).length;
    if (
      existing.role === "super_admin" &&
      existing.is_active !== false &&
      (data.is_active === false ||
        (data.role !== undefined && data.role !== "super_admin")) &&
      otherSuperAdmins === 0
    ) {
      throw new Error("Keep at least one active super administrator");
    }
    const nextEmail = (data.email ?? existing.email).trim().toLowerCase();
    const nextRole = (data.role ?? existing.role) as UserRole;
    const nextActive = data.is_active ?? existing.is_active ?? true;

    await syncAccount("staff", id, {
      email: nextEmail,
      roles: [nextRole],
      active: nextActive,
    });
    if (data.password) {
      await setAccountPassword("staff", id, { password: data.password });
    }
    await updateAdminUserFieldsApi(id, {
      fullName: data.full_name ?? existing.full_name,
      email: nextEmail,
      role: nextRole,
      managerId: data.manager_id ?? existing.manager_id ?? null,
      isActive: nextActive,
      discountLimitPercent:
        data.discount_limit_percent ?? existing.discount_limit_percent ?? null,
      commissionRatePercent:
        data.commission_rate_percent ?? existing.commission_rate_percent ?? null,
      signatureUrl: data.signature_url ?? existing.signature_url ?? null,
    }).catch(() => null);

    return getUserById(id);
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
    const users = await listMergedUsers().catch(() => []);
    const existing = users.find((u) => u.id === id) ?? (await getUserById(id));
    const otherSuperAdmins = users.filter(
      (u) => u.role === "super_admin" && u.is_active !== false && u.id !== id,
    ).length;
    if (
      existing &&
      existing.role === "super_admin" &&
      existing.is_active !== false &&
      otherSuperAdmins === 0
    ) {
      throw new Error("Keep at least one active super administrator");
    }
    if (existing) {
      await syncAccount("staff", id, {
        email: existing.email,
        roles: [existing.role],
        active: false,
      });
      await updateAdminUserFieldsApi(id, { isActive: false }).catch(() => null);
    }
    return true;
  } catch (e) {
    console.error(`Error deleting user ${id}:`, e);
    throw e;
  }
}

export async function getUserByEmail(email: string): Promise<Profile | null> {
  try {
    const target = email.trim().toLowerCase();
    const users = await listMergedUsers();
    return users.find((u) => u.email.trim().toLowerCase() === target) ?? null;
  } catch (e) {
    console.error(`Error fetching user by email ${email}:`, e);
    return null;
  }
}

export async function verifyUserCredentials(
  email: string,
  plainTextPassword: string,
): Promise<Profile | null> {
  throw new Error("verifyUserCredentials is handled by identity.signIn");
}

export async function updateUserLastLogin(id: string): Promise<void> {
}

async function validateManager(managerId: string, userId?: string) {
}

export async function setUserDiscountLimit(
  userId: string,
  limit: number | null,
): Promise<{ discount_limit_percent: number | null; [key: string]: any }> {
  const { setUserDiscountLimitApi } = await import("../api/identity");
  return setUserDiscountLimitApi(userId, limit);
}

export interface UserListFilters {
  q?: string;
  role?: string;
  departmentId?: string;
  status?: string;
  page?: number;
}

export async function getUsersPage(filters: UserListFilters) {
  let list = await listMergedUsers();
  if (filters.q) {
    const q = filters.q.toLowerCase();
    list = list.filter(
      (u) =>
        (u.full_name || "").toLowerCase().includes(q) ||
        (u.email || "").toLowerCase().includes(q),
    );
  }
  if (filters.role && filters.role !== "all") {
    list = list.filter((u) => u.role === filters.role);
  }
  if (filters.departmentId && filters.departmentId !== "all") {
    list = list.filter((u) => u.department_id === filters.departmentId);
  }
  if (filters.status && filters.status !== "all") {
    list = list.filter((u) =>
      filters.status === "active"
        ? u.is_active && !u.suspended_at && !u.archived_at
        : !u.is_active || !!u.suspended_at || !!u.archived_at,
    );
  }
  const pageSize = 50;
  const page = Math.max(1, filters.page || 1);
  const items = list.slice((page - 1) * pageSize, page * pageSize);
  return {
    items,
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

export type StaffRoleSummary = DynamicStaffRole;

export async function getStaffRoles(): Promise<StaffRoleSummary[]> {
  try {
    const res = await getDynamicStaffRoles();
    if (res && Array.isArray(res.items) && res.items.length > 0) {
      return res.items;
    }
  } catch (e) {
    console.error("Failed to fetch dynamic staff roles:", e);
  }
  return [];
}
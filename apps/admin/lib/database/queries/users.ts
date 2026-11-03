import { isValidEmail } from "../constants/validation";
import { normalizeContactInput } from "./contact-validation";
import { serverMessages } from "@platform/locales";
import { phoneSearchVariants } from "../constants/phone";
import { db } from "../db";
import { Profile, UserRole } from "../types";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { withAccountSync, setStaffPassword } from "../services/identity-sync";

export const PASSWORD_HASH_ROUNDS = 10;

function mapUser(u: any): Profile {
  return {
    id: u.id,
    full_name: u.fullName,
    email: u.email,
    role: u.role as UserRole,
    avatar_url: u.avatarUrl || undefined,
    signature_url: u.signatureUrl || undefined,
    discount_limit_percent:
      u.discountLimitPercent == null ? null : Number(u.discountLimitPercent),
    commission_rate_percent:
      u.commissionRatePercent == null ? null : Number(u.commissionRatePercent),
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
    suspended_at: u.suspendedAt?.toISOString(),
    archived_at: u.archivedAt?.toISOString(),
    last_login_at: u.lastLoginAt ? u.lastLoginAt.toISOString() : undefined,
    permissions: u.permissions || undefined,
    created_at: u.createdAt.toISOString(),
    updated_at: u.updatedAt.toISOString(),
  };
}

export async function getAllUsers(): Promise<Profile[]> {
  try {
    const users = await db.user.findMany({
      include: {
        manager: { select: { fullName: true } },
        employee: { select: { id: true, status: true } },
        departmentRecord: { select: { nameEn: true, nameAr: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return users.map(mapUser);
  } catch (e) {
    console.error("Error fetching users from DB:", e);
    throw e;
  }
}

export async function getUserById(id: string): Promise<Profile | null> {
  try {
    const user = await db.user.findUnique({
      where: { id },
      include: {
        manager: { select: { fullName: true } },
        employee: { select: { id: true, status: true } },
        departmentRecord: { select: { nameEn: true, nameAr: true } },
      },
    });
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
  return withAccountSync(db, async () => {
    data = await normalizeContactInput(data);
    if (!isValidEmail(data.email))
      throw new Error(serverMessages.invalidUserEmail);
    if (data.manager_id) await validateManager(data.manager_id);
    const passwordHash = await bcrypt.hash(data.password, PASSWORD_HASH_ROUNDS);
    const id = randomUUID();
    const email = data.email.trim().toLowerCase();
    await setStaffPassword(id, data.password, { email, role: data.role });
    const created = await db.user.create({
      data: {
        id,
        fullName: data.full_name,
        email,
        passwordHash,
        role: data.role,
        phone: data.phone || null,
        department: data.department || null,
        departmentId: data.department_id || null,
        signatureUrl: data.signature_url || null,
        managerId: data.manager_id || null,
        isActive: true,
      },
      include: {
        manager: { select: { fullName: true } },
      },
    });
    return mapUser(created);
  });
}

export async function updateUser(
  id: string,
  data: Partial<Profile> & { password?: string },
): Promise<Profile | null> {
  try {
    data = await normalizeContactInput(data);
    if (data.manager_id) await validateManager(data.manager_id, id);
    const existing = await db.user.findUniqueOrThrow({
      where: { id },
      select: { role: true, isActive: true },
    });
    if (
      existing.role === "super_admin" &&
      existing.isActive &&
      (data.is_active === false ||
        (data.role !== undefined && data.role !== "super_admin")) &&
      !(await db.user.count({
        where: { role: "super_admin", isActive: true, id: { not: id } },
      }))
    )
      throw new Error(serverMessages.keepAtLeastOneActiveSuperAdministrator);
    const updateData: any = {};
    if (data.full_name !== undefined) updateData.fullName = data.full_name;
    if (
      data.email !== undefined &&
      !isValidEmail(data.email)
    )
      throw new Error(serverMessages.invalidUserEmail);
    if (data.email !== undefined)
      updateData.email = data.email.trim().toLowerCase();
    if (data.role !== undefined) updateData.role = data.role;
    if (data.avatar_url !== undefined) updateData.avatarUrl = data.avatar_url;
    if (data.signature_url !== undefined)
      updateData.signatureUrl = data.signature_url;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.department !== undefined) updateData.department = data.department;
    if (data.department_id !== undefined)
      updateData.departmentId = data.department_id || null;
    if (data.manager_id !== undefined)
      updateData.managerId = data.manager_id || null;
    if (data.is_active !== undefined) updateData.isActive = data.is_active;
    if (data.permissions !== undefined)
      updateData.permissions = data.permissions;
    if (data.password) {
      updateData.passwordHash = await bcrypt.hash(
        data.password,
        PASSWORD_HASH_ROUNDS,
      );
    }

    if (data.password) await setStaffPassword(id, data.password);
    const updated = await db.user.update({
      where: { id },
      data: updateData,
      include: {
        manager: { select: { fullName: true } },
        employee: { select: { id: true, status: true } },
        departmentRecord: { select: { nameEn: true, nameAr: true } },
      },
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
    const existing = await db.user.findUniqueOrThrow({
      where: { id },
      select: { role: true, isActive: true },
    });
    if (
      existing.role === "super_admin" &&
      existing.isActive &&
      !(await db.user.count({
        where: { role: "super_admin", isActive: true, id: { not: id } },
      }))
    )
      throw new Error(serverMessages.keepAtLeastOneActiveSuperAdministrator);
    await db.user.delete({ where: { id } });
    return true;
  } catch (e) {
    console.error(`Error deleting user ${id}:`, e);
    throw e;
  }
}

export async function getUserByEmail(email: string): Promise<Profile | null> {
  try {
    const user = await db.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
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
  try {
    const user = await db.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    if (!user || !user.isActive) {
      return null;
    }

    const matches = await bcrypt.compare(plainTextPassword, user.passwordHash);
    if (!matches) {
      return null;
    }

    // Rehash legacy hashes created with a different cost so every login pays the same bcrypt price.
    const needsRehash =
      bcrypt.getRounds(user.passwordHash) !== PASSWORD_HASH_ROUNDS;
    await db.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        ...(needsRehash
          ? {
              passwordHash: await bcrypt.hash(
                plainTextPassword,
                PASSWORD_HASH_ROUNDS,
              ),
            }
          : {}),
      },
    });

    return mapUser(user);
  } catch (e) {
    console.error(`Error verifying credentials for ${email}:`, e);
    return null;
  }
}

export async function updateUserLastLogin(id: string): Promise<void> {
  try {
    await db.user.update({
      where: { id },
      data: { lastLoginAt: new Date() },
    });
  } catch (e) {
    console.error(`Error updating last login for user ${id}:`, e);
  }
}

async function validateManager(managerId: string, userId?: string) {
  if (
    managerId === userId ||
    !(await db.user.findFirst({
      where: { id: managerId, isActive: true },
      select: { id: true },
    }))
  )
    throw new Error(serverMessages.invalidManager);
  if (userId) {
    const cycle = await db.$queryRaw<
      Array<{ id: string }>
    >`WITH RECURSIVE chain AS (SELECT id,"managerId" FROM "User" WHERE id=${managerId} UNION SELECT u.id,u."managerId" FROM "User" u JOIN chain c ON u.id=c."managerId") SELECT id FROM chain WHERE id=${userId}`;
    if (cycle.length)
      throw new Error(serverMessages.managerAssignmentWouldCreateACycle);
  }
}

/** Sets how much discount (% of subtotal) a user may give without approval; null falls back to the company default. */
export async function setUserDiscountLimit(
  userId: string,
  limit: number | null,
) {
  if (limit !== null && !(Number.isFinite(limit) && limit >= 0 && limit <= 100))
    throw new Error(serverMessages.theDiscountLimitMustBeBetween0);
  const updated = await db.user.update({
    where: { id: userId },
    data: {
      discountLimitPercent:
        limit === null ? null : Math.round(limit * 100) / 100,
    },
    select: { id: true, discountLimitPercent: true },
  });
  return {
    id: updated.id,
    discount_limit_percent:
      updated.discountLimitPercent == null
        ? null
        : Number(updated.discountLimitPercent),
  };
}

export interface UserListFilters {
  q?: string;
  role?: string;
  departmentId?: string;
  /** "active" (default), "suspended", "archived", "inactive" or "all". */
  status?: string;
  page?: number;
}

const USER_STATUSES = [
  "active",
  "suspended",
  "archived",
  "inactive",
  "all",
] as const;

/** One page (50) of staff accounts, searched and filtered on the server, for lists of any size. */
export async function getUsersPage(filters: UserListFilters) {
  const q = (filters.q ?? "").trim().slice(0, 120);
  const status = (USER_STATUSES as readonly string[]).includes(
    filters.status ?? "",
  )
    ? filters.status!
    : "all";
  const where: Record<string, unknown> = {
    ...(filters.role && filters.role !== "all" ? { role: filters.role } : {}),
    ...(filters.departmentId === "none"
      ? { departmentId: null }
      : filters.departmentId && filters.departmentId !== "all"
        ? { departmentId: filters.departmentId }
        : {}),
    ...(status === "active"
      ? { isActive: true, suspendedAt: null, archivedAt: null }
      : {}),
    ...(status === "suspended"
      ? { suspendedAt: { not: null }, archivedAt: null }
      : {}),
    ...(status === "archived" ? { archivedAt: { not: null } } : {}),
    ...(status === "inactive"
      ? { isActive: false, suspendedAt: null, archivedAt: null }
      : {}),
    ...(q
      ? {
          OR: [
            { fullName: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            ...phoneSearchVariants(q).map((v) => ({ phone: { contains: v } })),
            {
              employee: {
                OR: [
                  { firstNameAr: { contains: q } },
                  { lastNameAr: { contains: q } },
                  { employeeNumber: { contains: q, mode: "insensitive" } },
                ],
              },
            },
          ],
        }
      : {}),
  };
  const total = await db.user.count({ where });
  const pageSize = 50;
  const page = Math.min(
    Math.max(1, filters.page || 1),
    Math.max(1, Math.ceil(total / pageSize)),
  );
  const rows = await db.user.findMany({
    where,
    include: {
      manager: { select: { fullName: true } },
      employee: { select: { id: true, status: true } },
      departmentRecord: { select: { nameEn: true, nameAr: true } },
    },
    orderBy: [{ fullName: "asc" }, { id: "asc" }],
    skip: (page - 1) * pageSize,
    take: pageSize,
  });
  return {
    items: rows.map(mapUser),
    total,
    page,
    pageSize,
    filters: {
      q,
      role: filters.role || "all",
      departmentId: filters.departmentId || "all",
      status,
    },
  };
}

import { db } from "../db";
import { Profile, UserRole } from "../types";
import bcrypt from "bcryptjs";

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
    manager_id: u.managerId || undefined,
    manager_name: u.manager?.fullName || undefined,
    is_active: u.isActive,
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
      },
      orderBy: { createdAt: "desc" },
    });
    return users.map(mapUser);
  } catch (e) {
    console.error("Error fetching users from DB:", e);
    return [];
  }
}

export async function getUserById(id: string): Promise<Profile | null> {
  try {
    const user = await db.user.findUnique({
      where: { id },
      include: {
        manager: { select: { fullName: true } },
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
  role: UserRole;
  phone?: string;
  department?: string;
  signature_url?: string;
  manager_id?: string;
}): Promise<Profile> {
  const passwordHash = await bcrypt.hash(data.password, 10);
  const created = await db.user.create({
    data: {
      fullName: data.full_name,
      email: data.email,
      passwordHash,
      role: data.role,
      phone: data.phone || null,
      department: data.department || null,
      signatureUrl: data.signature_url || null,
      managerId: data.manager_id || null,
      isActive: true,
    },
    include: {
      manager: { select: { fullName: true } },
    },
  });
  return mapUser(created);
}

export async function updateUser(
  id: string,
  data: Partial<Profile> & { password?: string },
): Promise<Profile | null> {
  try {
    const updateData: any = {};
    if (data.full_name !== undefined) updateData.fullName = data.full_name;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.role !== undefined) updateData.role = data.role;
    if (data.avatar_url !== undefined) updateData.avatarUrl = data.avatar_url;
    if (data.signature_url !== undefined) updateData.signatureUrl = data.signature_url;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.department !== undefined) updateData.department = data.department;
    if (data.manager_id !== undefined) updateData.managerId = data.manager_id || null;
    if (data.is_active !== undefined) updateData.isActive = data.is_active;
    if (data.permissions !== undefined)
      updateData.permissions = data.permissions;
    if (data.password) {
      updateData.passwordHash = await bcrypt.hash(data.password, 10);
    }

    const updated = await db.user.update({
      where: { id },
      data: updateData,
      include: {
        manager: { select: { fullName: true } },
      },
    });
    return mapUser(updated);
  } catch (e) {
    console.error(`Error updating user ${id}:`, e);
    return null;
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
    await db.user.delete({ where: { id } });
    return true;
  } catch (e) {
    console.error(`Error deleting user ${id}:`, e);
    return false;
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

    await db.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
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

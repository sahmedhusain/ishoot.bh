'use server';

import {
  createUser,
  updateUserRole,
  updateUser,
  deleteUser,
  UserRole,
} from '@ishoot/database';
import { revalidatePath } from 'next/cache';

export async function createUserAction(data: {
  email: string;
  password?: string;
  full_name: string;
  role: UserRole;
  phone?: string;
  department?: string;
}) {
  const user = await createUser({
    ...data,
    password: data.password || 'ishoot2026!',
  });
  revalidatePath('/dashboard/users');
  return { success: true, user };
}

export async function updateUserRoleAction(id: string, role: UserRole) {
  const user = await updateUserRole(id, role);
  revalidatePath('/dashboard/users');
  return { success: true, user };
}

export async function toggleUserStatusAction(id: string, isActive: boolean) {
  const user = await updateUser(id, { is_active: isActive });
  revalidatePath('/dashboard/users');
  return { success: true, user };
}

export async function deleteUserAction(id: string) {
  await deleteUser(id);
  revalidatePath('/dashboard/users');
  return { success: true };
}

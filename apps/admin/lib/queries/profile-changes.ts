import { isValidEmail } from "../constants/validation";
import { serverMessages } from "@platform/locales";
import {
  createProfileChangeApi,
  getAdminUserApi,
  listAdminProfileChangesApi,
  listAdminUsersApi,
  updateAdminUserFieldsApi,
  updateProfileChangeStatusApi,
} from "../api/identity";
import { ProfileChangeRequest } from "../types";
import { assertActorNotOnLeave } from "./leave";

function mapProfileChange(r: any): ProfileChangeRequest {
  return {
    id: r.id,
    userId: r.user_id ?? r.userId,
    requestedById: r.requested_by_id ?? r.requestedById,
    managerId: r.manager_id ?? r.managerId ?? null,
    status: r.status,
    oldValues: (r.old_values ?? r.oldValues ?? {}) as any,
    newValues: (r.new_values ?? r.newValues ?? {}) as any,
    reviewNotes: r.review_notes ?? r.reviewNotes ?? null,
    reviewedAt: r.reviewed_at ?? r.reviewedAt ?? null,
    createdAt: r.created_at ?? r.createdAt ?? new Date().toISOString(),
    updatedAt: r.updated_at ?? r.updatedAt ?? new Date().toISOString(),
  };
}

export async function requestProfileChange(
  userId: string,
  proposed: { fullName?: string; email?: string },
  requestedById: string,
): Promise<ProfileChangeRequest> {
  await assertActorNotOnLeave(requestedById);
  const user = await getAdminUserApi(userId).catch(() => null);
  if (!user) throw new Error(serverMessages.userNotFound);

  const currentName = user.full_name ?? user.fullName ?? "";
  const currentEmail = user.email ?? "";

  if (
    proposed.fullName !== undefined &&
    (!proposed.fullName.trim() || proposed.fullName.trim().length > 150)
  )
    throw new Error(serverMessages.profileSecurityError7);
  if (
    proposed.email !== undefined &&
    (!isValidEmail(proposed.email.trim()) || proposed.email.trim().length > 254)
  )
    throw new Error(serverMessages.enterAValidEMailAddress);
  if (
    (!proposed.fullName || proposed.fullName.trim() === currentName) &&
    (!proposed.email || proposed.email.trim().toLowerCase() === currentEmail.toLowerCase())
  )
    throw new Error(serverMessages.profileSecurityError8);

  if (
    proposed.email &&
    proposed.email.toLowerCase().trim() !== currentEmail.toLowerCase().trim()
  ) {
    const allUsers = await listAdminUsersApi();
    const existing = allUsers.find(
      (u) => String(u.email ?? "").toLowerCase() === proposed.email!.toLowerCase().trim(),
    );
    if (existing) throw new Error(serverMessages.theProposedEmailIsAlreadyInUse);
  }

  const request = await createProfileChangeApi({
    userId,
    requestedById,
    managerId: user.manager_id ?? user.managerId ?? null,
    oldValues: { fullName: currentName, email: currentEmail },
    newValues: {
      fullName: proposed.fullName?.trim() || currentName,
      email: proposed.email?.toLowerCase().trim() || currentEmail,
    },
  });
  return mapProfileChange(request);
}

export async function approveProfileChange(
  requestId: string,
  deciderId: string,
  notes?: string,
): Promise<{ success: boolean; request: ProfileChangeRequest }> {
  await assertActorNotOnLeave(deciderId);
  const all = await listAdminProfileChangesApi();
  const req = all.find((r) => r.id === requestId);
  if (!req) throw new Error(serverMessages.requestNotFound);
  if (req.status !== "pending") throw new Error("Request already processed");

  const newValues = (req.new_values ?? req.newValues ?? {}) as { fullName?: string; email?: string };
  await updateAdminUserFieldsApi(req.user_id ?? req.userId, {
    fullName: newValues.fullName,
    email: newValues.email,
  });
  const updated = await updateProfileChangeStatusApi(requestId, {
    status: "approved",
    reviewedById: deciderId,
    reviewNotes: notes ?? null,
  });
  return { success: true, request: mapProfileChange(updated) };
}

export async function rejectProfileChange(
  requestId: string,
  deciderId: string,
  notes?: string,
): Promise<{ success: boolean; request: ProfileChangeRequest }> {
  await assertActorNotOnLeave(deciderId);
  const all = await listAdminProfileChangesApi();
  const req = all.find((r) => r.id === requestId);
  if (!req) throw new Error(serverMessages.requestNotFound);
  if (req.status !== "pending") throw new Error("Request already processed");

  const updated = await updateProfileChangeStatusApi(requestId, {
    status: "rejected",
    reviewedById: deciderId,
    reviewNotes: notes ?? null,
  });
  return { success: true, request: mapProfileChange(updated) };
}

export async function getPendingProfileChangesForManager(managerId: string) {
  const [changes, users] = await Promise.all([
    listAdminProfileChangesApi(),
    listAdminUsersApi(),
  ]);
  const userById = new Map(users.map((u) => [u.id, u]));
  return changes
    .filter((r) => (r.manager_id ?? r.managerId) === managerId && r.status === "pending")
    .map((r) => {
      const u = userById.get(r.user_id ?? r.userId);
      const reqBy = userById.get(r.requested_by_id ?? r.requestedById);
      return {
        ...mapProfileChange(r),
        user: u ? { id: u.id, fullName: u.full_name ?? u.fullName, email: u.email, role: u.role } : null,
        requestedBy: reqBy ? { id: reqBy.id, fullName: reqBy.full_name ?? reqBy.fullName } : null,
      };
    });
}

export async function getProfileChangeRequestsForUser(userId: string) {
  const changes = await listAdminProfileChangesApi();
  return changes
    .filter((r) => (r.user_id ?? r.userId) === userId)
    .map(mapProfileChange);
}

import {
  serverTemplates,
  formatMessage,
  serverMessages,
} from "@platform/locales";
import { lookupFile } from "@platform/api-client";
import {
  createSignatureChangeApi,
  getAdminUserApi,
  listAdminSignatureChangesApi,
  listAdminUsersApi,
  updateAdminUserFieldsApi,
  updateSignatureChangeStatusApi,
} from "../api/identity";
import { runAtomicMutation } from "../api/atomic";
import { claimUpload } from "../services/uploads";

export interface SignatureChangeRow {
  id: string;
  signatureUrl: string;
  previousUrl: string | null;
  status: "pending" | "approved" | "rejected" | "cancelled";
  reviewedBy: string | null;
  reviewNotes: string | null;
  decidedAt: string | null;
  createdAt: string;
}

const map = (c: any, usersById?: Map<string, any>): SignatureChangeRow => {
  const reviewerId = c.reviewed_by_id ?? c.reviewedById ?? null;
  const reviewer = reviewerId && usersById ? usersById.get(reviewerId) : null;
  return {
    id: c.id,
    signatureUrl: c.signature_url ?? c.signatureUrl,
    previousUrl: c.previous_url ?? c.previousUrl ?? null,
    status: c.status as SignatureChangeRow["status"],
    reviewedBy: reviewer ? (reviewer.full_name ?? reviewer.fullName ?? null) : null,
    reviewNotes: c.review_notes ?? c.reviewNotes ?? null,
    decidedAt: c.decided_at ?? c.decidedAt ?? null,
    createdAt: c.created_at ?? c.createdAt ?? new Date().toISOString(),
  };
};

export async function requestSignatureChange(userId: string, fileUrl: string) {
  return runAtomicMutation(async () => {
    const upload = await lookupFile(fileUrl);
    if (
      !upload ||
      upload.isPublic ||
      upload.ownerId !== userId ||
      upload.mimeType !== "image/png"
    )
      throw new Error(serverMessages.drawYourSignatureOnThePadAnd);
    const existing = await listAdminSignatureChangesApi();
    if (existing.some((c) => (c.user_id ?? c.userId) === userId && c.status === "pending"))
      throw new Error(serverMessages.youAlreadyHaveASignatureChangeWaiting);
    await claimUpload(fileUrl, userId);
    const user = await getAdminUserApi(userId);
    const change = await createSignatureChangeApi({
      userId,
      signatureUrl: fileUrl,
      previousUrl: user?.signature_url ?? user?.signatureUrl ?? null,
    });
    return map(change);
  });
}

export async function approveSignatureChange(
  id: string,
  deciderId: string,
  notes?: string | null,
) {
  const all = await listAdminSignatureChangesApi();
  const change = all.find((c) => c.id === id);
  if (!change) throw new Error(serverMessages.requestNotFound);
  if (change.status !== "pending")
    throw new Error(
      formatMessage(serverTemplates.signatureChangeIs0, { 0: change.status }),
    );
  await updateAdminUserFieldsApi(change.user_id ?? change.userId, {
    signatureUrl: change.signature_url ?? change.signatureUrl,
  });
  return updateSignatureChangeStatusApi(id, {
    status: "approved",
    reviewedById: deciderId,
    reviewNotes: notes ?? null,
  });
}

export async function rejectSignatureChange(
  id: string,
  deciderId: string,
  notes?: string | null,
) {
  const all = await listAdminSignatureChangesApi();
  const change = all.find((c) => c.id === id);
  if (!change) throw new Error(serverMessages.requestNotFound);
  if (change.status !== "pending")
    throw new Error(
      formatMessage(serverTemplates.signatureChangeIs0, { 0: change.status }),
    );
  return updateSignatureChangeStatusApi(id, {
    status: "rejected",
    reviewedById: deciderId,
    reviewNotes: notes ?? null,
  });
}

export async function cancelSignatureChange(id: string, userId: string) {
  const all = await listAdminSignatureChangesApi();
  const change = all.find((c) => c.id === id && (c.user_id ?? c.userId) === userId);
  if (!change) throw new Error(serverMessages.requestNotFound);
  if (change.status !== "pending")
    throw new Error(
      formatMessage(serverTemplates.signatureChangeIs0, { 0: change.status }),
    );
  return updateSignatureChangeStatusApi(id, { status: "cancelled" });
}

export async function listSignatureChanges(userId: string): Promise<SignatureChangeRow[]> {
  const [all, users] = await Promise.all([
    listAdminSignatureChangesApi(),
    listAdminUsersApi(),
  ]);
  const usersById = new Map(users.map((u) => [u.id, u]));
  return all
    .filter((c) => (c.user_id ?? c.userId) === userId)
    .map((c) => map(c, usersById));
}

import { getStorageClient, isSupabaseStorageConfigured, uploadStorageLocation, verifyStoredUpload, writeLocalUpload } from "./storage";
import path from "node:path";
import { existsSync } from "node:fs";

/** The monorepo root, so the admin server, seed and workers agree on one upload folder whatever their cwd. */
function workspaceRoot() {
  let dir = process.cwd();
  for (let i = 0; i < 8; i++) {
    if (existsSync(path.join(dir, "pnpm-workspace.yaml"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return process.cwd();
}
import type { Prisma } from "@prisma/client";
export function uploadRoot() {
  const configured = process.env.UPLOAD_ROOT;
  if (process.env.NODE_ENV === "production" && (!configured || !path.isAbsolute(configured)))
    throw new Error("Configure an absolute UPLOAD_ROOT on durable shared storage");
  return configured ? path.resolve(configured) : path.join(workspaceRoot(), "apps", "admin", "private", "uploads");
}
export async function claimUpload(tx: Prisma.TransactionClient, fileUrl: string, ownerId?: string) {
  if (!ownerId || typeof fileUrl !== "string" || !/^\/api\/files\/[a-z]+\/[a-zA-Z0-9_-]+\.(pdf|png|jpg|jpeg|webp)$/.test(fileUrl))
    throw new Error("Invalid uploaded file");
  const upload = await tx.uploadObject.findUnique({ where: { fileUrl } });
  if (!upload || upload.ownerId !== ownerId || upload.claimedAt || upload.expiresAt <= new Date()) throw new Error("Upload is expired, already claimed, or belongs to another user");
  // Both storage modes check the stored bytes match what was registered.
  await verifyStoredUpload(upload, isSupabaseStorageConfigured() ? undefined : uploadRoot());
  const claimed = await tx.uploadObject.updateMany({ where: { fileUrl, ownerId, claimedAt: null, expiresAt: { gt: new Date() }, isPublic: false }, data: { claimedAt: new Date() } });
  if (claimed.count !== 1) throw new Error("Upload is expired, already claimed, or belongs to another user");
  return tx.uploadObject.findUniqueOrThrow({ where: { fileUrl } });
}

/** Stores bytes for an /api/files URL in whichever storage is active (used by seeds and repairs, not user uploads). */
export async function storeFileBytes(fileUrl: string, bytes: Uint8Array, contentType: string, isPublic = false) {
  if (isSupabaseStorageConfigured()) {
    const location = uploadStorageLocation(fileUrl, isPublic);
    const { error } = await getStorageClient().storage.from(location.bucket).upload(location.path, bytes, { contentType, upsert: false });
    if (error && !/exists/i.test(error.message)) throw new Error(`Storage upload failed: ${error.message}`);
    return;
  }
  try {
    await writeLocalUpload(fileUrl, uploadRoot(), bytes);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
  }
}

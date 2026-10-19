import { serverTemplates, formatMessage, serverMessages } from "@platform/locales";

import {
  getStorageClient,
  isSupabaseStorageConfigured,
  uploadStorageLocation,
  verifyStoredUpload,
  writeLocalUpload,
} from "./storage";
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
  if (
    process.env.NODE_ENV === "production" &&
    (!configured || !path.isAbsolute(configured))
  )
    throw new Error(
      serverMessages.configureAnAbsoluteUploadRootOnDurable,
    );
  return configured
    ? path.resolve(configured)
    : path.join(workspaceRoot(), "apps", "admin", "private", "uploads");
}
export async function claimUpload(
  tx: Prisma.TransactionClient,
  fileUrl: string,
  ownerId?: string,
) {
  if (
    !ownerId ||
    typeof fileUrl !== "string" ||
    !/^\/api\/files\/[a-z]+\/[a-zA-Z0-9_-]+\.(pdf|png|jpg|jpeg|webp)$/.test(
      fileUrl,
    )
  )
    throw new Error(serverMessages.invalidUploadedFile);
  const upload = await tx.uploadObject.findUnique({ where: { fileUrl } });
  if (
    !upload ||
    upload.ownerId !== ownerId ||
    upload.claimedAt ||
    upload.expiresAt <= new Date()
  )
    throw new Error(
      serverMessages.uploadIsExpiredAlreadyClaimedOrBelongs,
    );
  // Both storage modes check the stored bytes match what was registered.
  await verifyStoredUpload(
    upload,
    isSupabaseStorageConfigured() ? undefined : uploadRoot(),
  );
  const claimed = await tx.uploadObject.updateMany({
    where: {
      fileUrl,
      ownerId,
      claimedAt: null,
      expiresAt: { gt: new Date() },
      isPublic: false,
    },
    data: { claimedAt: new Date() },
  });
  if (claimed.count !== 1)
    throw new Error(
      serverMessages.uploadIsExpiredAlreadyClaimedOrBelongs,
    );
  return tx.uploadObject.findUniqueOrThrow({ where: { fileUrl } });
}

/**
 * A document kept elsewhere and referenced by its address (e.g. a VAT certificate on the NBR portal, a shared
 * drive file). Only plain https links are accepted, never credentials in the URL.
 */
export function isDocumentLink(value: unknown): boolean {
  if (typeof value !== "string" || value.length > 1000 || /\s/.test(value))
    return false;
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !!url.hostname.includes(".")
    );
  } catch {
    return false;
  }
}

/** The file a document points at: a claimed upload, or an external https link recorded as it is. */
export async function claimUploadOrLink(
  tx: Prisma.TransactionClient,
  fileUrl: string,
  ownerId?: string,
) {
  if (isDocumentLink(fileUrl)) {
    if (!ownerId) throw new Error(serverMessages.invalidUploadedFile);
    const url = new URL(fileUrl);
    const name =
      decodeURIComponent(url.pathname.split("/").filter(Boolean).pop() ?? "") ||
      url.hostname;
    return {
      fileUrl,
      fileName: name.slice(0, 200),
      fileSize: null,
      mimeType: null,
      isLink: true as const,
    };
  }
  const upload = await claimUpload(tx, fileUrl, ownerId);
  return { ...upload, isLink: false as const };
}

/** Stores bytes for an /api/files URL in whichever storage is active (used by seeds and repairs, not user uploads). */
export async function storeFileBytes(
  fileUrl: string,
  bytes: Uint8Array,
  contentType: string,
  isPublic = false,
) {
  if (isSupabaseStorageConfigured()) {
    const location = uploadStorageLocation(fileUrl, isPublic);
    const { error } = await getStorageClient()
      .storage.from(location.bucket)
      .upload(location.path, bytes, { contentType, upsert: false });
    if (error && !/exists/i.test(error.message))
      throw new Error(formatMessage(serverTemplates.storageUploadFailed0, { 0: error.message }));
    return;
  }
  try {
    await writeLocalUpload(fileUrl, uploadRoot(), bytes);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
  }
}

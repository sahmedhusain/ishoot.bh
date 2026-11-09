import { serverMessages } from "@platform/locales";
import {
  claimUpload as claimFileUpload,
  isApiError,
  readFile,
  storeFile,
  type FileRecord,
} from "@platform/api-client";

export type StoredUpload = {
  id: string;
  fileUrl: string;
  ownerId: string | null;
  fileName: string;
  fileSize: number;
  mimeType: string;
  isPublic: boolean;
  claimedAt: Date | null;
  createdAt: Date;
};

export const toStoredUpload = (record: FileRecord): StoredUpload => ({
  id: record.id,
  fileUrl: record.fileUrl,
  ownerId: record.ownerId ?? null,
  fileName: record.fileName,
  fileSize: record.fileSize,
  mimeType: record.mimeType,
  isPublic: record.isPublic,
  claimedAt: record.claimedAt ? new Date(record.claimedAt) : null,
  createdAt: new Date(record.createdAt),
});

export function uploadError(error: unknown): unknown {
  if (isApiError(error, "file_content_mismatch"))
    return new Error(serverMessages.uploadedObjectDoesNotMatchTheRegistered);
  if (
    isApiError(
      error,
      "invalid_file_url",
      "unsupported_file_type",
      "validation_failed",
    )
  )
    return new Error(serverMessages.invalidUploadedFile);
  if (
    isApiError(
      error,
      "file_not_found",
      "upload_not_owned",
      "upload_unavailable",
      "file_not_private",
    )
  )
    return new Error(serverMessages.uploadIsExpiredAlreadyClaimedOrBelongs);
  return error;
}

export async function claimUpload(fileUrl: string, ownerId?: string) {
  if (!ownerId || typeof fileUrl !== "string")
    throw new Error(serverMessages.invalidUploadedFile);
  try {
    return toStoredUpload(
      await claimFileUpload(fileUrl, ownerId, { requirePrivate: true }),
    );
  } catch (error) {
    throw uploadError(error);
  }
}

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

export async function claimUploadOrLink(fileUrl: string, ownerId?: string) {
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
  const upload = await claimUpload(fileUrl, ownerId);
  return { ...upload, isLink: false as const };
}

export async function storeFileBytes(
  fileUrl: string,
  bytes: Uint8Array,
  options: { ownerId?: string; fileName?: string } = {},
) {
  try {
    await storeFile({ fileUrl }, bytes, { ...options, ifExists: "keep" });
  } catch (error) {
    throw uploadError(error);
  }
}

export async function fileResponse(
  record: Pick<FileRecord, "fileUrl" | "mimeType" | "fileSize" | "isPublic">,
  options: {
    download?: boolean;
    fileName?: string;
    cacheControl?: string;
  } = {},
): Promise<Response | null> {
  const file = await readFile(record.fileUrl);
  if (!file?.body) return null;
  const disposition = options.download ? "attachment" : "inline";
  return new Response(file.body, {
    headers: {
      "Content-Type": record.mimeType,
      "Content-Length": String(record.fileSize),
      "Cache-Control":
        options.cacheControl ??
        (record.isPublic
          ? "public, max-age=31536000, immutable"
          : "private, no-store"),
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": options.fileName
        ? `${disposition}; filename*=UTF-8''${encodeURIComponent(options.fileName)}`
        : disposition,
    },
  });
}

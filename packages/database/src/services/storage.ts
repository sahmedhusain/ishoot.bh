import { serverTemplates, formatMessage, serverMessages } from "@platform/locales";

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import path from "node:path";
import fs from "node:fs/promises";

/** Supabase Storage when configured; otherwise files live on local disk under UPLOAD_ROOT (development, single server). */
export function isSupabaseStorageConfigured() {
  return !!(process.env.SUPABASE_URL?.trim() && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
}

/** Reads the real type from the first bytes so a renamed file cannot pass as an image or PDF. */
export function detectFileType(bytes: Uint8Array): string | null {
  const starts = (...sig: number[]) => sig.every((b, i) => bytes[i] === b);
  if (starts(0x25, 0x50, 0x44, 0x46)) return "application/pdf";
  if (starts(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return "image/png";
  if (starts(0xff, 0xd8, 0xff)) return "image/jpeg";
  if (starts(0x52, 0x49, 0x46, 0x46) && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return "image/webp";
  if (starts(0x77, 0x4f, 0x46, 0x32)) return "font/woff2";
  return null;
}

let supabase: SupabaseClient | null = null;

export function getStorageClient() {
  if (supabase) return supabase;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(serverMessages.supabaseStorageIsNotConfiguredMissingSupabase);
  }
  supabase = createClient(url, key, {
    auth: { persistSession: false },
    global: { fetch: (input, init) => fetch(input, {
      ...init,
      signal: init?.signal ? AbortSignal.any([init.signal, AbortSignal.timeout(10000)]) : AbortSignal.timeout(10000),
    }) },
  });
  return supabase;
}

export async function generateUploadUrl(bucket: string, path: string) {
  const client = getStorageClient();
  const { data, error } = await client.storage.from(bucket).createSignedUploadUrl(path);
  if (error) throw new Error(formatMessage(serverTemplates.failedToGenerateUploadUrl0, { 0: error.message }));
  return { signedUrl: data.signedUrl, path: data.path, token: data.token };
}

export async function generateDownloadUrl(bucket: string, path: string, expiresIn: number = 60) {
  const client = getStorageClient();
  const { data, error } = await client.storage.from(bucket).createSignedUrl(path, expiresIn);
  if (error) throw new Error(formatMessage(serverTemplates.failedToGenerateDownloadUrl0, { 0: error.message }));
  return data.signedUrl;
}

// Metadata lookup avoids downloading the complete object into the application heap.
export async function getObjectMetadata(bucket: string, path: string) {
  const { data, error } = await getStorageClient().storage.from(bucket).info(path);
  if (error) throw new Error(formatMessage(serverTemplates.objectMetadataUnavailable0, { 0: error.message }));
  return { size: data.size, type: data.contentType };
}

export function uploadStorageLocation(fileUrl: string, isPublic: boolean) {
  // Brand fonts (woff2) live only in the public brand folder.
  if (!/^\/api\/files\/(payments|invoices|certificates|vault|deals|general|brand)\/[a-zA-Z0-9_-]+\.(pdf|png|jpg|jpeg|webp)$/.test(fileUrl) && !/^\/api\/files\/brand\/[a-zA-Z0-9_-]+\.woff2$/.test(fileUrl))
    throw new Error(serverMessages.invalidUploadPath);
  return { bucket: isPublic ? "public-assets" : "private-assets", path: fileUrl.slice("/api/files/".length) };
}

/** Absolute path of an upload on local disk, guarded against escaping the upload root. */
export function localUploadPath(fileUrl: string, root: string) {
  const location = uploadStorageLocation(fileUrl, false);
  const target = path.resolve(root, location.path);
  if (!target.startsWith(path.resolve(root) + path.sep)) throw new Error(serverMessages.invalidUploadPath);
  return target;
}

export async function writeLocalUpload(fileUrl: string, root: string, bytes: Uint8Array) {
  const target = localUploadPath(fileUrl, root);
  await fs.mkdir(path.dirname(target), { recursive: true });
  // "wx": never overwrite an existing upload.
  await fs.writeFile(target, bytes, { flag: "wx" });
  return target;
}

export async function verifyStoredUpload(upload: { fileUrl: string; isPublic: boolean; fileSize: number; mimeType: string }, localRoot?: string) {
  if (!isSupabaseStorageConfigured()) {
    if (!localRoot) throw new Error(serverMessages.uploadStorageIsNotConfigured);
    const target = localUploadPath(upload.fileUrl, localRoot);
    const handle = await fs.open(target, "r");
    try {
      const { size } = await handle.stat();
      const head = new Uint8Array(12);
      await handle.read(head, 0, 12, 0);
      if (size !== upload.fileSize || size <= 0 || size > 10 * 1024 * 1024 || detectFileType(head) !== upload.mimeType)
        throw new Error(serverMessages.uploadedObjectDoesNotMatchTheRegistered);
      return { size, type: upload.mimeType };
    } finally {
      await handle.close();
    }
  }
  const location = uploadStorageLocation(upload.fileUrl, upload.isPublic);
  const metadata = await getObjectMetadata(location.bucket, location.path);
  if (!Number.isInteger(metadata.size) || metadata.size !== upload.fileSize || metadata.size! <= 0 || metadata.size! > 10 * 1024 * 1024 || metadata.type !== upload.mimeType)
    throw new Error(serverMessages.uploadedObjectDoesNotMatchTheRegistered);
  return metadata;
}

import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabase: SupabaseClient | null = null;

export function getStorageClient() {
  if (supabase) return supabase;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Supabase Storage is not configured. Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
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
  if (error) throw new Error(`Failed to generate upload URL: ${error.message}`);
  return { signedUrl: data.signedUrl, path: data.path, token: data.token };
}

export async function generateDownloadUrl(bucket: string, path: string, expiresIn: number = 60) {
  const client = getStorageClient();
  const { data, error } = await client.storage.from(bucket).createSignedUrl(path, expiresIn);
  if (error) throw new Error(`Failed to generate download URL: ${error.message}`);
  return data.signedUrl;
}

// Metadata lookup avoids downloading the complete object into the application heap.
export async function getObjectMetadata(bucket: string, path: string) {
  const { data, error } = await getStorageClient().storage.from(bucket).info(path);
  if (error) throw new Error(`Object metadata unavailable: ${error.message}`);
  return { size: data.size, type: data.contentType };
}

export function uploadStorageLocation(fileUrl: string, isPublic: boolean) {
  if (!/^\/api\/files\/(payments|invoices|certificates|vault|deals|general|brand)\/[a-zA-Z0-9_-]+\.(pdf|png|jpg|jpeg|webp)$/.test(fileUrl))
    throw new Error("Invalid upload path");
  return { bucket: isPublic ? "public-assets" : "private-assets", path: fileUrl.slice("/api/files/".length) };
}

export async function verifyStoredUpload(upload: { fileUrl: string; isPublic: boolean; fileSize: number; mimeType: string }) {
  const location = uploadStorageLocation(upload.fileUrl, upload.isPublic);
  const metadata = await getObjectMetadata(location.bucket, location.path);
  if (!Number.isInteger(metadata.size) || metadata.size !== upload.fileSize || metadata.size! <= 0 || metadata.size! > 10 * 1024 * 1024 || metadata.type !== upload.mimeType)
    throw new Error("Uploaded object does not match the registered size and type");
  return metadata;
}

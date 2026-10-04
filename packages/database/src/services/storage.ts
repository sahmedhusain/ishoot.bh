import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabase: SupabaseClient | null = null;

export function getStorageClient() {
  if (supabase) return supabase;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Supabase Storage is not configured. Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  }
  supabase = createClient(url, key, { auth: { persistSession: false } });
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

export async function getObjectMetadata(bucket: string, path: string) {
  const client = getStorageClient();
  // Supabase storage metadata can be retrieved or we can just download the file to verify size/content
  const { data, error } = await client.storage.from(bucket).download(path);
  if (error) throw new Error(`Object not found or download failed: ${error.message}`);
  const buffer = await data.arrayBuffer();
  return {
    size: buffer.byteLength,
    type: data.type,
    buffer: Buffer.from(buffer)
  };
}

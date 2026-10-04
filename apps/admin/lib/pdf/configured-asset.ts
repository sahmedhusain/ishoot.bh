import fs from "fs/promises";
import { uploadRoot } from "@ishoot/database";
import path from "path";
import { getStorageClient } from "@ishoot/database";

export async function resolveConfiguredPdfAsset(
  url?: string | null,
): Promise<Buffer | string | undefined> {
  if (!url || !/^\/(brand\/|uploads\/brand\/|api\/files\/)/.test(url)) return;
  if (/[?#\\\u0000]/.test(url)) return;
  
  const privateFile = url.startsWith("/api/files/");
  
  // Storage fallback for cloud environments
  if (privateFile && process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const relative = url.slice("/api/files/".length);
    const bucketAndPath = relative.split("/");
    const bucket = bucketAndPath[0];
    const filePath = bucketAndPath.slice(1).join("/");
    
    try {
      const client = getStorageClient();
      const { data, error } = await client.storage.from(bucket).download(filePath);
      if (!error && data) {
         return Buffer.from(await data.arrayBuffer());
      }
    } catch(e) {
      console.warn("Storage fetch failed", e);
    }
    return undefined;
  }
  
  // Local disk fallback for local development or public files
  const root = privateFile ? uploadRoot() : path.resolve(process.cwd(), "public");
  const relative = privateFile ? url.slice("/api/files/".length) : url.slice(1);
  let target = path.resolve(root, relative);
  if (url.startsWith("/brand/") && target.endsWith(".svg"))
    target = target.slice(0, -4) + ".png";
  if (!/\.(png|jpe?g)$/i.test(target)) return;
  try {
    const resolvedRoot = await fs.realpath(root);
    target = await fs.realpath(target);
    if (!target.startsWith(resolvedRoot + path.sep) || !(await fs.stat(target)).isFile())
      return;
    const buf = await fs.readFile(target);
    return buf;
  } catch {
    return;
  }
}

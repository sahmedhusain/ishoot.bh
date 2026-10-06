import sharp from "sharp";
import fs from "fs/promises";
import { uploadRoot } from "@ishoot/database";
import path from "path";
import { db,getStorageClient,uploadStorageLocation,isSupabaseStorageConfigured } from "@ishoot/database";

export async function resolveConfiguredPdfAsset(
  url?: string | null,
): Promise<Buffer | string | undefined> {
  if (!url || !/^\/(brand\/|uploads\/brand\/|api\/files\/)/.test(url)) return;
  if (/[?#\\\u0000]/.test(url)) return;

  const privateFile = url.startsWith("/api/files/");

  // Storage fallback for cloud environments
  if (privateFile && isSupabaseStorageConfigured()) {
    try {
      const upload = await db.uploadObject.findUnique({ where: { fileUrl: url } });
      if (!upload) return undefined;
      const location = uploadStorageLocation(url, upload.isPublic);
      const client = getStorageClient();
      const { data, error } = await client.storage.from(location.bucket).download(location.path);
      if (!error && data) {
        const buffer = Buffer.from(await data.arrayBuffer());
        return /\.webp$/i.test(url) ? sharp(buffer, { limitInputPixels: 16000000 }).png().toBuffer() : buffer;
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
  if (url.startsWith("/brand/") && target.endsWith(".svg")) {
    const png = target.slice(0, -4) + ".png";
    try { if ((await fs.stat(png)).isFile()) target = png; } catch { /* Convert the original trusted SVG below. */ }
  }
  if (!/\.(png|jpe?g|svg|webp)$/i.test(target)) return;
  try {
    const resolvedRoot = await fs.realpath(root);
    target = await fs.realpath(target);
    if (!target.startsWith(resolvedRoot + path.sep) || !(await fs.stat(target)).isFile())
      return;
    const buf = await fs.readFile(target);
    return /\.(svg|webp)$/i.test(target) ? sharp(buf, { limitInputPixels: 16000000 }).png().toBuffer() : buf;
  } catch {
    return;
  }
}

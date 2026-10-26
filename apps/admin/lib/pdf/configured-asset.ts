import sharp from "sharp";
import fs from "fs/promises";
import { uploadRoot } from "@platform/database";
import path from "path";
import {
  db,
  getStorageClient,
  uploadStorageLocation,
  isSupabaseStorageConfigured,
} from "@platform/database";

/** PDF images: empty margins are trimmed so a signature or stamp fills the box it is placed in. */
async function printReady(buffer: Buffer): Promise<Buffer> {
  try {
    // Sharp at the printed size (a stamp or logo is under 3 cm) while keeping multi-page PDFs small.
    return await sharp(buffer, { limitInputPixels: 16000000 })
      .trim()
      .resize({
        width: 520,
        height: 520,
        fit: "inside",
        withoutEnlargement: true,
      })
      .png({ compressionLevel: 9, palette: true })
      .toBuffer();
  } catch {
    return buffer;
  }
}

export async function resolveConfiguredPdfAsset(
  url?: string | null,
): Promise<Buffer | string | undefined> {
  // A signature drawn at the moment of signing is kept as a PNG data URL on the record.
  const drawn = url?.match(/^data:image\/png;base64,([A-Za-z0-9+/=]+)$/)?.[1];
  if (drawn) {
    const bytes = Buffer.from(drawn, "base64");
    return sharp(bytes, { limitInputPixels: 16000000 })
      .trim()
      .png()
      .toBuffer()
      .catch(() => bytes);
  }
  // Company files (logos, stamp, signatures) are uploads; the apps ship none of their own.
  if (!url || !url.startsWith("/api/files/")) return;
  if (/[?#\\\u0000]/.test(url)) return;

  if (isSupabaseStorageConfigured()) {
    try {
      const upload = await db.uploadObject.findUnique({
        where: { fileUrl: url },
      });
      if (!upload) return undefined;
      const location = uploadStorageLocation(url, upload.isPublic);
      const client = getStorageClient();
      const { data, error } = await client.storage
        .from(location.bucket)
        .download(location.path);
      if (!error && data) {
        const buffer = Buffer.from(await data.arrayBuffer());
        return printReady(buffer);
      }
    } catch (e) {
      console.warn("Storage fetch failed", e);
    }
    return undefined;
  }

  // Local disk storage (development, single server)
  const root = uploadRoot();
  let target = path.resolve(root, url.slice("/api/files/".length));
  if (!/\.(png|jpe?g|webp)$/i.test(target)) return;
  try {
    const resolvedRoot = await fs.realpath(root);
    target = await fs.realpath(target);
    if (
      !target.startsWith(resolvedRoot + path.sep) ||
      !(await fs.stat(target)).isFile()
    )
      return;
    return printReady(await fs.readFile(target));
  } catch {
    return;
  }
}

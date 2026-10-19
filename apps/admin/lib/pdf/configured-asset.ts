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

/**
 * PDF images: vector art is rasterized at print resolution and empty margins are trimmed so a
 * signature or stamp fills the box it is placed in.
 */
async function printReady(buffer: Buffer, vector: boolean): Promise<Buffer> {
  try {
    // Sharp at the printed size (a stamp or logo is under 3 cm) while keeping multi-page PDFs small.
    return await sharp(buffer, {
      limitInputPixels: 16000000,
      ...(vector ? { density: 300 } : {}),
    })
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
    return vector
      ? sharp(buffer, { limitInputPixels: 16000000, density: 300 })
          .png()
          .toBuffer()
      : buffer;
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
  if (!url || !/^\/(brand\/|uploads\/brand\/|api\/files\/)/.test(url)) return;
  if (/[?#\\\u0000]/.test(url)) return;

  const privateFile = url.startsWith("/api/files/");

  // Storage fallback for cloud environments
  if (privateFile && isSupabaseStorageConfigured()) {
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
        return printReady(buffer, /\.svg$/i.test(url));
      }
    } catch (e) {
      console.warn("Storage fetch failed", e);
    }
    return undefined;
  }

  // Local disk fallback for local development or public files
  const root = privateFile
    ? uploadRoot()
    : path.resolve(process.cwd(), "public");
  const relative = privateFile ? url.slice("/api/files/".length) : url.slice(1);
  let target = path.resolve(root, relative);
  if (url.startsWith("/brand/") && target.endsWith(".svg")) {
    const png = target.slice(0, -4) + ".png";
    try {
      if ((await fs.stat(png)).isFile()) target = png;
    } catch {
      /* Convert the original trusted SVG below. */
    }
  }
  if (!/\.(png|jpe?g|svg|webp)$/i.test(target)) return;
  try {
    const resolvedRoot = await fs.realpath(root);
    target = await fs.realpath(target);
    if (
      !target.startsWith(resolvedRoot + path.sep) ||
      !(await fs.stat(target)).isFile()
    )
      return;
    const buf = await fs.readFile(target);
    return printReady(buf, /\.svg$/i.test(target));
  } catch {
    return;
  }
}

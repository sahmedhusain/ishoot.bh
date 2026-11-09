import sharp from "sharp";
import { readFileBytes } from "@platform/api-client";
import { detectFileType } from "@platform/contracts";

async function printReady(buffer: Buffer): Promise<Buffer> {
  try {
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
  const drawn = url?.match(/^data:image\/png;base64,([A-Za-z0-9+/=]+)$/)?.[1];
  if (drawn) {
    const bytes = Buffer.from(drawn, "base64");
    return sharp(bytes, { limitInputPixels: 16000000 })
      .trim()
      .png()
      .toBuffer()
      .catch(() => bytes);
  }
  if (!url || !url.startsWith("/api/files/")) return;
  if (/[?#\\\u0000]/.test(url)) return;

  try {
    const bytes = await readFileBytes(url);
    if (!bytes || !detectFileType(bytes)?.startsWith("image/")) return;
    return printReady(bytes);
  } catch (error) {
    console.warn("PDF asset fetch failed", error);
    return;
  }
}

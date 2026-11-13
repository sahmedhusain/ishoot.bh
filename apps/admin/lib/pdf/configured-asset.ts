import fs from "fs";
import path from "path";
import sharp from "sharp";
import { readFileBytes } from "@platform/api-client";
import { detectFileType } from "@platform/contracts";

function readLocalSeedAssetBuffer(url: string): Buffer | null {
  try {
    const parts = url.replace(/^\/api\/files\//, "").split("/");
    if (parts.length < 2) return null;
    const folder = parts[0];
    const name = parts[1];
    const cleanName = name.replace(/_[a-f0-9]{8,16}\.([a-z0-9]+)$/i, ".$1");
    const aliases = [cleanName, name];

    if (cleanName.includes("logo-light")) {
      aliases.push("logo-text-light.png", "full-logo-light.png", "logo-light.png");
    } else if (cleanName.includes("logo-dark")) {
      aliases.push("logo-text-dark.png", "full-logo-dark.png", "logo-dark.png");
    } else if (cleanName.includes("icon-light")) {
      aliases.push("icon-light.png", "icon-dark.png");
    } else if (cleanName.includes("icon-dark")) {
      aliases.push("icon-dark.png", "icon-light.png");
    }

    const roots = [
      path.resolve(process.cwd(), "../../seeds/assets"),
      path.resolve(process.cwd(), "../seeds/assets"),
      path.resolve(process.cwd(), "seeds/assets"),
      "/app/seeds/assets",
    ];

    for (const root of roots) {
      for (const alias of aliases) {
        const candidates = [
          path.join(root, "demo/assets", folder, alias),
          path.join(root, "ishoot/assets", folder, alias),
        ];
        for (const p of candidates) {
          if (fs.existsSync(p)) {
            return fs.readFileSync(p);
          }
        }
      }
    }
  } catch {}
  return null;
}

async function printReady(buffer: Buffer): Promise<Buffer> {
  try {
    const fileType = detectFileType(buffer);
    const isSvg = fileType === "image/svg+xml" || (buffer.length > 4 && buffer.toString("utf8", 0, 100).includes("<svg"));

    if (isSvg) {
      return await sharp(buffer)
        .png({ compressionLevel: 9 })
        .toBuffer();
    }

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
    // 1. Direct local disk read (0ms, 100% reliable in dev and Docker, no socket errors)
    const localBytes = readLocalSeedAssetBuffer(url);
    if (localBytes) {
      return await printReady(localBytes);
    }

    // 2. Fallback to API client remote fetch
    const bytes = await readFileBytes(url);
    if (!bytes) return;
    return await printReady(bytes);
  } catch (error) {
    console.warn("PDF asset fetch failed", error);
    return;
  }
}

import fs from "fs";
import path from "path";
import { getSite } from "../../../../../lib/site";
import { lookupFile } from "@platform/api-client";
import { FILE_URL_PREFIX } from "@platform/contracts";
import { fileResponse, measureOperation } from "@platform/database";
import { NextRequest, NextResponse } from "next/server";

function detectSeedMime(p: string): string {
  const low = p.toLowerCase();
  if (low.endsWith(".svg")) return "image/svg+xml";
  if (low.endsWith(".jpg") || low.endsWith(".jpeg")) return "image/jpeg";
  if (low.endsWith(".webp")) return "image/webp";
  if (low.endsWith(".woff2")) return "font/woff2";
  if (low.endsWith(".ttf")) return "font/ttf";
  if (low.endsWith(".otf")) return "font/otf";
  if (low.endsWith(".pdf")) return "application/pdf";
  return "image/png";
}

function findFileRecursive(dir: string, targets: string[]): string | null {
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        const hit = findFileRecursive(full, targets);
        if (hit) return hit;
      } else if (targets.some((t) => entry.name.toLowerCase() === t.toLowerCase())) {
        return full;
      }
    }
  } catch {}
  return null;
}

function findLocalSeedAssetResponse(folder: string, name: string): NextResponse | null {
  try {
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
      "/app/seeds/assets",
      "/seeds/assets",
      path.resolve(process.cwd(), "../../seeds/assets"),
      path.resolve(process.cwd(), "../seeds/assets"),
      path.resolve(process.cwd(), "seeds/assets"),
    ];

    for (const root of roots) {
      if (!fs.existsSync(root)) continue;
      for (const alias of aliases) {
        const candidates = [
          path.join(root, "demo/assets", folder, alias),
          path.join(root, "ishoot/assets", folder, alias),
          path.join(root, "ishoot/assets/brand", alias),
          path.join(root, "ishoot/assets/brand/signatures", alias),
          path.join(root, "ishoot/assets/fonts", alias),
          path.join(root, "ishoot/assets/media/banners", alias),
        ];
        for (const p of candidates) {
          if (fs.existsSync(p)) {
            const bytes = fs.readFileSync(p);
            return new NextResponse(bytes, {
              headers: {
                "Content-Type": detectSeedMime(p),
                "Content-Length": String(bytes.byteLength),
                "Cache-Control": "public, max-age=31536000, immutable",
              },
            });
          }
        }
      }
      const deepMatch = findFileRecursive(root, aliases);
      if (deepMatch) {
        const bytes = fs.readFileSync(deepMatch);
        return new NextResponse(bytes, {
          headers: {
            "Content-Type": detectSeedMime(deepMatch),
            "Content-Length": String(bytes.byteLength),
            "Cache-Control": "public, max-age=31536000, immutable",
          },
        });
      }
    }
  } catch {}
  return null;
}

function brandFallbackResponse(name: string): NextResponse {
  const isIcon = name.startsWith("icon");
  const isDark = name.includes("dark");
  const bg = isDark ? "%23111827" : "%23f3f4f6";
  const fg = isDark ? "%23f9fafb" : "%23111827";
  const text = isIcon ? "I" : "BRAND";
  const width = isIcon ? 80 : 240;
  const height = isIcon ? 80 : 60;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" rx="12" fill="${bg}"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="${fg}" font-family="sans-serif" font-size="${isIcon ? 32 : 18}" font-weight="bold">${text}</text></svg>`;
  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Content-Length": String(Buffer.byteLength(svg, "utf8")),
      "Cache-Control": "public, max-age=3600",
    },
  });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ folder: string; name: string }> },
) {
  return measureOperation("store:files/[folder]/[name]:GET", async () => {
    const { folder, name } = await params;
    if (!/^[a-zA-Z0-9_-]+\.[a-z0-9]+$/.test(name)) {
      return findLocalSeedAssetResponse(folder, name) ?? (folder === "brand" ? brandFallbackResponse(name) : new NextResponse(null, { status: 404 }));
    }
    const fileUrl = `${FILE_URL_PREFIX}${folder}/${name}`;
    try {
      const upload = await lookupFile(fileUrl);
      if (!upload?.isPublic) {
        return findLocalSeedAssetResponse(folder, name) ?? brandFallbackResponse(name);
      }
      const document = upload.mimeType === "application/pdf";
      if (document) {
        const { config } = await getSite();
        if (
          !config.commerce.capabilities.downloads ||
          !config.documents?.some((doc) => doc.url === fileUrl)
        )
          return new NextResponse(null, { status: 404 });
      }
      const response = await fileResponse(
        upload,
        document
          ? {
              download: true,
              fileName: name,
              cacheControl: "private, no-store",
            }
          : {},
      );
      return response ?? findLocalSeedAssetResponse(folder, name) ?? brandFallbackResponse(name);
    } catch {
      return findLocalSeedAssetResponse(folder, name) ?? brandFallbackResponse(name);
    }
  });
}

import fs from "fs";
import path from "path";
import { lookupFile, readFile, listCompanyAssetsForIT } from "@platform/api-client";
import { asUser, requireAllowed } from "../../../../../lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

function findLocalSeedAssetResponse(folder: string, name: string): Response | null {
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
          path.join(root, "ishoot/assets/media/banners", alias),
        ];
        for (const p of candidates) {
          if (fs.existsSync(p)) {
            const bytes = fs.readFileSync(p);
            return new Response(bytes, {
              headers: {
                "content-type": detectSeedMime(p),
                "content-length": String(bytes.byteLength),
                "cache-control": "public, max-age=86400",
                "x-content-type-options": "nosniff",
              },
            });
          }
        }
      }
      const deepMatch = findFileRecursive(root, aliases);
      if (deepMatch) {
        const bytes = fs.readFileSync(deepMatch);
        return new Response(bytes, {
          headers: {
            "content-type": detectSeedMime(deepMatch),
            "content-length": String(bytes.byteLength),
            "cache-control": "public, max-age=86400",
            "x-content-type-options": "nosniff",
          },
        });
      }
    }
  } catch {}
  return null;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ folder: string; name: string }> },
) {
  const { folder, name } = await params;
  if (!/^[a-zA-Z0-9_-]+$/.test(folder) || !/^[a-zA-Z0-9_.-]+$/.test(name) || name.includes("..")) {
    return new Response(null, { status: 404 });
  }
  const url = `/api/files/${folder}/${name}`;
  try {
    const file = await lookupFile(url);
    if (!file) {
      return findLocalSeedAssetResponse(folder, name) ?? new Response(null, { status: 404 });
    }
    if (!file.isPublic) {
      const user = await requireAllowed("setup", "read");
      const assets = await asUser(() => listCompanyAssetsForIT(user.token));
      if (!assets.some((asset) => asset.fileUrl === url)) {
        return new Response(null, { status: 404 });
      }
    }
    const response = await readFile(url);
    if (!response) {
      return findLocalSeedAssetResponse(folder, name) ?? new Response(null, { status: 404 });
    }
    const bytes = await response.arrayBuffer();
    const contentType = response.headers.get("content-type") || file.mimeType;
    if (bytes.byteLength <= 512 && !file.mimeType.includes("svg") && contentType.includes("svg")) {
      const local = findLocalSeedAssetResponse(folder, name);
      if (local) return local;
    }
    return new Response(bytes, {
      headers: {
        "content-type": contentType,
        "content-length": String(bytes.byteLength),
        "cache-control": file.isPublic ? "public, max-age=86400" : "private, no-store",
        "x-content-type-options": "nosniff",
      },
    });
  } catch {
    return findLocalSeedAssetResponse(folder, name) ?? new Response(null, { status: 404 });
  }
}

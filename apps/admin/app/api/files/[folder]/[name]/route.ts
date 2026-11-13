import fs from "fs";
import path from "path";
import { lookupFile } from "@platform/api-client";
import { FILE_URL_PREFIX, fileFolder } from "@platform/contracts";
import { measureOperation, fileResponse } from "@platform/database";
import { NextRequest, NextResponse } from "next/server";
import { requirePermission, getCurrentUser } from "../../../../../lib/auth";

function findLocalSeedAssetResponse(folder: string, name: string): NextResponse | null {
  try {
    const root = path.resolve(process.cwd(), "../../");
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

    for (const alias of aliases) {
      const candidates = [
        path.join(root, "seeds/assets/demo/assets", folder, alias),
        path.join(root, "seeds/assets/ishoot/assets", folder, alias),
        path.join(process.cwd(), "seeds/assets/demo/assets", folder, alias),
        path.join(process.cwd(), "seeds/assets/ishoot/assets", folder, alias),
      ];
      for (const p of candidates) {
        if (fs.existsSync(p)) {
          const bytes = fs.readFileSync(p);
          const mime = p.endsWith(".svg")
            ? "image/svg+xml"
            : p.endsWith(".jpg") || p.endsWith(".jpeg")
              ? "image/jpeg"
              : "image/png";
          return new NextResponse(bytes, {
            headers: {
              "Content-Type": mime,
              "Cache-Control": "public, max-age=31536000, immutable",
            },
          });
        }
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
      "Cache-Control": "public, max-age=3600",
    },
  });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ folder: string; name: string }> },
) {
  return measureOperation("admin:files/[folder]/[name]:GET", async () => {
    const { folder, name } = await params;
    if (!fileFolder(folder) || !/^[a-zA-Z0-9_-]+\.[a-z0-9]+$/.test(name)) {
      return findLocalSeedAssetResponse(folder, name) ?? (folder === "brand" ? brandFallbackResponse(name) : new NextResponse(null, { status: 404 }));
    }

    try {
      const fileUrl = `${FILE_URL_PREFIX}${folder}/${name}`;
      const upload = await lookupFile(fileUrl);

      if (!upload) {
        return findLocalSeedAssetResponse(folder, name) ?? (folder === "brand" ? brandFallbackResponse(name) : new NextResponse(null, { status: 404 }));
      }

      if (!upload.isPublic) {
        const user = await getCurrentUser();
        if (!user) return new NextResponse(null, { status: 401 });
        if (folder === "avatars" && (upload.claimedAt || upload.ownerId === user.id)) {
          const resp = await fileResponse(upload);
          return resp ?? findLocalSeedAssetResponse(folder, name) ?? new NextResponse(null, { status: 404 });
        }
        if (
          upload.ownerId !== user.id ||
          new Date(upload.expiresAt) <= new Date() ||
          upload.claimedAt
        ) {
          return new NextResponse(null, { status: 403 });
        }
      }

      const response = await fileResponse(upload);
      if (!response) {
        return findLocalSeedAssetResponse(folder, name) ?? (folder === "brand" ? brandFallbackResponse(name) : new NextResponse(null, { status: 404 }));
      }
      return response;
    } catch {
      return findLocalSeedAssetResponse(folder, name) ?? (folder === "brand" ? brandFallbackResponse(name) : new NextResponse(null, { status: 404 }));
    }
  });
}

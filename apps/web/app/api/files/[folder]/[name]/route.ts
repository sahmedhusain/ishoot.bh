import { measureOperation } from "@platform/database";
import { NextRequest,NextResponse } from "next/server";
import { realpath,stat } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { Readable } from "node:stream";
import path from "node:path";
import { db,uploadRoot,generateDownloadUrl,uploadStorageLocation,isSupabaseStorageConfigured } from "@platform/database";
export async function GET(req: NextRequest, { params }: { params: Promise<{ folder: string; name: string }> }) {
  return measureOperation("web:files/[folder]/[name]:GET", async () => {
  const { folder, name } = await params;
  if (folder !== "brand" || !/^[a-zA-Z0-9_-]+\.(png|jpg|jpeg|webp)$/.test(name)) return new NextResponse(null, { status: 404 });
  const upload = await db.uploadObject.findUnique({ where: { fileUrl: `/api/files/${folder}/${name}` }, select: { isPublic: true, mimeType: true } });
  if (!upload?.isPublic) return new NextResponse(null, { status: 404 });
  try {
    if (isSupabaseStorageConfigured() && upload) {
      const location = uploadStorageLocation(`/api/files/${folder}/${name}`, upload.isPublic);
      const url = await generateDownloadUrl(location.bucket, location.path);
      // Never cache redirects beyond the short lifetime of their signed URL.
      return new NextResponse(null, { status: 307, headers: { Location: url, "Cache-Control": "private, no-store" } });
    }
    const root = await realpath(uploadRoot());
    const target = await realpath(path.join(root, folder, name));
    if (!target.startsWith(root + path.sep)) return new NextResponse(null, { status: 404 });
    const info = await stat(target);
    return new NextResponse(Readable.toWeb(createReadStream(target)) as ReadableStream, { headers: { "Content-Type": upload.mimeType, "Content-Length": String(info.size), "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" } });
  } catch { return new NextResponse(null, { status: 404 }); }

  });
}

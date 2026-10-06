import { NextRequest, NextResponse } from "next/server";
import { stat } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { Readable } from "node:stream";
import {
  db,
  generateDownloadUrl,
  getTaxCertificate,
  isSupabaseStorageConfigured,
  localUploadPath,
  measureOperation,
  uploadRoot,
  uploadStorageLocation,
} from "@ishoot/database";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MIME: Record<string, string> = { pdf: "application/pdf", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp" };

/**
 * The tax registration certificate behind the QR code printed on invoices, quotations and receipts.
 * Public by design (clients scan it), but it only ever serves the file the company set as a certificate.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  return measureOperation("admin:certificates/[code]/file:GET", async () => {
    const { code } = await params;
    const certificate = await getTaxCertificate(code);
    const fileUrl = certificate?.certificateUrl;
    if (!fileUrl || !/^\/api\/files\//.test(fileUrl)) return new NextResponse(null, { status: 404 });
    const extension = fileUrl.split(".").pop()!.toLowerCase();
    const headers = { "Content-Type": MIME[extension] ?? "application/octet-stream", "Cache-Control": "public, max-age=300", "X-Content-Type-Options": "nosniff", "Content-Disposition": "inline" };
    try {
      if (isSupabaseStorageConfigured()) {
        const upload = await db.uploadObject.findUnique({ where: { fileUrl }, select: { isPublic: true } });
        const location = uploadStorageLocation(fileUrl, upload?.isPublic ?? false);
        const url = await generateDownloadUrl(location.bucket, location.path);
        return new NextResponse(null, { status: 307, headers: { Location: url, "Cache-Control": "private, no-store" } });
      }
      const target = localUploadPath(fileUrl, uploadRoot());
      const metadata = await stat(target);
      return new NextResponse(Readable.toWeb(createReadStream(target)) as ReadableStream, { headers: { ...headers, "Content-Length": String(metadata.size) } });
    } catch {
      return new NextResponse(null, { status: 404 });
    }
  });
}

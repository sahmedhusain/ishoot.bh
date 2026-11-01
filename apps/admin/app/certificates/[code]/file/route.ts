import { NextRequest, NextResponse } from "next/server";
import { lookupFile } from "@platform/api-client";
import {
  fileResponse,
  getTaxCertificate,
  isDocumentLink,
  measureOperation,
} from "@platform/database";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * The tax registration certificate behind the QR code printed on invoices, quotations and receipts.
 * Public by design (clients scan it), but it only ever serves the file the company set as a certificate.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  return measureOperation("admin:certificates/[code]/file:GET", async () => {
    const { code } = await params;
    const certificate = await getTaxCertificate(code);
    const fileUrl = certificate?.certificateUrl;
    // A certificate kept on an official portal is linked rather than uploaded: send the visitor there.
    if (fileUrl && isDocumentLink(fileUrl))
      return NextResponse.redirect(fileUrl, {
        status: 307,
        headers: { "Cache-Control": "public, max-age=300" },
      });
    if (!fileUrl || !/^\/api\/files\//.test(fileUrl))
      return new NextResponse(null, { status: 404 });
    try {
      const upload = await lookupFile(fileUrl);
      const response =
        upload &&
        (await fileResponse(upload, { cacheControl: "public, max-age=300" }));
      return response ?? new NextResponse(null, { status: 404 });
    } catch {
      return new NextResponse(null, { status: 404 });
    }
  });
}

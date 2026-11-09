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

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  return measureOperation("admin:certificates/[code]/file:GET", async () => {
    const { code } = await params;
    const certificate = await getTaxCertificate(code);
    const fileUrl = certificate?.certificateUrl;
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

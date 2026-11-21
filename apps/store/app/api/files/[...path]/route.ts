import { getSite } from "../../../../lib/site";
import { lookupFile } from "@platform/api-client";
import { FILE_URL_PREFIX } from "@platform/contracts";
import { fileResponse, measureOperation } from "@platform/database";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  return measureOperation("store:files/[...path]:GET", async () => {
    const { path: segments = [] } = await params;
    if (segments.length < 2) {
      return new NextResponse(null, { status: 404 });
    }
    const folder = segments[0];
    const middle = segments.slice(1, -1);
    const name = segments[segments.length - 1];
    if (
      !/^[a-zA-Z0-9_-]+$/.test(folder) ||
      middle.some((seg) => !/^[a-zA-Z0-9_-]+$/.test(seg)) ||
      !/^[a-zA-Z0-9_-]+\.[a-z0-9]+$/.test(name)
    ) {
      return new NextResponse(null, { status: 404 });
    }
    const fileUrl = `${FILE_URL_PREFIX}${segments.join("/")}`;
    try {
      const upload = await lookupFile(fileUrl);
      if (!upload?.isPublic) {
        return new NextResponse(null, { status: 404 });
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
      return response ?? new NextResponse(null, { status: 404 });
    } catch {
      return new NextResponse(null, { status: 404 });
    }
  });
}

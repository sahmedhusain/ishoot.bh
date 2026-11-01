import { getSite } from "../../../../../lib/site";
import { lookupFile } from "@platform/api-client";
import { FILE_URL_PREFIX } from "@platform/contracts";
import { fileResponse, measureOperation } from "@platform/database";
import { NextRequest, NextResponse } from "next/server";

/** Public brand files and the website's published documents; nothing private is ever served here. */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ folder: string; name: string }> },
) {
  return measureOperation("web:files/[folder]/[name]:GET", async () => {
    const { folder, name } = await params;
    if (folder !== "brand" || !/^[a-zA-Z0-9_-]+\.[a-z0-9]+$/.test(name))
      return new NextResponse(null, { status: 404 });
    const fileUrl = `${FILE_URL_PREFIX}${folder}/${name}`;
    try {
      const upload = await lookupFile(fileUrl);
      if (!upload?.isPublic) return new NextResponse(null, { status: 404 });
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

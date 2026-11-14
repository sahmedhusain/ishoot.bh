import { lookupFile } from "@platform/api-client";
import { FILE_URL_PREFIX, fileFolder } from "@platform/contracts";
import { measureOperation, fileResponse } from "@platform/database";
import { NextRequest, NextResponse } from "next/server";
import { requirePermission, getCurrentUser } from "../../../../../lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ folder: string; name: string }> },
) {
  return measureOperation("admin:files/[folder]/[name]:GET", async () => {
    const { folder, name } = await params;
    if (!fileFolder(folder) || !/^[a-zA-Z0-9_-]+\.[a-z0-9]+$/.test(name)) {
      return new NextResponse(null, { status: 404 });
    }

    try {
      const fileUrl = `${FILE_URL_PREFIX}${folder}/${name}`;
      const upload = await lookupFile(fileUrl);

      if (!upload) {
        return new NextResponse(null, { status: 404 });
      }

      if (!upload.isPublic) {
        const user = await getCurrentUser();
        if (!user) return new NextResponse(null, { status: 401 });
        if (folder === "avatars" && (upload.claimedAt || upload.ownerId === user.id)) {
          const resp = await fileResponse(upload);
          return resp ?? new NextResponse(null, { status: 404 });
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
      return response ?? new NextResponse(null, { status: 404 });
    } catch {
      return new NextResponse(null, { status: 404 });
    }
  });
}

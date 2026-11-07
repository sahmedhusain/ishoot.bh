import { lookupFile } from "@platform/api-client";
import { FILE_URL_PREFIX, fileFolder } from "@platform/contracts";
import { measureOperation, fileResponse } from "@platform/database";
import { NextRequest, NextResponse } from "next/server";
import { requirePermission, getCurrentUser } from "../../../../../lib/auth";
import { requireAttachmentAccess } from "../../../../../lib/attachment-access";
/** The permission that guards a file stored on a record's own field, if any record holds it. */
async function recordFileResource(_fileUrl: string) {
  return null;
}
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ folder: string; name: string }> },
) {
  return measureOperation("admin:files/[folder]/[name]:GET", async () => {
    const { folder, name } = await params;
    if (!fileFolder(folder) || !/^[a-zA-Z0-9_-]+\.[a-z0-9]+$/.test(name))
      return new NextResponse(null, { status: 404 });
    try {
      const fileUrl = `${FILE_URL_PREFIX}${folder}/${name}`;
      const upload = await lookupFile(fileUrl);
      if (!upload) return new NextResponse(null, { status: 404 });
      if (!upload.isPublic) {
        const user = await getCurrentUser();
        if (!user) return new NextResponse(null, { status: 401 });
        // Saved profile photos are shown to every colleague; an unsaved one only to the person cropping it.
        if (folder === "avatars" && (upload.claimedAt || upload.ownerId === user.id))
          return (await fileResponse(upload)) ?? new NextResponse(null, { status: 404 });
        const attachment: any = null;
        const companyDocument: any = null;
        const recordResource = null;
        if (attachment)
          await requireAttachmentAccess(
            attachment.entityType,
            attachment.entityId,
            "read",
          );
        else if (companyDocument) await requirePermission("settings", "read");
        // Whoever uploaded the file keeps access to it, e.g. an employee's own leave evidence.
        else if (recordResource) {
          if (upload.ownerId !== user.id)
            await requirePermission(recordResource, "read");
        } else if (
          upload.ownerId !== user.id ||
          new Date(upload.expiresAt) <= new Date() ||
          upload.claimedAt
        )
          return new NextResponse(null, { status: 403 });
      }
      return (
        (await fileResponse(upload)) ?? new NextResponse(null, { status: 404 })
      );
    } catch {
      return new NextResponse(null, { status: 403 });
    }
  });
}

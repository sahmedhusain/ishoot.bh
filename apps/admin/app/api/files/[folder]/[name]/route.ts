import { lookupFile } from "@platform/api-client";
import { FILE_URL_PREFIX, fileFolder } from "@platform/contracts";
import { measureOperation, db, fileResponse } from "@platform/database";
import { NextRequest, NextResponse } from "next/server";
import { requirePermission, getCurrentUser } from "../../../../../lib/auth";
import { requireAttachmentAccess } from "../../../../../lib/attachment-access";
/** The permission that guards a file stored on a record's own field, if any record holds it. */
async function recordFileResource(fileUrl: string) {
  if (
    await db.employeeCredential.findFirst({
      where: { fileUrl },
      select: { id: true },
    })
  )
    return "employees" as const;
  if (
    await db.leaveRequest.findFirst({
      where: { attachmentUrl: fileUrl },
      select: { id: true },
    })
  )
    return "employees" as const;
  if (
    await db.expense.findFirst({
      where: { receiptUrl: fileUrl },
      select: { id: true },
    })
  )
    return "expenses" as const;
  if (
    await db.taxRate.findFirst({
      where: { certificateUrl: fileUrl },
      select: { id: true },
    })
  )
    return "settings" as const;
  if (
    await db.companySetting.findFirst({
      where: { vatCertificateUrl: fileUrl },
      select: { id: true },
    })
  )
    return "settings" as const;
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
        const attachment = await db.attachment.findFirst({
          where: {
            OR: [{ fileUrl }, { fileUrl: `/uploads/${folder}/${name}` }],
          },
          select: { entityType: true, entityId: true },
        });
        const companyDocument = attachment
          ? null
          : await db.companyDocument.findFirst({
              where: { fileUrl },
              select: { id: true },
            });
        // Files kept on a record's own field rather than as an attachment (the company archive lists them too).
        const recordResource =
          attachment || companyDocument
            ? null
            : await recordFileResource(fileUrl);
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

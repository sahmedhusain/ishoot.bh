import { measureOperation } from "@platform/database";
import { NextRequest,NextResponse } from "next/server";
import { realpath,stat } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { Readable } from "node:stream";
import path from "node:path";
import { db,uploadRoot,generateDownloadUrl,uploadStorageLocation,isSupabaseStorageConfigured } from "@platform/database";
import { requirePermission,getCurrentUser } from "../../../../../lib/auth";
import { requireAttachmentAccess } from "../../../../../lib/attachment-access";
/** The permission that guards a file stored on a record's own field, if any record holds it. */
async function recordFileResource(fileUrl: string) {
  if (await db.employeeCredential.findFirst({ where: { fileUrl }, select: { id: true } })) return "employees" as const;
  if (await db.leaveRequest.findFirst({ where: { attachmentUrl: fileUrl }, select: { id: true } })) return "employees" as const;
  if (await db.expense.findFirst({ where: { receiptUrl: fileUrl }, select: { id: true } })) return "expenses" as const;
  if (await db.taxRate.findFirst({ where: { certificateUrl: fileUrl }, select: { id: true } })) return "settings" as const;
  if (await db.companySetting.findFirst({ where: { vatCertificateUrl: fileUrl }, select: { id: true } })) return "settings" as const;
  return null;
}
export async function GET(req: NextRequest, { params }: { params: Promise<{ folder: string; name: string }> }) {
  return measureOperation("admin:files/[folder]/[name]:GET", async () => {
  const { folder, name } = await params;
  if (!/^(payments|invoices|certificates|vault|deals|general|brand)$/.test(folder) || !(/^[a-zA-Z0-9_-]+\.(pdf|png|jpg|jpeg|webp)$/.test(name) || (folder === "brand" && /^[a-zA-Z0-9_-]+\.woff2$/.test(name)))) return new NextResponse(null, { status: 404 });
  try {
    const fileUrl = `/api/files/${folder}/${name}`;
    const upload = await db.uploadObject.findUnique({ where: { fileUrl } });
    if (!upload?.isPublic) {
      const user = await getCurrentUser();
      if (!user) return new NextResponse(null, { status: 401 });
      const attachment = await db.attachment.findFirst({ where: { OR: [{ fileUrl }, { fileUrl: `/uploads/${folder}/${name}` }] }, select: { entityType: true, entityId: true } });
      const companyDocument = attachment ? null : await db.companyDocument.findFirst({ where: { fileUrl }, select: { id: true } });
      // Files kept on a record's own field rather than as an attachment (the company archive lists them too).
      const recordResource = attachment || companyDocument ? null : await recordFileResource(fileUrl);
      if (attachment) await requireAttachmentAccess(attachment.entityType, attachment.entityId, "read");
      else if (companyDocument) await requirePermission("settings", "read");
      // Whoever uploaded the file keeps access to it, e.g. an employee's own leave evidence.
      else if (recordResource) { if (upload?.ownerId !== user.id) await requirePermission(recordResource, "read"); }
      else if (!upload || upload.ownerId !== user.id || upload.expiresAt <= new Date() || upload.claimedAt) return new NextResponse(null, { status: 403 });
    }
    if (isSupabaseStorageConfigured() && upload) {
      const location = uploadStorageLocation(`/api/files/${folder}/${name}`, upload.isPublic);
      const url = await generateDownloadUrl(location.bucket, location.path);
      // Never cache redirects beyond the short lifetime of their signed URL.
      return new NextResponse(null, { status: 307, headers: { Location: url, "Cache-Control": "private, no-store" } });
    }
    let root = uploadRoot();
    let filePath: string;
    try { root = await realpath(root); filePath = await realpath(path.join(root, folder, name)); }
    catch {
      if (upload) return new NextResponse(null, { status: 404 });
      root = await realpath(path.join(process.cwd(), "public", "uploads"));
      filePath = await realpath(path.join(root, folder, name));
    }
    if (!filePath.startsWith(root + path.sep)) return new NextResponse(null, { status: 404 });
    const metadata = await stat(filePath);
    const mime: Record<string, string> = { pdf: "application/pdf", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp" };
    return new NextResponse(Readable.toWeb(createReadStream(filePath)) as ReadableStream, { headers: { "Content-Type": mime[name.split(".").pop()!], "Content-Length": String(metadata.size), "Cache-Control": upload?.isPublic ? "public, max-age=31536000, immutable" : "private, no-store", "X-Content-Type-Options": "nosniff", "Content-Disposition": "inline" } });
  } catch { return new NextResponse(null, { status: 403 }); }

  });
}

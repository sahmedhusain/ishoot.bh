import { realpath, stat } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { Readable } from "node:stream";
import path from "node:path";
import {
  db,
  generateDownloadUrl,
  isSupabaseStorageConfigured,
  uploadRoot,
  uploadStorageLocation,
} from "@platform/database";
import {
  accountsEnabled,
  currentCustomer,
} from "../../../../../../../lib/customer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; attachmentId: string }> },
) {
  if (!(await accountsEnabled())) return new Response(null, { status: 404 });
  const customer = await currentCustomer();
  if (!customer) return new Response(null, { status: 401 });
  const { id, attachmentId } = await params;
  if (
    !(await db.salesOrder.findFirst({
      where: { id, customerId: customer.id },
      select: { id: true },
    }))
  )
    return new Response(null, { status: 404 });
  const file = await db.attachment.findFirst({
    where: {
      id: attachmentId,
      entityType: "sales_order",
      entityId: id,
      uploadedById: null,
    },
  });
  if (
    !file ||
    !/^\/api\/files\/general\/customer_[a-z0-9-]+\.(pdf|png|jpg|webp)$/.test(
      file.fileUrl,
    )
  )
    return new Response(null, { status: 404 });
  try {
    const location = uploadStorageLocation(file.fileUrl, false);
    if (isSupabaseStorageConfigured())
      return new Response(null, {
        status: 307,
        headers: {
          Location: await generateDownloadUrl(location.bucket, location.path),
          "Cache-Control": "private, no-store",
        },
      });
    const root = await realpath(uploadRoot());
    const target = await realpath(path.join(root, location.path));
    if (!target.startsWith(root + path.sep))
      return new Response(null, { status: 404 });
    return new Response(
      Readable.toWeb(createReadStream(target)) as ReadableStream,
      {
        headers: {
          "Content-Type": file.mimeType || "application/octet-stream",
          "Content-Length": String((await stat(target)).size),
          "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(file.fileName)}`,
          "Cache-Control": "private, no-store",
          "X-Content-Type-Options": "nosniff",
        },
      },
    );
  } catch {
    return new Response(null, { status: 404 });
  }
}

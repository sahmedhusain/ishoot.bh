import { lookupFile } from "@platform/api-client";
import { db, fileResponse } from "@platform/database";
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
    const upload = await lookupFile(file.fileUrl);
    const response =
      upload &&
      (await fileResponse(upload, { download: true, fileName: file.fileName }));
    return response ?? new Response(null, { status: 404 });
  } catch {
    return new Response(null, { status: 404 });
  }
}

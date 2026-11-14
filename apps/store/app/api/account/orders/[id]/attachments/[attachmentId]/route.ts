import { listEntityAttachments } from "@platform/api-client";
import { customerOrder, fileResponse } from "@platform/database";
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
  if (!id || !attachmentId) return new Response(null, { status: 404 });
  const order = await customerOrder(customer.id, id);
  if (!order) return new Response(null, { status: 404 });
  const attachments = await listEntityAttachments({
    entityType: "order",
    entityId: id,
  }).catch(() => []);
  const match = attachments.find((a) => a.id === attachmentId);
  if (!match) return new Response(null, { status: 404 });
  const res = await fileResponse(
    {
      fileUrl: match.fileUrl,
      mimeType: match.mimeType || "application/octet-stream",
      fileSize: match.fileSize || 0,
      isPublic: false,
    },
    { fileName: match.fileName },
  );
  return res ?? new Response(null, { status: 404 });
}

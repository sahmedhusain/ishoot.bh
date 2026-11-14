import { isWebsitePreview } from "../../../../../../lib/website";
import { NextRequest, NextResponse } from "next/server";
import { createEntityAttachment } from "@platform/api-client";
import { consumeAbuseLimit, customerOrder } from "@platform/database";
import {
  accountsEnabled,
  currentCustomer,
  sameOrigin,
  jsonError,
} from "../../../../../../lib/customer";
import {
  storePrivateUpload,
  discardPrivateUpload,
} from "../../../../../../lib/private-upload";
import { getSite } from "../../../../../../lib/site";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!sameOrigin(req))
    return NextResponse.json({ error: "generic" }, { status: 403 });
  if (
    (await isWebsitePreview()) ||
    !(await accountsEnabled()) ||
    (await getSite()).config.commerce.orderAttachments === false
  )
    return NextResponse.json({ error: "unavailable" }, { status: 404 });
  const customer = await currentCustomer();
  if (!customer)
    return NextResponse.json({ error: "signed_out" }, { status: 401 });
  const { id } = await params;
  if (!id)
    return NextResponse.json({ error: "unavailable" }, { status: 404 });
  const order = await customerOrder(customer.id, id);
  if (!order)
    return NextResponse.json({ error: "unavailable" }, { status: 404 });
  try {
    await consumeAbuseLimit("customer-order-upload", customer.id, 10, 3600);
  } catch (error) {
    return jsonError(error);
  }
  const file = await storePrivateUpload(req, "customer");
  if (file instanceof Response) return file;
  try {
    const attachment = await createEntityAttachment({
      fileUrl: file.fileUrl,
      fileName: file.fileName,
      fileSize: file.fileSize,
      mimeType: file.mimeType,
      entityType: "order",
      entityId: id,
      relationKind: "order_attachment",
      clientId: customer.id,
      uploadedById: customer.id,
    });
    return NextResponse.json({ success: true, id: attachment.id }, { status: 201 });
  } catch {
    await discardPrivateUpload(file.fileUrl);
    return NextResponse.json({ error: "generic" }, { status: 503 });
  }
}

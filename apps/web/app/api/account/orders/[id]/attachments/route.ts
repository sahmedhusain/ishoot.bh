import { isWebsitePreview } from "../../../../../../lib/website";
import { NextRequest, NextResponse } from "next/server";
import { consumeAbuseLimit } from "@platform/database";
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

/** Authenticated raw-body uploads stay private; evidence never modifies payment state. */
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
  try {
    await consumeAbuseLimit("customer-order-upload", customer.id, 10, 3600);
  } catch (error) {
    return jsonError(error);
  }
  const file = await storePrivateUpload(req, "customer");
  if (file instanceof Response) return file;
  return NextResponse.json({ success: true }, { status: 201 });
}

import { isWebsitePreview } from "../../../../../../lib/website";
import { NextRequest, NextResponse } from "next/server";
import { consumeAbuseLimit, db } from "@platform/database";
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
  if (
    !(await db.salesOrder.findFirst({
      where: { id, customerId: customer.id },
      select: { id: true },
    }))
  )
    return NextResponse.json({ error: "unavailable" }, { status: 404 });
  try {
    await consumeAbuseLimit("customer-order-upload", customer.id, 10, 3600);
  } catch (error) {
    return jsonError(error);
  }
  const file = await storePrivateUpload(req, "customer");
  if (file instanceof Response) return file;
  const { fileUrl, fileName, fileSize, mimeType } = file;
  try {
    const attachment = await db.$transaction(async (tx) => {
      // Serialize the per-order quota so parallel uploads cannot exceed it.
      const owned = await tx.$queryRaw<
        { id: string }[]
      >`SELECT id FROM "SalesOrder" WHERE id = ${id} AND "customerId" = ${customer.id} FOR UPDATE`;
      if (!owned.length) throw new Error("unavailable");
      const count = await tx.attachment.count({
        where: {
          entityType: "sales_order",
          entityId: id,
          uploadedById: null,
          fileUrl: { startsWith: "/api/files/general/customer_" },
        },
      });
      if (count >= 10) throw new Error("attachment_limit");
      return tx.attachment.create({
        data: {
          entityType: "sales_order",
          entityId: id,
          fileUrl,
          fileName,
          fileSize,
          mimeType,
        },
        select: { id: true },
      });
    });
    return NextResponse.json({ id: attachment.id }, { status: 201 });
  } catch (error) {
    await discardPrivateUpload(fileUrl);
    return NextResponse.json(
      {
        error:
          error instanceof Error && error.message === "attachment_limit"
            ? "attachment_limit"
            : "generic",
      },
      { status: 400 },
    );
  }
}

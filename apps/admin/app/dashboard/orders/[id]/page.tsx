import { notFound } from "next/navigation";
import { hasPermission, requirePagePermission } from "../../../../lib/auth";
import { getOrder, requireFeatureEnabled } from "@platform/database";
import { OrderView } from "../../../../components/orders/OrderView";

export const dynamic = "force-dynamic";

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePagePermission("orders", "read");
  await requireFeatureEnabled("store");
  const { id } = await params;
  const [order, canEdit, canApprove, canInvoice] = await Promise.all([getOrder(id), hasPermission("orders", "edit"), hasPermission("orders", "approve"), hasPermission("invoices", "create")]);
  if (!order) notFound();
  return <OrderView order={order} rights={{ edit: canEdit, refund: canApprove, invoice: canInvoice }} />;
}

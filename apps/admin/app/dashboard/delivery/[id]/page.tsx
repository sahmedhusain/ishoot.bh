import { notFound } from "next/navigation";
import { getShipment, requireFeatureEnabled } from "@platform/database";
import { hasPermission, requirePagePermission } from "../../../../lib/auth";
import { ShipmentView } from "../../../../components/delivery/ShipmentView";

export const dynamic = "force-dynamic";

export default async function ShipmentPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePagePermission("deliveries", "read");
  await requireFeatureEnabled("delivery");
  const { id } = await params;
  const [shipment, canEdit] = await Promise.all([getShipment(id), hasPermission("deliveries", "edit")]);
  if (!shipment) notFound();
  const web = (process.env.WEB_URL || process.env.NEXT_PUBLIC_WEB_URL || "").replace(/\/$/, "");
  const trackingLink = web ? `${web}/${shipment.order.locale}/track/${shipment.tracking_token}` : "";
  return <ShipmentView shipment={shipment} trackingLink={trackingLink} canEdit={canEdit} />;
}

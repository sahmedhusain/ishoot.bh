import { notFound } from "next/navigation";
import { getShipment, listCourierAgencies, listDrivers, listVehicles, requireFeatureEnabled } from "@platform/database";
import { getCachedCompanySettings } from "../../../../lib/cached-queries";
import { deliveryScope } from "../../../../lib/delivery-scope";
import { hasPermission, requirePagePermission } from "../../../../lib/auth";
import { ShipmentView } from "../../../../components/delivery/ShipmentView";
import { pageMetadata } from "../../../../lib/company-metadata";

export const generateMetadata = () => pageMetadata("delivery/[id]");

export const dynamic = "force-dynamic";

export default async function ShipmentPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePagePermission("deliveries", "read");
  await requireFeatureEnabled("delivery");
  const { id } = await params;
  const scope = await deliveryScope();
  const [shipment, canEdit, canAssign] = await Promise.all([getShipment(id), hasPermission("deliveries", "edit"), hasPermission("deliveries", "assign")]);
  // Drivers open only their own shipments.
  if (!shipment || (scope.driverId && shipment.driver_id !== scope.driverId)) notFound();
  const [drivers, vehicles, agencies] = canAssign ? await Promise.all([listDrivers(), listVehicles(), listCourierAgencies()]) : [[], [], []];
  const company = await getCachedCompanySettings();
  const web = (process.env.WEB_URL || process.env.NEXT_PUBLIC_WEB_URL || "").replace(/\/$/, "");
  const trackingLink = web ? `${web}/${shipment.order.locale}/track/${shipment.tracking_token}` : "";
  return <ShipmentView shipment={shipment} trackingLink={trackingLink} canEdit={canEdit} canAssign={canAssign} drivers={drivers} vehicles={vehicles.filter((v) => v.is_active || v.id === shipment.vehicle_id)} agencies={agencies.filter((a) => a.is_active)} currency={company.default_currency} />;
}

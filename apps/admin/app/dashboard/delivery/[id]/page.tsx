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
  if (!shipment || (scope.driverId && shipment.driver_id !== scope.driverId)) notFound();
  const [drivers, vehicles, agencies] = canAssign ? await Promise.all([listDrivers(), listVehicles(), listCourierAgencies()]) : [[], [], []];
  const company = await getCachedCompanySettings();
  const storeDomain = (company as { store_domain?: string | null }).store_domain;
  const storeBase = (storeDomain ? `https://${storeDomain}` : (process.env.STORE_URL || (company.website_domain ? `https://${company.website_domain}` : (process.env.WEB_URL || "")))).replace(/\/$/, "");
  const trackingLink = storeBase ? `${storeBase}/${(shipment as any).order?.locale || "en"}/track/${(shipment as any).tracking_token || shipment.trackingToken}` : "";
  return <ShipmentView shipment={shipment} trackingLink={trackingLink} canEdit={canEdit} canAssign={canAssign} drivers={drivers} vehicles={vehicles.filter((v: any) => v.is_active || v.isActive || v.id === (shipment as any).vehicle_id || v.id === shipment.vehicleId)} agencies={agencies.filter((a: any) => a.is_active || a.isActive)} currency={company.default_currency} />;
}

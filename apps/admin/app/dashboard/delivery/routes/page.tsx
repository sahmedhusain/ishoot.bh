import { listDrivers, listRouteSheets, listVehicles, requireFeatureEnabled, routableShipments } from "@platform/database";
import { requirePagePermission } from "../../../../lib/auth";
import { RouteSheetsView } from "../../../../components/delivery/RouteSheetsView";

export const dynamic = "force-dynamic";

export default async function RouteSheetsPage() {
  await requirePagePermission("deliveries", "assign");
  await requireFeatureEnabled("delivery");
  const [sheets, shipments, drivers, vehicles] = await Promise.all([listRouteSheets(), routableShipments(), listDrivers(), listVehicles()]);
  return <RouteSheetsView sheets={sheets} shipments={shipments} drivers={drivers} vehicles={vehicles.filter((v) => v.is_active)} />;
}

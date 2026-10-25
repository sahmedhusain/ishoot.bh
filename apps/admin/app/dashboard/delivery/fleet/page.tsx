import { listDrivers, listVehicles, requireFeatureEnabled } from "@platform/database";
import { requirePagePermission } from "../../../../lib/auth";
import { FleetView } from "../../../../components/delivery/FleetView";

export const dynamic = "force-dynamic";

export default async function FleetPage() {
  await requirePagePermission("deliveries", "assign");
  await requireFeatureEnabled("delivery");
  const [vehicles, drivers] = await Promise.all([listVehicles(), listDrivers()]);
  return <FleetView vehicles={vehicles} drivers={drivers} />;
}

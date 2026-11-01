import { driverShipments, employeeIdForUser, requireFeatureEnabled } from "@platform/database";
import { requirePagePermission } from "../../../lib/auth";
import { DriverView } from "../../../components/delivery/DriverView";
import { pageMetadata } from "../../../lib/company-metadata";

export const generateMetadata = () => pageMetadata("driver");

export const dynamic = "force-dynamic";

/** The driver's own deliveries, made for a phone. */
export default async function DriverPage() {
  const user = await requirePagePermission("deliveries", "edit");
  await requireFeatureEnabled("delivery");
  const employeeId = await employeeIdForUser(user.id);
  const stops = employeeId ? await driverShipments(employeeId) : [];
  return <DriverView stops={stops} linked={!!employeeId} />;
}

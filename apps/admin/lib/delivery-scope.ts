import { serverMessages } from "@platform/locales";
import {
  db,
  employeeIdForUser,
  type PermissionAction,
} from "@platform/database";
import { hasPermission, requirePermission } from "./auth";

export async function deliveryScope(action: PermissionAction = "read") {
  const user = await requirePermission("deliveries", action);
  if (await hasPermission("deliveries", "assign"))
    return { user, driverId: null as string | null };
  const driverId = await employeeIdForUser(user.id);
  return { user, driverId: driverId ?? "00000000-0000-0000-0000-000000000000" };
}

export async function requireShipmentAccess(
  id: string,
  action: PermissionAction,
) {
  const scope = await deliveryScope(action);
  if (scope.driverId) {
    const shipment = await db.shipment.findUnique({
      where: { id },
      select: { driverId: true },
    });
    if (shipment?.driverId !== scope.driverId)
      throw new Error(serverMessages.shipmentNotYours);
  }
  return scope;
}

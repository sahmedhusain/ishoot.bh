import { serverMessages } from "@platform/locales";
import {
  employeeIdForUser,
  type PermissionAction,
} from "@platform/database";
import { listTableRows } from "./api/tables";
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
    const shipments = await listTableRows<Record<string, any>>(
      "delivery",
      "shipment",
    );
    const shipment = shipments.find((s) => s.id === id);
    if (shipment?.driverId !== scope.driverId)
      throw new Error(serverMessages.shipmentNotYours);
  }
  return scope;
}

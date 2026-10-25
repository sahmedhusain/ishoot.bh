"use server";
import { revalidatePath } from "next/cache";
import {
  createActivityLog,
  deleteDeliverySlot,
  measureOperation,
  moveShipment,
  requireFeatureEnabled,
  saveDeliverySettings,
  saveDeliverySlot,
  saveDeliveryZone,
  type DeliverySettingsInput,
  type DeliverySlotInput,
  type DeliveryZoneInput,
  type MoveShipmentInput,
} from "@platform/database";
import { ROUTES } from "../../constants/routes";
import { requirePermission } from "../../lib/auth";
import { validateActionArguments } from "../../lib/action-input";
import { notifyLowStock } from "../../lib/low-stock";

/** Moves a shipment on (out for delivery, delivered, failed with a reason, returned); the order follows. */
export async function moveShipmentAction(id: string, input: MoveShipmentInput) {
  return measureOperation("action:moveShipmentAction", async () => {
    await requireFeatureEnabled("delivery");
    const user = await requirePermission("deliveries", "edit");
    validateActionArguments("moveShipmentAction", { id, input });
    const low = await moveShipment(id, input, user.id);
    await createActivityLog({ user_id: user.id, action: "update", entity_type: "shipment", entity_id: id, details: { status: input.to, reason: input.reason ?? null } });
    await notifyLowStock(low);
    revalidatePath(ROUTES.delivery.shipments);
    revalidatePath(ROUTES.delivery.shipment(id));
    revalidatePath(ROUTES.orders.list);
    return { success: true };
  });
}

export async function saveDeliverySettingsAction(input: DeliverySettingsInput) {
  return measureOperation("action:saveDeliverySettingsAction", async () => {
    await requireFeatureEnabled("delivery");
    const user = await requirePermission("settings", "edit");
    validateActionArguments("saveDeliverySettingsAction", { input });
    await saveDeliverySettings(input);
    await createActivityLog({ user_id: user.id, action: "update", entity_type: "settings", entity_id: "delivery", details: {} });
    revalidatePath(ROUTES.delivery.settings);
    return { success: true };
  });
}

export async function saveDeliveryZoneAction(input: DeliveryZoneInput) {
  return measureOperation("action:saveDeliveryZoneAction", async () => {
    await requireFeatureEnabled("delivery");
    const user = await requirePermission("settings", "edit");
    validateActionArguments("saveDeliveryZoneAction", { input });
    const zone = await saveDeliveryZone(input);
    await createActivityLog({ user_id: user.id, action: input.id ? "update" : "create", entity_type: "delivery_zone", entity_id: zone.id, details: { name: zone.nameEn } });
    revalidatePath(ROUTES.delivery.settings);
    return { success: true };
  });
}

export async function saveDeliverySlotAction(input: DeliverySlotInput) {
  return measureOperation("action:saveDeliverySlotAction", async () => {
    await requireFeatureEnabled("delivery");
    const user = await requirePermission("settings", "edit");
    validateActionArguments("saveDeliverySlotAction", { input });
    await saveDeliverySlot(input);
    await createActivityLog({ user_id: user.id, action: "update", entity_type: "settings", entity_id: "delivery_slots", details: { start: input.start, end: input.end } });
    revalidatePath(ROUTES.delivery.settings);
    return { success: true };
  });
}

export async function deleteDeliverySlotAction(id: string) {
  return measureOperation("action:deleteDeliverySlotAction", async () => {
    await requireFeatureEnabled("delivery");
    const user = await requirePermission("settings", "edit");
    validateActionArguments("deleteDeliverySlotAction", { id });
    await deleteDeliverySlot(id);
    await createActivityLog({ user_id: user.id, action: "delete", entity_type: "settings", entity_id: "delivery_slots", details: { id } });
    revalidatePath(ROUTES.delivery.settings);
    return { success: true };
  });
}

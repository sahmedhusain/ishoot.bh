"use server";
import { revalidatePath } from "next/cache";
import { serverMessages } from "@platform/locales";
import {
  assignShipment,
  claimUpload,
  closeRouteSheet,
  createActivityLog,
  createRouteSheet,
  saveDeliveryProof,
  saveVehicle,
  settleCash,
  startRouteSheet,
  handToAgency,
  recordAgencyInvoice,
  saveCourierAgency,
  type AgencyInvoiceInput,
  type CourierAgencyInput,
  type HandToAgencyInput,
  type RouteSheetInput,
  type VehicleInput,
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
import { requireShipmentAccess } from "../../lib/delivery-scope";
import { validateActionArguments } from "../../lib/action-input";
import { notifyLowStock } from "../../lib/low-stock";

/** Moves a shipment on (out for delivery, delivered, failed with a reason, returned); the order follows. */
export async function moveShipmentAction(id: string, input: MoveShipmentInput) {
  return measureOperation("action:moveShipmentAction", async () => {
    await requireFeatureEnabled("delivery");
    const { user } = await requireShipmentAccess(id, "edit");
    validateActionArguments("moveShipmentAction", { id, input });
    const low = await moveShipment(id, input, user.id);
    await createActivityLog({
      user_id: user.id,
      action: "update",
      entity_type: "shipment",
      entity_id: id,
      details: { status: input.to, reason: input.reason ?? null },
    });
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
    await createActivityLog({
      user_id: user.id,
      action: "update",
      entity_type: "settings",
      entity_id: "delivery",
      details: {},
    });
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
    await createActivityLog({
      user_id: user.id,
      action: input.id ? "update" : "create",
      entity_type: "delivery_zone",
      entity_id: zone.id,
      details: { name: zone.nameEn },
    });
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
    await createActivityLog({
      user_id: user.id,
      action: "update",
      entity_type: "settings",
      entity_id: "delivery_slots",
      details: { start: input.start, end: input.end },
    });
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
    await createActivityLog({
      user_id: user.id,
      action: "delete",
      entity_type: "settings",
      entity_id: "delivery_slots",
      details: { id },
    });
    revalidatePath(ROUTES.delivery.settings);
    return { success: true };
  });
}

const refreshShipment = (id: string) => {
  revalidatePath(ROUTES.delivery.shipments);
  revalidatePath(ROUTES.delivery.shipment(id));
  revalidatePath(ROUTES.delivery.driver);
};

export async function assignShipmentAction(
  id: string,
  input: { driverId: string; vehicleId?: string },
) {
  return measureOperation("action:assignShipmentAction", async () => {
    await requireFeatureEnabled("delivery");
    const user = await requirePermission("deliveries", "assign");
    validateActionArguments("assignShipmentAction", { id, input });
    await assignShipment(id, input, user.id);
    await createActivityLog({
      user_id: user.id,
      action: "assign",
      entity_type: "shipment",
      entity_id: id,
      details: { driverId: input.driverId || null },
    });
    refreshShipment(id);
    return { success: true };
  });
}

/**
 * The driver hands the goods over: a photo (uploaded beforehand and claimed here as the shipment's attachment)
 * and/or the customer's signature, and the cash collected.
 */
export async function completeDeliveryAction(
  id: string,
  input: { photoUrl?: string; signature?: string; codCollected: string },
) {
  return measureOperation("action:completeDeliveryAction", async () => {
    await requireFeatureEnabled("delivery");
    const { user } = await requireShipmentAccess(id, "edit");
    validateActionArguments("completeDeliveryAction", { id, input });
    if (!input.photoUrl && !input.signature)
      throw new Error(serverMessages.deliveryProofRequired);
    if (input.photoUrl) {
      await claimUpload(input.photoUrl, user.id);
    }
    await saveDeliveryProof(id, {
      photoUrl: input.photoUrl || null,
      signature: input.signature || null,
    });
    const low = await moveShipment(
      id,
      { to: "delivered", codCollected: Number(input.codCollected) || 0 },
      user.id,
    );
    await createActivityLog({
      user_id: user.id,
      action: "update",
      entity_type: "shipment",
      entity_id: id,
      details: {
        status: "delivered",
        photo: !!input.photoUrl,
        signature: !!input.signature,
      },
    });
    await notifyLowStock(low);
    refreshShipment(id);
    return { success: true };
  });
}

export async function saveVehicleAction(input: VehicleInput) {
  return measureOperation("action:saveVehicleAction", async () => {
    await requireFeatureEnabled("delivery");
    const user = await requirePermission("deliveries", "assign");
    validateActionArguments("saveVehicleAction", { input });
    const vehicle = await saveVehicle(input);
    await createActivityLog({
      user_id: user.id,
      action: input.id ? "update" : "create",
      entity_type: "vehicle",
      entity_id: vehicle.id,
      details: { plate: vehicle.plate },
    });
    revalidatePath(ROUTES.delivery.fleet);
    return { success: true };
  });
}

export async function createRouteSheetAction(input: RouteSheetInput) {
  return measureOperation("action:createRouteSheetAction", async () => {
    await requireFeatureEnabled("delivery");
    const user = await requirePermission("deliveries", "assign");
    validateActionArguments("createRouteSheetAction", { input });
    const sheet = await createRouteSheet(input, user.id);
    await createActivityLog({
      user_id: user.id,
      action: "create",
      entity_type: "route_sheet",
      entity_id: sheet.id,
      details: { number: sheet.number, stops: input.shipmentIds.length },
    });
    revalidatePath(ROUTES.delivery.routes);
    return { success: true, id: sheet.id };
  });
}

export async function startRouteSheetAction(id: string) {
  return measureOperation("action:startRouteSheetAction", async () => {
    await requireFeatureEnabled("delivery");
    const user = await requirePermission("deliveries", "assign");
    validateActionArguments("startRouteSheetAction", { id });
    const low = await startRouteSheet(id, user.id);
    await createActivityLog({
      user_id: user.id,
      action: "update",
      entity_type: "route_sheet",
      entity_id: id,
      details: { status: "out" },
    });
    await notifyLowStock(low);
    revalidatePath(ROUTES.delivery.route(id));
    revalidatePath(ROUTES.delivery.shipments);
    return { success: true };
  });
}

export async function closeRouteSheetAction(id: string) {
  return measureOperation("action:closeRouteSheetAction", async () => {
    await requireFeatureEnabled("delivery");
    const user = await requirePermission("deliveries", "assign");
    validateActionArguments("closeRouteSheetAction", { id });
    await closeRouteSheet(id);
    await createActivityLog({
      user_id: user.id,
      action: "update",
      entity_type: "route_sheet",
      entity_id: id,
      details: { status: "closed" },
    });
    revalidatePath(ROUTES.delivery.route(id));
    return { success: true };
  });
}

/** A driver hands over (or an agency remits) the cash collected; each order is marked paid with what was collected on it. */
export async function settleCashAction(input: {
  source: string;
  shipmentIds: string[];
  received: string;
  note: string;
}) {
  return measureOperation("action:settleCashAction", async () => {
    await requireFeatureEnabled("delivery");
    const user = await requirePermission("deliveries", "assign");
    await requirePermission("payments", "create");
    validateActionArguments("settleCashAction", { input });
    const result = await settleCash(
      {
        source: input.source,
        shipmentIds: input.shipmentIds,
        received: Number(input.received),
        note: input.note,
      },
      user.id,
    );
    await createActivityLog({
      user_id: user.id,
      action: "payment",
      entity_type: "cod_settlement",
      entity_id: result.id,
      details: {
        number: result.number,
        expected: result.expected,
        received: result.received,
      },
    });
    revalidatePath(ROUTES.delivery.cash);
    revalidatePath(ROUTES.orders.list);
    return { success: true, ...result };
  });
}

export async function saveCourierAgencyAction(input: CourierAgencyInput) {
  return measureOperation("action:saveCourierAgencyAction", async () => {
    await requireFeatureEnabled("delivery");
    const user = await requirePermission("deliveries", "assign");
    validateActionArguments("saveCourierAgencyAction", { input });
    const agency = await saveCourierAgency(input);
    await createActivityLog({
      user_id: user.id,
      action: input.id ? "update" : "create",
      entity_type: "courier_agency",
      entity_id: agency.id,
      details: { name: agency.name },
    });
    revalidatePath(ROUTES.delivery.agencies);
    return { success: true };
  });
}

/** Gives a shipment to a courier agency: booked through its API when it has one, else with the tracking number given. */
export async function handToAgencyAction(id: string, input: HandToAgencyInput): Promise<{
  success: boolean;
  trackingNumber: string;
  needsAttention?: boolean;
  labelUnavailable?: boolean;
  [key: string]: any;
}> {
  return measureOperation("action:handToAgencyAction", async () => {
    await requireFeatureEnabled("delivery");
    const user = await requirePermission("deliveries", "assign");
    validateActionArguments("handToAgencyAction", { id, input });
    const result = await handToAgency(id, input, user.id);
    await createActivityLog({
      user_id: user.id,
      action: "assign",
      entity_type: "shipment",
      entity_id: id,
      details: {
        agencyId: input.agencyId,
        trackingNumber: result.trackingNumber,
        weightKg: input.weightKg,
        lengthCm: input.lengthCm,
        widthCm: input.widthCm,
        heightCm: input.heightCm,
        reconciledRetry: !!input.confirmNoBooking,
      },
    });
    refreshShipment(id);
    return { success: true, ...result };
  });
}

/** Records a courier agency's invoice for the shipments it covers, as a delivery expense. */
export async function recordAgencyInvoiceAction(input: AgencyInvoiceInput) {
  return measureOperation("action:recordAgencyInvoiceAction", async () => {
    await requireFeatureEnabled("delivery");
    const user = await requirePermission("deliveries", "assign");
    await requirePermission("expenses", "create");
    validateActionArguments("recordAgencyInvoiceAction", { input });
    const invoice = await recordAgencyInvoice(input, user.id);
    await createActivityLog({
      user_id: user.id,
      action: "create",
      entity_type: "agency_invoice",
      entity_id: invoice.id,
      details: { reference: invoice.reference, amount: input.amount },
    });
    revalidatePath(ROUTES.delivery.agencies);
    return { success: true };
  });
}

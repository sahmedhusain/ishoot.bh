import { serverMessages } from "@platform/locales";
import { listOrders } from "../api/commerce";
import {
  assignShipmentDriver,
  createRouteSheet as createRouteSheetApi,
  createVehicle,
  getShipment,
  listCODSettlementsApi,
  listCourierAgenciesApi,
  listDeliveryZones,
  listRouteSheets as listRouteSheetsApi,
  listShipmentsEnriched,
  listVehicles as listVehiclesApi,
  recordProofOfDelivery,
  saveCODSettlementApi,
  updateRouteSheetStatusApi,
} from "../api/delivery";
import { listEmployees, listHRUsers } from "../api/hr";
import {
  VEHICLE_KINDS,
} from "../constants/delivery";
import { moveShipment } from "./shipments";
import { recordOrderPayment } from "./store";

const num = (value: unknown) => (value == null ? 0 : Number(value));
const round3 = (value: number) => Math.round(value * 1000) / 1000;

type Named = {
  firstNameEn?: string | null;
  lastNameEn?: string | null;
  firstNameAr?: string | null;
  lastNameAr?: string | null;
};
const nameEn = (e: Named) => `${e.firstNameEn ?? ""} ${e.lastNameEn ?? ""}`.trim();
const nameAr = (e: Named) =>
  `${e.firstNameAr ?? ""} ${e.lastNameAr ?? ""}`.trim() || nameEn(e);

const DRIVER_ROLES = new Set(["driver", "delivery_coordinator"]);

export async function listDrivers() {
  const [employees, users] = await Promise.all([
    listEmployees().catch(() => []),
    listHRUsers().catch(() => []),
  ]);
  const userById = new Map((users as any[]).map((u) => [u.id, u]));
  return (employees as any[])
    .filter((e) => {
      if (e.status !== "active") return false;
      const u = e.userId ? userById.get(e.userId) : null;
      return !!u && u.isActive !== false && DRIVER_ROLES.has(u.role);
    })
    .sort((a, b) => nameEn(a).localeCompare(nameEn(b)))
    .map((e) => ({
      id: e.id as string,
      name_en: nameEn(e),
      name_ar: nameAr(e),
      phone: (e.phone ?? "") as string,
    }));
}
export type DriverOption = Awaited<ReturnType<typeof listDrivers>>[number];

export async function employeeIdForUser(userId: string) {
  const employees = await listEmployees().catch(() => []);
  return (employees as any[]).find((e) => e.userId === userId)?.id ?? null;
}

export async function listVehicles() {
  const rows = await listVehiclesApi().catch(() => []);
  return (rows as any[])
    .map((v) => ({
      id: v.id as string,
      plate: v.plateNumber ?? v.plate ?? "",
      name: v.name ?? "",
      kind: v.vehicleType ?? v.kind ?? "van",
      notes: v.notes ?? "",
      is_active: v.isActive ?? true,
    }))
    .sort((a, b) => Number(b.is_active) - Number(a.is_active) || a.name.localeCompare(b.name));
}
export type VehicleRecord = Awaited<ReturnType<typeof listVehicles>>[number];

export interface VehicleInput {
  id?: string;
  plate: string;
  name: string;
  kind: string;
  notes: string;
  isActive: boolean;
}

export async function saveVehicle(input: VehicleInput) {
  const plate = input.plate.trim().toUpperCase().replace(/\s+/g, " ").slice(0, 30);
  const name = input.name.trim().slice(0, 120);
  if (!plate || !name || !(VEHICLE_KINDS as readonly string[]).includes(input.kind)) {
    throw new Error(serverMessages.vehicleInvalid);
  }
  const existing = await listVehiclesApi().catch(() => []);
  const clash = (existing as any[]).find(
    (v) => (v.plateNumber ?? v.plate) === plate && v.id !== input.id,
  );
  if (clash) throw new Error(serverMessages.vehiclePlateTaken);
  return createVehicle({
    ...(input.id ? { id: input.id } : {}),
    plateNumber: plate,
    name,
    vehicleType: input.kind,
    isActive: input.isActive,
  } as any);
}

export async function assignShipment(
  id: string,
  input: { driverId: string; vehicleId?: string },
  _byId: string | null,
) {
  if (input.driverId) {
    const drivers = await listDrivers();
    if (!drivers.some((d) => d.id === input.driverId)) {
      throw new Error(serverMessages.driverNotFound);
    }
  }
  return assignShipmentDriver(id, {
    driverId: input.driverId,
    vehicleId: input.vehicleId,
  });
}

export type RouteSheetInput = {
  driverId: string;
  vehicleId?: string | null;
  zoneId?: string | null;
  shipmentIds: string[];
  notes?: string;
};
export type RouteSheetRecord = NonNullable<Awaited<ReturnType<typeof getRouteSheet>>>;
export type CashToSettle = Awaited<ReturnType<typeof cashToSettle>>[number];
export type DriverStop = Awaited<ReturnType<typeof driverShipments>>[number];

export async function createRouteSheet(
  input: RouteSheetInput,
  _byId: string | null,
) {
  return createRouteSheetApi({
    driverId: input.driverId,
    vehicleId: input.vehicleId ?? undefined,
    zoneId: input.zoneId ?? undefined,
    status: "planned",
    notes: input.notes,
  } as any);
}

export async function routableShipments() {
  const [rows, zones] = await Promise.all([
    listShipmentsEnriched().catch(() => []),
    listDeliveryZones().catch(() => []),
  ]);
  const zoneMap = new Map<string, any>((zones as any[]).map((z) => [z.id, z]));
  return (rows as any[])
    .filter((s) => ["pending", "assigned", "packed"].includes(s.status))
    .map((s) => {
      const z = s.zoneId ? zoneMap.get(s.zoneId) : null;
      return {
        id: s.id,
        number: s.shipmentNumber ?? s.number ?? s.id,
        recipient: s.recipientName ?? "",
        recipient_name: s.recipientName ?? "",
        area: s.area ?? "",
        zone_en: z?.nameEn ?? "",
        zone_ar: z?.nameAr ?? "",
        slot: s.slot ?? null,
        promised_by: s.promisedBy ?? null,
        status: s.status,
        zone_id: s.zoneId ?? null,
        order_number: s.orderNumber ?? "",
        cod_amount: num(s.codAmount),
      };
    });
}

export async function listRouteSheets(driverId?: string) {
  const [sheets, drivers, vehicles, zones, shipments] = await Promise.all([
    listRouteSheetsApi().catch(() => []),
    listEmployees().catch(() => []),
    listVehiclesApi().catch(() => []),
    listDeliveryZones().catch(() => []),
    listShipmentsEnriched().catch(() => []),
  ]);
  const driverMap = new Map((drivers as any[]).map((d) => [d.id, d]));
  const vehicleMap = new Map((vehicles as any[]).map((v) => [v.id, v]));
  const zoneMap = new Map((zones as any[]).map((z) => [z.id, z]));
  const countByRoute = new Map<string, number>();
  const deliveredByRoute = new Map<string, number>();
  for (const s of shipments as any[]) {
    if (s.routeSheetId) {
      countByRoute.set(s.routeSheetId, (countByRoute.get(s.routeSheetId) ?? 0) + 1);
      if (s.status === "delivered") {
        deliveredByRoute.set(
          s.routeSheetId,
          (deliveredByRoute.get(s.routeSheetId) ?? 0) + 1,
        );
      }
    }
  }
  return (sheets as any[])
    .filter((r) => !driverId || r.driverId === driverId)
    .map((r) => {
      const d = r.driverId ? driverMap.get(r.driverId) : null;
      const v = r.vehicleId ? vehicleMap.get(r.vehicleId) : null;
      const z = r.zoneId ? zoneMap.get(r.zoneId) : null;
      const date = r.plannedDate ?? r.createdAt ?? new Date().toISOString();
      return {
        id: r.id,
        number: r.sheetNumber ?? r.number ?? r.id,
        status: r.status,
        driver_id: r.driverId ?? null,
        driver_en: d ? nameEn(d) : "",
        driver_ar: d ? nameAr(d) : "",
        vehicle: v ? `${v.name} (${v.plateNumber ?? ""})` : "",
        zone: z?.nameEn ?? "",
        stops: countByRoute.get(r.id) ?? 0,
        delivered: deliveredByRoute.get(r.id) ?? 0,
        date,
        planned_date: date,
      };
    });
}

export async function getRouteSheet(id: string) {
  const [sheets, shipments, drivers, vehicles] = await Promise.all([
    listRouteSheetsApi().catch(() => []),
    listShipmentsEnriched().catch(() => []),
    listEmployees().catch(() => []),
    listVehiclesApi().catch(() => []),
  ]);
  const sheet = (sheets as any[]).find((s) => s.id === id);
  if (!sheet) return null;
  const driver = sheet.driverId
    ? (drivers as any[]).find((d) => d.id === sheet.driverId)
    : null;
  const vehicle = sheet.vehicleId
    ? (vehicles as any[]).find((v) => v.id === sheet.vehicleId)
    : null;
  const driverEn = driver ? nameEn(driver) : "";
  const driverAr = driver ? nameAr(driver) : "";
  const stops = (shipments as any[])
    .filter((s) => s.routeSheetId === id)
    .map((s, idx) => ({
      id: String(s.id),
      stop: s.stopOrder ?? idx + 1,
      recipient: String(s.recipientName ?? ""),
      phone: String(s.recipientPhone ?? ""),
      status: String(s.status ?? "pending"),
      currency: String(s.currency ?? "BHD"),
      cod_amount: num(s.codAmount),
      address: (s.address && typeof s.address === "object" ? s.address : {}) as {
        line1?: string;
        line2?: string;
        area?: string;
        city?: string;
      },
      slot:
        s.slotStart && s.slotEnd
          ? { start: String(s.slotStart), end: String(s.slotEnd) }
          : (s.slot ?? null),
      items: Array.isArray(s.items)
        ? (s.items as Array<{ description: string; quantity: number }>)
        : [],
    }));
  return {
    ...sheet,
    number: String(sheet.sheetNumber ?? sheet.number ?? sheet.id),
    date: String(sheet.runDate ?? sheet.plannedDate ?? sheet.createdAt ?? new Date().toISOString()),
    note: String(sheet.note ?? sheet.notes ?? ""),
    driver: { name_en: driverEn, name_ar: driverAr },
    driver_en: driverEn,
    driver_ar: driverAr,
    vehicle: vehicle?.name ?? "",
    stops,
  };
}

export async function startRouteSheet(id: string, _byId: string | null) {
  return updateRouteSheetStatusApi(id, "in_progress");
}

export async function closeRouteSheet(id: string) {
  return updateRouteSheetStatusApi(id, "completed");
}

export async function driverShipments(driverId: string) {
  const rows = await listShipmentsEnriched({ driverId }).catch(() => []);
  return (rows as any[]).map((s, idx) => ({
    id: s.id,
    number: s.shipmentNumber ?? s.number ?? s.id,
    order_number: s.orderNumber ?? "",
    stop: s.stopOrder ?? idx + 1,
    recipient: s.recipientName ?? "",
    recipient_name: s.recipientName ?? "",
    phone: s.recipientPhone ?? "",
    recipient_phone: s.recipientPhone ?? "",
    currency: s.currency ?? "BHD",
    address: s.address ?? {
      line1: s.addressLine1 ?? "",
      line2: s.addressLine2 ?? "",
      area: s.area ?? "",
      city: s.city ?? "",
      country: s.country ?? "",
    },
    items: Array.isArray(s.items) ? s.items : [],
    slot: s.slot ?? null,
    status: s.status,
    cod_amount: num(s.codAmount),
    promised_by: s.promisedBy ?? null,
  }));
}

export async function saveDeliveryProof(
  id: string,
  input: {
    photoUrl?: string | null;
    signature?: string | null;
    signatureUrl?: string | null;
    note?: string;
    codCollected?: number;
  },
  _byId: string | null = null,
) {
  await recordProofOfDelivery(id, {
    proofPhotoUrl: input.photoUrl ?? undefined,
    proofSignature: (input.signatureUrl ?? input.signature) ?? undefined,
  });
  if (input.codCollected != null) {
    await moveShipment(
      id,
      { to: "delivered", codCollected: input.codCollected, note: input.note },
      _byId,
    );
  }
  return getShipment(id);
}

export async function cashToSettle() {
  const [shipments, drivers, agencies] = await Promise.all([
    listShipmentsEnriched({ status: "delivered" }).catch(() => []),
    listEmployees().catch(() => []),
    listCourierAgenciesApi().catch(() => []),
  ]);
  const driverMap = new Map<string, any>((drivers as any[]).map((d) => [d.id, d]));
  const agencyMap = new Map<string, any>((agencies as any[]).map((a) => [a.id, a]));
  const grouped = new Map<
    string,
    {
      source: string;
      kind: "driver" | "agency";
      name_en: string;
      name_ar: string;
      total: number;
      shipments: Array<{
        id: string;
        number: string;
        order_number: string;
        delivered_at: string;
        amount: number;
      }>;
    }
  >();
  for (const s of shipments as any[]) {
    if (s.codSettlementId || num(s.codCollected) <= 0) continue;
    const kind: "driver" | "agency" = s.driverId ? "driver" : "agency";
    const id = s.driverId ?? s.agencyId ?? "";
    if (!id) continue;
    const source = `${kind}:${id}`;
    const d = s.driverId ? driverMap.get(s.driverId) : null;
    const a = s.agencyId ? agencyMap.get(s.agencyId) : null;
    const existing = grouped.get(source) ?? {
      source,
      kind,
      name_en: d ? nameEn(d) : (a?.nameEn ?? a?.name ?? ""),
      name_ar: d ? nameAr(d) : (a?.nameAr ?? a?.name ?? ""),
      total: 0,
      shipments: [] as Array<{
        id: string;
        number: string;
        order_number: string;
        delivered_at: string;
        amount: number;
      }>,
    };
    const amount = round3(num(s.codCollected));
    existing.total = round3(existing.total + amount);
    existing.shipments.push({
      id: s.id,
      number: s.shipmentNumber ?? s.id,
      order_number: s.orderNumber ?? "",
      delivered_at: s.deliveredAt ?? s.updatedAt ?? "",
      amount,
    });
    grouped.set(source, existing);
  }
  return Array.from(grouped.values());
}

export async function settleCash(
  input: {
    source?: string;
    sourceKind?: "driver" | "agency";
    sourceId?: string;
    shipmentIds: string[];
    received: number;
    note?: string;
  },
  byId: string | null,
) {
  const [parsedKind, parsedId] = (input.source ?? "").includes(":")
    ? (input.source!.split(":") as ["driver" | "agency", string])
    : [input.sourceKind ?? "driver", input.sourceId ?? input.source ?? ""];
  const resolvedInput = {
    sourceKind: input.sourceKind ?? parsedKind,
    sourceId: input.sourceId ?? parsedId,
  };
  const received = round3(Number(input.received));
  if (!Number.isFinite(received) || received < 0 || !resolvedInput.sourceId) {
    throw new Error(serverMessages.codSettlementInvalid);
  }
  const allShipments = await listShipmentsEnriched({ status: "delivered" }).catch(() => []);
  const ids = new Set(input.shipmentIds);
  const matched = (allShipments as any[]).filter((s) => ids.has(s.id));
  if (!matched.length) throw new Error(serverMessages.codSettlementInvalid);
  const expected = round3(matched.reduce((sum, s) => sum + num(s.codCollected), 0));

  const settlement = await saveCODSettlementApi({
    driverId: resolvedInput.sourceKind === "driver" ? resolvedInput.sourceId : null,
    amountCollected: expected,
    amountSettled: received,
    status: "settled",
    settledAt: new Date().toISOString(),
  });

  const orders = await listOrders().catch(() => []);
  const owed = new Map<string, number>(
    (orders as any[]).map((o) => [o.id, num(o.total) - num(o.amountPaid)]),
  );
  for (const s of matched) {
    const orderOwed = owed.get(s.orderId);
    if (orderOwed == null) continue;
    const amount = round3(Math.min(num(s.codCollected), orderOwed));
    owed.set(s.orderId, orderOwed - Math.max(amount, 0));
    if (amount > 0) {
      await recordOrderPayment(
        s.orderId,
        {
          amount,
          method: input.sourceKind === "agency" ? "bank_transfer" : "cash",
          reference: settlement.id,
        },
        byId,
      );
    }
  }
  return {
    id: settlement.id,
    number: settlement.id,
    expected,
    received,
    difference: round3(received - expected),
  };
}

export async function listCodSettlements() {
  const [rows, drivers] = await Promise.all([
    listCODSettlementsApi().catch(() => []),
    listEmployees().catch(() => []),
  ]);
  const driverMap = new Map((drivers as any[]).map((d) => [d.id, d]));
  return (rows as any[]).map((r) => {
    const d = r.driverId ? driverMap.get(r.driverId) : null;
    return {
      id: r.id,
      number: r.id,
      driver_en: d ? nameEn(d) : "",
      driver_ar: d ? nameAr(d) : "",
      expected: num(r.amountCollected),
      received: num(r.amountSettled),
      difference: round3(num(r.amountSettled) - num(r.amountCollected)),
      shipments: 0,
      settled_at: r.settledAt ?? r.createdAt ?? new Date().toISOString(),
      note: "",
    };
  });
}

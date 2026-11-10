import { serverMessages } from "@platform/locales";
import { db } from "../atomic";
import { getNextSequenceNumber } from "./sequence";
import { moveShipment } from "./shipments";
import { recordOrderPayment, type OrderAddress } from "./store";
import { validateSignatureImage } from "../services/signature-image";
import { Database } from "@platform/database/decimal";
import {
  VEHICLE_KINDS,
  UNRESOLVED_COURIER_BOOKINGS,
} from "../constants/delivery";

const num = (value: { toString(): string } | null | undefined) =>
  value == null ? 0 : Number(value.toString());
const round3 = (value: number) => Math.round(value * 1000) / 1000;
const NAME = {
  firstNameEn: true,
  lastNameEn: true,
  firstNameAr: true,
  lastNameAr: true,
} as const;
type Named = {
  firstNameEn: string;
  lastNameEn: string;
  firstNameAr: string;
  lastNameAr: string;
};
const nameEn = (e: Named) => `${e.firstNameEn} ${e.lastNameEn}`.trim();
const nameAr = (e: Named) =>
  `${e.firstNameAr} ${e.lastNameAr}`.trim() || nameEn(e);

const DRIVER_ROLES = ["driver", "delivery_coordinator"];

export async function listDrivers() {
  const rows = await db.employee.findMany({
    where: {
      status: "active",
      user: { role: { in: DRIVER_ROLES }, isActive: true },
    },
    orderBy: [{ firstNameEn: "asc" }, { lastNameEn: "asc" }],
    select: { id: true, ...NAME, phone: true },
  });
  return rows.map((e) => ({
    id: e.id,
    name_en: nameEn(e),
    name_ar: nameAr(e),
    phone: e.phone ?? "",
  }));
}
export type DriverOption = Awaited<ReturnType<typeof listDrivers>>[number];

export async function employeeIdForUser(userId: string) {
  return (
    (await db.employee.findUnique({ where: { userId }, select: { id: true } }))
      ?.id ?? null
  );
}

export async function listVehicles() {
  const rows = await db.vehicle.findMany({
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });
  return rows.map((v) => ({
    id: v.id,
    plate: v.plate,
    name: v.name,
    kind: v.kind,
    notes: v.notes ?? "",
    is_active: v.isActive,
  }));
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
  const plate = input.plate
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ")
    .slice(0, 30);
  const name = input.name.trim().slice(0, 120);
  if (
    !plate ||
    !name ||
    !(VEHICLE_KINDS as readonly string[]).includes(input.kind)
  )
    throw new Error(serverMessages.vehicleInvalid);
  const clash = await db.vehicle.findFirst({
    where: { plate, ...(input.id ? { id: { not: input.id } } : {}) },
    select: { id: true },
  });
  if (clash) throw new Error(serverMessages.vehiclePlateTaken);
  const data = {
    plate,
    name,
    kind: input.kind,
    notes: input.notes.trim().slice(0, 500) || null,
    isActive: input.isActive,
  };
  return input.id
    ? db.vehicle.update({ where: { id: input.id }, data })
    : db.vehicle.create({ data });
}

async function requireDriver(driverId: string) {
  const driver = await db.employee.findFirst({
    where: {
      id: driverId,
      status: "active",
      user: { role: { in: DRIVER_ROLES } },
    },
    select: { id: true },
  });
  if (!driver) throw new Error(serverMessages.driverNotFound);
}

export async function assignShipment(
  id: string,
  input: { driverId: string; vehicleId?: string },
  byId: string | null,
) {
  if (input.driverId) await requireDriver(input.driverId);
  await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Shipment" WHERE id = ${id} FOR UPDATE`;
    const shipment = await tx.shipment.findUnique({
      where: { id },
      select: { status: true, courierBookingStatus: true },
    });
    if (
      !shipment ||
      !["pending", "assigned", "failed"].includes(shipment.status)
    )
      throw new Error(serverMessages.shipmentStatusInvalid);
    if (
      UNRESOLVED_COURIER_BOOKINGS.some(
        (status) => status === shipment.courierBookingStatus,
      )
    )
      throw new Error(serverMessages.courierBookingUncertain);
    const next = input.driverId
      ? shipment.status === "pending"
        ? "assigned"
        : shipment.status
      : "pending";
    await tx.shipment.update({
      where: { id },
      data: {
        driverId: input.driverId || null,
        vehicleId: input.vehicleId || null,
        status: next,
        method: "own",
      },
    });
    await tx.shipmentEvent.create({
      data: { shipmentId: id, status: next, byId },
    });
  });
}

const ROUTABLE = ["pending", "assigned", "failed"];

export interface RouteSheetInput {
  date: string;
  driverId: string;
  vehicleId?: string;
  shipmentIds: string[];
  note?: string;
}

export async function createRouteSheet(
  input: RouteSheetInput,
  byId: string | null,
) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date) || !input.shipmentIds.length)
    throw new Error(serverMessages.routeSheetInvalid);
  await requireDriver(input.driverId);
  const ids = Array.from(new Set(input.shipmentIds)).slice(0, 200);
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Shipment" WHERE id IN (${Database.join(ids)}) ORDER BY id FOR UPDATE`;
    const shipments = await tx.shipment.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        status: true,
        courierBookingStatus: true,
        routeSheet: { select: { status: true } },
      },
    });
    if (
      shipments.length !== ids.length ||
      shipments.some(
        (s) =>
          UNRESOLVED_COURIER_BOOKINGS.some(
            (status) => status === s.courierBookingStatus,
          ) ||
          !ROUTABLE.includes(s.status) ||
          (s.routeSheet && s.routeSheet.status !== "closed"),
      )
    )
      throw new Error(serverMessages.routeSheetShipmentUnavailable);
    const number = await getNextSequenceNumber("RS", undefined, tx);
    const sheet = await tx.routeSheet.create({
      data: {
        number,
        date: new Date(`${input.date}T00:00:00Z`),
        driverId: input.driverId,
        vehicleId: input.vehicleId || null,
        note: input.note?.trim().slice(0, 500) || null,
        createdById: byId,
      },
    });
    for (let index = 0; index < ids.length; index++) {
      const id = ids[index];
      const current = shipments.find((s) => s.id === id)!;
      const status = current.status === "pending" ? "assigned" : current.status;
      await tx.shipment.update({
        where: { id },
        data: {
          routeSheetId: sheet.id,
          routeStop: index + 1,
          driverId: input.driverId,
          vehicleId: input.vehicleId || null,
          method: "own",
          status,
        },
      });
      if (status !== current.status)
        await tx.shipmentEvent.create({
          data: { shipmentId: id, status, byId },
        });
    }
    return sheet;
  });
}

export async function routableShipments() {
  const rows = await db.shipment.findMany({
    where: {
      status: { in: ROUTABLE },
      OR: [{ routeSheetId: null }, { routeSheet: { status: "closed" } }],
    },
    orderBy: [{ promisedBy: "asc" }],
    take: 300,
    include: { zone: { select: { nameEn: true, nameAr: true } } },
  });
  return rows.map((s) => ({
    id: s.id,
    number: s.number,
    status: s.status,
    recipient: s.recipientName,
    area: [
      (s.address as Partial<OrderAddress>).area,
      (s.address as Partial<OrderAddress>).city,
    ]
      .filter(Boolean)
      .join(", "),
    zone_en: s.zone?.nameEn ?? "",
    zone_ar: s.zone?.nameAr ?? "",
    slot: s.slotDate
      ? {
          date: s.slotDate.toISOString().slice(0, 10),
          start: s.slotStart ?? "",
          end: s.slotEnd ?? "",
        }
      : null,
    promised_by: s.promisedBy.toISOString(),
    driver_id: s.driverId ?? "",
  }));
}

export async function listRouteSheets(
  filters: { date?: string; driverId?: string } = {},
) {
  const rows = await db.routeSheet.findMany({
    where: {
      ...(filters.date && /^\d{4}-\d{2}-\d{2}$/.test(filters.date)
        ? { date: new Date(`${filters.date}T00:00:00Z`) }
        : {}),
      ...(filters.driverId ? { driverId: filters.driverId } : {}),
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take: 100,
    include: {
      driver: { select: NAME },
      vehicle: { select: { plate: true } },
      shipments: { select: { status: true } },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    number: r.number,
    date: r.date.toISOString().slice(0, 10),
    status: r.status,
    driver_en: nameEn(r.driver),
    driver_ar: nameAr(r.driver),
    vehicle: r.vehicle?.plate ?? "",
    stops: r.shipments.length,
    delivered: r.shipments.filter((s) => s.status === "delivered").length,
  }));
}

export async function getRouteSheet(id: string) {
  const r = await db.routeSheet.findUnique({
    where: { id },
    include: {
      driver: { select: { id: true, ...NAME, phone: true } },
      vehicle: { select: { plate: true, name: true } },
      shipments: {
        orderBy: { routeStop: "asc" },
        include: {
          order: {
            select: {
              number: true,
              currency: true,
              lines: {
                orderBy: { sortOrder: "asc" },
                select: { description: true, quantity: true },
              },
            },
          },
        },
      },
    },
  });
  if (!r) return null;
  return {
    id: r.id,
    number: r.number,
    date: r.date.toISOString().slice(0, 10),
    status: r.status,
    note: r.note ?? "",
    driver: {
      id: r.driver.id,
      name_en: nameEn(r.driver),
      name_ar: nameAr(r.driver),
      phone: r.driver.phone ?? "",
    },
    vehicle: r.vehicle ? `${r.vehicle.name} · ${r.vehicle.plate}` : "",
    stops: r.shipments.map((s) => ({
      id: s.id,
      stop: s.routeStop ?? 0,
      number: s.number,
      order_number: s.order.number,
      status: s.status,
      recipient: s.recipientName,
      phone: s.recipientPhone,
      address: s.address as Partial<OrderAddress>,
      slot: s.slotDate
        ? {
            date: s.slotDate.toISOString().slice(0, 10),
            start: s.slotStart ?? "",
            end: s.slotEnd ?? "",
          }
        : null,
      cod_amount: num(s.codAmount),
      cod_collected: num(s.codCollected),
      currency: s.order.currency,
      items: s.order.lines.map((l) => ({
        description: l.description,
        quantity: num(l.quantity),
      })),
    })),
  };
}
export type RouteSheetRecord = NonNullable<
  Awaited<ReturnType<typeof getRouteSheet>>
>;

export async function startRouteSheet(id: string, byId: string | null) {
  const sheet = await db.routeSheet.findUnique({
    where: { id },
    include: {
      shipments: {
        where: { status: { in: ["assigned", "failed", "pending"] } },
        select: { id: true },
      },
    },
  });
  if (!sheet || sheet.status !== "draft")
    throw new Error(serverMessages.routeSheetStatusInvalid);
  let low: Awaited<ReturnType<typeof moveShipment>> = [];
  for (const s of sheet.shipments)
    low = low.concat(
      await moveShipment(s.id, { to: "out_for_delivery" }, byId),
    );
  await db.routeSheet.update({ where: { id }, data: { status: "out" } });
  return low;
}

export async function closeRouteSheet(id: string) {
  const sheet = await db.routeSheet.findUnique({
    where: { id },
    include: {
      shipments: {
        where: { status: "out_for_delivery" },
        select: { id: true },
      },
    },
  });
  if (!sheet || sheet.status !== "out")
    throw new Error(serverMessages.routeSheetStatusInvalid);
  if (sheet.shipments.length)
    throw new Error(serverMessages.routeSheetStillOut);
  await db.routeSheet.update({ where: { id }, data: { status: "closed" } });
}

export async function driverShipments(driverId: string) {
  const rows = await db.shipment.findMany({
    where: {
      driverId,
      status: { in: ["assigned", "out_for_delivery", "failed"] },
    },
    orderBy: [
      { routeSheet: { date: "asc" } },
      { routeStop: "asc" },
      { promisedBy: "asc" },
    ],
    take: 100,
    include: {
      order: {
        select: {
          number: true,
          currency: true,
          lines: {
            orderBy: { sortOrder: "asc" },
            select: { description: true, quantity: true },
          },
        },
      },
    },
  });
  return rows.map((s) => ({
    id: s.id,
    number: s.number,
    order_number: s.order.number,
    status: s.status,
    stop: s.routeStop,
    recipient: s.recipientName,
    phone: s.recipientPhone,
    address: s.address as Partial<OrderAddress>,
    slot: s.slotDate
      ? {
          date: s.slotDate.toISOString().slice(0, 10),
          start: s.slotStart ?? "",
          end: s.slotEnd ?? "",
        }
      : null,
    promised_by: s.promisedBy.toISOString(),
    cod_amount: num(s.codAmount),
    currency: s.order.currency,
    items: s.order.lines.map((l) => ({
      description: l.description,
      quantity: num(l.quantity),
    })),
  }));
}
export type DriverStop = Awaited<ReturnType<typeof driverShipments>>[number];

export async function saveDeliveryProof(
  id: string,
  proof: { photoUrl?: string | null; signature?: string | null },
) {
  if (proof.signature) validateSignatureImage(proof.signature);
  await db.shipment.update({
    where: { id },
    data: {
      ...(proof.photoUrl ? { proofPhotoUrl: proof.photoUrl } : {}),
      ...(proof.signature ? { proofSignature: proof.signature } : {}),
    },
  });
}

export async function cashToSettle() {
  const rows = await db.shipment.findMany({
    where: {
      status: "delivered",
      codCollected: { gt: 0 },
      codSettlementId: null,
      OR: [
        { driverId: { not: null } },
        { agencyId: { not: null }, method: "agency" },
      ],
    },
    orderBy: { deliveredAt: "asc" },
    include: {
      driver: { select: { id: true, ...NAME } },
      agency: { select: { id: true, name: true } },
      order: { select: { number: true, currency: true } },
    },
  });
  const sources = new Map<
    string,
    {
      source: string;
      kind: "driver" | "agency";
      name_en: string;
      name_ar: string;
      total: number;
      currency: string;
      shipments: {
        id: string;
        number: string;
        order_number: string;
        amount: number;
        delivered_at: string;
      }[];
    }
  >();
  for (const s of rows) {
    const agency = s.method === "agency" && s.agency;
    const source = agency ? `agency:${s.agency!.id}` : `driver:${s.driverId}`;
    const entry =
      sources.get(source) ??
      (agency
        ? {
            source,
            kind: "agency" as const,
            name_en: s.agency!.name,
            name_ar: s.agency!.name,
          }
        : {
            source,
            kind: "driver" as const,
            name_en: nameEn(s.driver!),
            name_ar: nameAr(s.driver!),
          });
    const full = {
      total: 0,
      currency: s.order.currency,
      shipments: [] as {
        id: string;
        number: string;
        order_number: string;
        amount: number;
        delivered_at: string;
      }[],
      ...entry,
    };
    full.total = round3(full.total + num(s.codCollected));
    full.shipments.push({
      id: s.id,
      number: s.number,
      order_number: s.order.number,
      amount: num(s.codCollected),
      delivered_at: s.deliveredAt?.toISOString() ?? "",
    });
    sources.set(source, full);
  }
  return Array.from(sources.values());
}
export type CashToSettle = Awaited<ReturnType<typeof cashToSettle>>[number];

export async function settleCash(
  input: {
    source: string;
    shipmentIds: string[];
    received: number;
    note?: string;
  },
  byId: string | null,
) {
  const received = round3(input.received);
  const [kind, sourceId] = input.source.split(":");
  if (
    !Number.isFinite(received) ||
    received < 0 ||
    !sourceId ||
    (kind !== "driver" && kind !== "agency")
  )
    throw new Error(serverMessages.codSettlementInvalid);
  const ids = Array.from(new Set(input.shipmentIds));
  const shipments = await db.shipment.findMany({
    where: {
      id: { in: ids },
      ...(kind === "driver"
        ? { driverId: sourceId }
        : { agencyId: sourceId, method: "agency" }),
      status: "delivered",
      codSettlementId: null,
      codCollected: { gt: 0 },
    },
  });
  if (!ids.length || shipments.length !== ids.length)
    throw new Error(serverMessages.codSettlementInvalid);
  const expected = round3(
    shipments.reduce((sum, s) => sum + num(s.codCollected), 0),
  );
  const settlement = await db.$transaction(async (tx) => {
    const number = await getNextSequenceNumber("CS", undefined, tx);
    const created = await tx.codSettlement.create({
      data: {
        number,
        ...(kind === "driver"
          ? { driverId: sourceId }
          : { agencyId: sourceId }),
        expected,
        received,
        note: input.note?.trim().slice(0, 500) || null,
        settledById: byId,
      },
    });
    const claimed = await tx.shipment.updateMany({
      where: { id: { in: ids }, codSettlementId: null },
      data: { codSettlementId: created.id },
    });
    if (claimed.count !== ids.length)
      throw new Error(serverMessages.codSettlementInvalid);
    return created;
  });
  const owed = new Map<string, number>(
    (
      await db.salesOrder.findMany({
        where: { id: { in: Array.from(new Set(shipments.map((s) => s.orderId))) } },
        select: { id: true, total: true, amountPaid: true },
      })
    ).map((order: any) => [order.id, num(order.total) - num(order.amountPaid)]),
  );
  for (const s of shipments) {
    if (!owed.has(s.orderId)) throw new Error(serverMessages.codSettlementInvalid);
    const amount = round3(Math.min(num(s.codCollected), owed.get(s.orderId)!));
    owed.set(s.orderId, owed.get(s.orderId)! - Math.max(amount, 0));
    if (amount > 0)
      await recordOrderPayment(
        s.orderId,
        {
          amount,
          method: kind === "agency" ? "bank_transfer" : "cash",
          reference: settlement.number,
        },
        byId,
      );
  }
  return {
    id: settlement.id,
    number: settlement.number,
    expected,
    received,
    difference: round3(received - expected),
  };
}

export async function listCodSettlements() {
  const rows = await db.codSettlement.findMany({
    orderBy: { settledAt: "desc" },
    take: 50,
    include: {
      driver: { select: NAME },
      agency: { select: { name: true } },
      _count: { select: { shipments: true } },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    number: r.number,
    driver_en: r.driver ? nameEn(r.driver) : (r.agency?.name ?? ""),
    driver_ar: r.driver ? nameAr(r.driver) : (r.agency?.name ?? ""),
    expected: num(r.expected),
    received: num(r.received),
    difference: round3(num(r.received) - num(r.expected)),
    shipments: r._count.shipments,
    settled_at: r.settledAt.toISOString(),
    note: r.note ?? "",
  }));
}

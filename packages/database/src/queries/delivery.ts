import crypto from "node:crypto";
import { Prisma } from "@prisma/client";
import { serverMessages } from "@platform/locales";
import { db } from "../db";
import {
  DELIVERY_MODES,
  defaultTimeZone,
  isClockTime,
  isTimeZone,
  normalizeArea,
  promisedBy,
  upcomingSlots,
  zoneForAddress,
  type DeliveryMode,
} from "../constants/delivery";
import { isFeatureEnabled } from "./features";
import { getNextSequenceNumber } from "./sequence";

type Tx = Prisma.TransactionClient;
const num = (value: { toString(): string } | null | undefined) =>
  value == null ? 0 : Number(value.toString());
const numOrNull = (value: { toString(): string } | null | undefined) =>
  value == null ? null : Number(value.toString());
const roundStoredAmount = (value: number) => Math.round(value * 1_000_000) / 1_000_000;

// ─── Settings ────────────────────────────────────────────────────────────────────────────────────────────────────

async function settingsRow(client: Tx | typeof db = db) {
  return client.deliverySettings.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default" },
  });
}

/** The delivery time zone: the store's choice, else the company country's. */
async function timeZoneOf(
  row: { timeZone: string | null },
  client: Tx | typeof db = db,
) {
  if (row.timeZone) return row.timeZone;
  const company = await client.companySetting.findFirst({
    select: { country: true },
  });
  return defaultTimeZone(company?.country);
}

export async function getDeliverySettings() {
  const row = await settingsRow();
  return {
    mode: row.mode as DeliveryMode,
    sla_hours: row.slaHours,
    time_zone: row.timeZone ?? "",
    effective_time_zone: await timeZoneOf(row),
    slot_days: row.slotDays,
    lead_minutes: row.leadMinutes,
    require_slot: row.requireSlot,
  };
}
export type DeliverySettingsRecord = Awaited<
  ReturnType<typeof getDeliverySettings>
>;

export interface DeliverySettingsInput {
  mode: string;
  slaHours: string;
  timeZone: string;
  slotDays: string;
  leadMinutes: string;
  requireSlot: boolean;
}

export async function saveDeliverySettings(input: DeliverySettingsInput) {
  const whole = (text: string, min: number, max: number) => {
    const value = Number(text);
    if (!Number.isInteger(value) || value < min || value > max)
      throw new Error(serverMessages.deliverySettingsInvalid);
    return value;
  };
  if (!(DELIVERY_MODES as readonly string[]).includes(input.mode))
    throw new Error(serverMessages.deliverySettingsInvalid);
  const timeZone = input.timeZone.trim();
  if (timeZone && !isTimeZone(timeZone))
    throw new Error(serverMessages.deliveryTimeZoneInvalid);
  const data = {
    mode: input.mode,
    slaHours: whole(input.slaHours, 1, 720),
    timeZone: timeZone || null,
    slotDays: whole(input.slotDays, 1, 60),
    leadMinutes: whole(input.leadMinutes, 0, 10080),
    requireSlot: input.requireSlot,
  };
  await db.deliverySettings.upsert({
    where: { id: "default" },
    update: data,
    create: { id: "default", ...data },
  });
}

// ─── Zones and slots ─────────────────────────────────────────────────────────────────────────────────────────────

const zoneTerms = (z: {
  id: string;
  areas: string[];
  fee: Prisma.Decimal;
  minOrder: Prisma.Decimal | null;
  freeOver: Prisma.Decimal | null;
}) => ({
  id: z.id,
  areas: z.areas,
  fee: num(z.fee),
  minOrder: numOrNull(z.minOrder),
  freeOver: numOrNull(z.freeOver),
});

export async function listDeliveryZones() {
  const zones = await db.deliveryZone.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: { slots: { orderBy: [{ weekday: "asc" }, { start: "asc" }] } },
  });
  return zones.map((z) => ({
    id: z.id,
    name_en: z.nameEn,
    name_ar: z.nameAr,
    areas: z.areas,
    fee: num(z.fee),
    min_order: numOrNull(z.minOrder),
    free_over: numOrNull(z.freeOver),
    is_active: z.isActive,
    slots: z.slots.map((s) => ({
      id: s.id,
      weekday: s.weekday,
      start: s.start,
      end: s.end,
      capacity: s.capacity,
      is_active: s.isActive,
    })),
  }));
}
export type DeliveryZoneRecord = Awaited<
  ReturnType<typeof listDeliveryZones>
>[number];

export async function listSharedSlots() {
  const slots = await db.deliverySlot.findMany({
    where: { zoneId: null },
    orderBy: [{ weekday: "asc" }, { start: "asc" }],
  });
  return slots.map((s) => ({
    id: s.id,
    weekday: s.weekday,
    start: s.start,
    end: s.end,
    capacity: s.capacity,
    is_active: s.isActive,
  }));
}

export interface DeliveryZoneInput {
  id?: string;
  nameEn: string;
  nameAr: string;
  /** One area or city per line. */
  areas: string;
  fee: string;
  minOrder: string;
  freeOver: string;
  isActive: boolean;
}

export async function saveDeliveryZone(input: DeliveryZoneInput) {
  const money = (text: string, optional: boolean) => {
    if (!text.trim() && optional) return null;
    const value = Number(text || 0);
    if (!Number.isFinite(value) || value < 0 || value > 99_999_999)
      throw new Error(serverMessages.productAmountInvalid);
    return roundStoredAmount(value);
  };
  const nameEn = input.nameEn.trim().slice(0, 120);
  const nameAr = input.nameAr.trim().slice(0, 120);
  if (!nameEn && !nameAr)
    throw new Error(serverMessages.deliveryZoneNameRequired);
  const seen = new Set<string>();
  const areas = input.areas
    .split(/[\n,،]/)
    .map((a) => a.trim().slice(0, 80))
    .filter(
      (a) => a && !seen.has(normalizeArea(a)) && seen.add(normalizeArea(a)),
    )
    .slice(0, 300);
  const data = {
    nameEn: nameEn || nameAr,
    nameAr: nameAr || nameEn,
    areas,
    fee: money(input.fee, false)!,
    minOrder: money(input.minOrder, true),
    freeOver: money(input.freeOver, true),
    isActive: input.isActive,
  };
  if (input.id)
    return db.deliveryZone.update({ where: { id: input.id }, data });
  const last = await db.deliveryZone.aggregate({ _max: { sortOrder: true } });
  return db.deliveryZone.create({
    data: { ...data, sortOrder: (last._max.sortOrder ?? 0) + 1 },
  });
}

export interface DeliverySlotInput {
  id?: string;
  zoneId?: string;
  weekdays: number[];
  start: string;
  end: string;
  capacity: string;
}

/** Adds a window on each chosen weekday (or changes one window). */
export async function saveDeliverySlot(input: DeliverySlotInput) {
  if (
    !isClockTime(input.start) ||
    !isClockTime(input.end) ||
    input.start >= input.end
  )
    throw new Error(serverMessages.deliverySlotInvalid);
  const capacity = input.capacity.trim() ? Number(input.capacity) : null;
  if (
    capacity !== null &&
    (!Number.isInteger(capacity) || capacity < 1 || capacity > 10_000)
  )
    throw new Error(serverMessages.deliverySlotInvalid);
  const days = Array.from(new Set(input.weekdays)).filter(
    (d) => Number.isInteger(d) && d >= 0 && d <= 6,
  );
  if (!days.length) throw new Error(serverMessages.deliverySlotInvalid);
  const zoneId = input.zoneId || null;
  if (input.id)
    return db.deliverySlot.update({
      where: { id: input.id },
      data: { weekday: days[0], start: input.start, end: input.end, capacity },
    });
  await db.deliverySlot.createMany({
    data: days.map((weekday) => ({
      zoneId,
      weekday,
      start: input.start,
      end: input.end,
      capacity,
    })),
  });
}

export async function deleteDeliverySlot(id: string) {
  await db.deliverySlot.delete({ where: { id } });
}

// ─── Checkout ────────────────────────────────────────────────────────────────────────────────────────────────────

/** Active zones as pricing terms; empty when the company does not use delivery zones. */
export async function activeZoneTerms(client: Tx | typeof db = db) {
  if (!(await isFeatureEnabled("delivery"))) return [];
  const zones = await client.deliveryZone.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return zones.map(zoneTerms);
}

/** Slots already booked per "date|slotId" from today on. */
async function bookedSlots(client: Tx | typeof db, from: string) {
  const rows = await client.shipment.groupBy({
    by: ["slotDate", "slotId"],
    where: {
      slotDate: { gte: new Date(`${from}T00:00:00Z`) },
      slotId: { not: null },
      status: { not: "cancelled" },
    },
    _count: { _all: true },
  });
  return new Map(
    rows.map((r) => [
      `${r.slotDate!.toISOString().slice(0, 10)}|${r.slotId}`,
      r._count._all,
    ]),
  );
}

/**
 * What the checkout shows for an address: the zone (or none, when zones exist and none covers it), and the time
 * slots the customer can choose.
 */
export type DeliveryOptions = Awaited<ReturnType<typeof deliveryOptions>>;

export async function deliveryOptions(
  address: { area?: string; city?: string },
  now = new Date(),
) {
  const zones = await activeZoneTerms();
  if (!zones.length)
    return {
      zones: false,
      zoneId: null,
      covered: true,
      slots: [] as ReturnType<typeof upcomingSlots>,
      requireSlot: false,
      slaHours: null as number | null,
    };
  const zone = zoneForAddress(zones, address);
  const settings = await settingsRow();
  const timeZone = await timeZoneOf(settings);
  const slots = zone
    ? await db.deliverySlot.findMany({
        where: { isActive: true, OR: [{ zoneId: zone.id }, { zoneId: null }] },
      })
    : [];
  const taken = await bookedSlots(db, now.toISOString().slice(0, 10));
  const open = zone
    ? upcomingSlots(
        slots.map((s) => ({
          id: s.id,
          zoneId: s.zoneId,
          weekday: s.weekday,
          start: s.start,
          end: s.end,
          capacity: s.capacity,
        })),
        zone.id,
        now,
        settings.slotDays,
        taken,
        timeZone,
        settings.leadMinutes,
      )
    : [];
  return {
    zones: true,
    zoneId: zone?.id ?? null,
    covered: !!zone,
    slots: open,
    requireSlot: settings.requireSlot && open.length > 0,
    slaHours: settings.slaHours as number | null,
  };
}

export interface ShipmentSlotChoice {
  date: string;
  slotId: string;
}

/**
 * The shipment for a new delivery order, inside the order's transaction: its zone, the chosen slot (checked again,
 * with its capacity), the promise, cash to collect and a tracking token. Only while the delivery module is on.
 */
export async function createShipmentForOrder(
  tx: Tx,
  order: {
    id: string;
    placedAt: Date;
    total: Prisma.Decimal | number;
    paymentMethod: string;
    name: string;
    phone: string | null;
    shippingAddress: unknown;
  },
  choice: {
    zoneId: string | null;
    slot: ShipmentSlotChoice | null;
    requireSlot: boolean;
  },
) {
  if (!(await isFeatureEnabled("delivery"))) return null;
  const settings = await settingsRow(tx);
  const timeZone = await timeZoneOf(settings, tx);
  let slot: { id: string; date: string; start: string; end: string } | null =
    null;
  if (
    !choice.slot &&
    choice.requireSlot &&
    settings.requireSlot &&
    choice.zoneId &&
    (await tx.deliverySlot.count({
      where: {
        isActive: true,
        OR: [{ zoneId: choice.zoneId }, { zoneId: null }],
      },
    }))
  )
    throw new Error(serverMessages.deliverySlotRequired);
  if (choice.slot) {
    const row = await tx.deliverySlot.findFirst({
      where: {
        id: choice.slot.slotId,
        isActive: true,
        OR: [{ zoneId: choice.zoneId }, { zoneId: null }],
      },
    });
    if (!row || !/^\d{4}-\d{2}-\d{2}$/.test(choice.slot.date))
      throw new Error(serverMessages.deliverySlotUnavailable);
    // Lock the slot's day so two orders cannot take its last place.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`slot:${row.id}:${choice.slot.date}`}))`;
    const open = upcomingSlots(
      [
        {
          id: row.id,
          zoneId: row.zoneId,
          weekday: row.weekday,
          start: row.start,
          end: row.end,
          capacity: row.capacity,
        },
      ],
      choice.zoneId,
      order.placedAt,
      settings.slotDays,
      await bookedSlots(tx, order.placedAt.toISOString().slice(0, 10)),
      timeZone,
      settings.leadMinutes,
    );
    if (!open.some((s) => s.date === choice.slot!.date))
      throw new Error(serverMessages.deliverySlotUnavailable);
    slot = {
      id: row.id,
      date: choice.slot.date,
      start: row.start,
      end: row.end,
    };
  }
  const address = (order.shippingAddress ?? {}) as {
    name?: string;
    phone?: string;
  };
  const number = await getNextSequenceNumber("DL", undefined, tx);
  return tx.shipment.create({
    data: {
      number,
      orderId: order.id,
      zoneId: choice.zoneId,
      slotId: slot?.id ?? null,
      slotDate: slot ? new Date(`${slot.date}T00:00:00Z`) : null,
      slotStart: slot?.start ?? null,
      slotEnd: slot?.end ?? null,
      promisedBy: promisedBy(order.placedAt, settings.slaHours, slot, timeZone),
      recipientName: address.name || order.name,
      recipientPhone: address.phone || order.phone || "",
      address: (order.shippingAddress ?? {}) as Prisma.InputJsonValue,
      codAmount: order.paymentMethod === "cod" ? order.total : 0,
      trackingToken: crypto.randomBytes(18).toString("base64url"),
      events: { create: { status: "pending" } },
    },
  });
}

/**
 * When staff move an order by hand, its open shipments follow: cancelled orders cancel them, delivered orders
 * deliver them, returned orders return them. (Shipments moving orders go the other way, in queries/shipments.)
 */
export async function followOrderStatus(
  tx: Tx,
  orderId: string,
  status: string,
  byId: string | null,
) {
  const map: Record<string, string> = {
    cancelled: "cancelled",
    delivered: "delivered",
    returned: "returned",
  };
  const to = map[status];
  if (!to) return;
  const open = await tx.shipment.findMany({
    where: {
      orderId,
      status: {
        in:
          to === "cancelled"
            ? ["pending", "assigned"]
            : ["pending", "assigned", "out_for_delivery", "failed"],
      },
    },
    select: { id: true },
  });
  for (const s of open) {
    await tx.shipment.update({
      where: { id: s.id },
      data: {
        status: to,
        ...(to === "delivered" ? { deliveredAt: new Date() } : {}),
      },
    });
    await tx.shipmentEvent.create({
      data: { shipmentId: s.id, status: to, byId },
    });
  }
}

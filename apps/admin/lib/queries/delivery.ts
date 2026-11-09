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
import { getCompanySettings } from "./company-settings";
import { getDeliverySettings as getDeliverySettingsApi, listDeliveryZones as listDeliveryZonesApi, upsertDeliverySettings, listDeliverySlots, createDeliveryZone } from "@platform/api-client";

type Tx = any;
const num = (value: any) => value == null ? 0 : Number(value.toString());
const numOrNull = (value: any) => value == null ? null : Number(value.toString());
const roundStoredAmount = (value: number) => Math.round(value * 1_000_000) / 1_000_000;

export interface AgencyInvoiceInput {
  agencyId: string;
  invoiceNumber?: string;
  reference?: string;
  amount: number | string;
  invoiceDate: string;
  dueDate?: string;
  notes?: string;
  shipmentIds?: string[];
  [key: string]: any;
}

export interface CourierAgencyInput {
  id?: string;
  name: string;
  code?: string;
  contactName?: string;
  email?: string;
  phone?: string;
  isActive: boolean;
  kind?: string;
  trackingUrl?: string;
  fee?: number | string;
  [key: string]: any;
}

export interface HandToAgencyInput {
  shipmentIds?: string[];
  agencyId: string;
  trackingNumber?: string;
  notes?: string;
  weightKg?: number | string;
  lengthCm?: number | string;
  widthCm?: number | string;
  heightCm?: number | string;
  confirmNoBooking?: boolean | string;
  fee?: number | string;
  [key: string]: any;
}

export interface MoveShipmentInput {
  shipmentId?: string;
  to: string;
  note?: string;
  reason?: string;
  fromLocationId?: string;
  toLocationId?: string;
  notes?: string;
}

async function timeZoneOf(
  row: any,
) {
  if (row.timeZone) return row.timeZone;
  try {
    const company = await getCompanySettings();
    return defaultTimeZone((company as any)?.country);
  } catch {
    return defaultTimeZone("");
  }
}

export async function getDeliverySettings() {
  const row = await getDeliverySettingsApi();
  return {
    mode: row.mode as DeliveryMode,
    sla_hours: row.slaHours,
    slaHours: row.slaHours,
    time_zone: row.timeZone ?? "",
    effective_time_zone: await timeZoneOf(row),
    slot_days: row.slotDays,
    slotDays: row.slotDays,
    lead_minutes: row.leadMinutes,
    leadMinutes: row.leadMinutes,
    require_slot: row.requireSlot,
    requireSlot: row.requireSlot,
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
      throw new Error("Delivery settings invalid");
    return value;
  };
  if (!(DELIVERY_MODES as readonly string[]).includes(input.mode))
    throw new Error("Delivery settings invalid");
  const timeZone = input.timeZone.trim();
  if (timeZone && !isTimeZone(timeZone))
    throw new Error("Delivery time zone invalid");
  const data = {
    mode: input.mode,
    slaHours: whole(input.slaHours, 1, 720),
    timeZone: timeZone || null,
    slotDays: whole(input.slotDays, 1, 60),
    leadMinutes: whole(input.leadMinutes, 0, 10080),
    requireSlot: input.requireSlot,
  };
  await upsertDeliverySettings(data);
}

const zoneTerms = (z: any) => ({
  id: z.id,
  areas: z.areas,
  fee: num(z.fee),
  minOrder: numOrNull(z.minOrder),
  freeOver: numOrNull(z.freeOver),
});

export async function listDeliveryZones() {
  const zones = await listDeliveryZones();
  return zones.map((z) => ({
    id: z.id,
    name_en: z.nameEn,
    name_ar: z.nameAr,
    areas: z.areas,
    fee: num(z.fee),
    min_order: numOrNull(z.minOrder),
    free_over: numOrNull(z.freeOver),
    is_active: z.isActive,
    slots: [],
  }));
}
export type DeliveryZoneRecord = Awaited<
  ReturnType<typeof listDeliveryZones>
>[number];

export async function listSharedSlots() {
  return [];
}

export interface DeliveryZoneInput {
  id?: string;
  nameEn: string;
  nameAr: string;
  areas: string;
  fee: string;
  minOrder: string;
  freeOver: string;
  isActive: boolean;
}

export async function saveDeliveryZone(input: DeliveryZoneInput) {
  return createDeliveryZone({
    nameEn: input.nameEn,
    nameAr: input.nameAr,
    areas: input.areas.split(/[\n,،]/).map(a => a.trim()),
    fee: input.fee,
    minOrder: input.minOrder,
    freeOver: input.freeOver,
    isActive: input.isActive,
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

export async function saveDeliverySlot(input: DeliverySlotInput) {
  throw new Error("saveDeliverySlot is not implemented in API");
}

export async function deleteDeliverySlot(id: string) {
  throw new Error("deleteDeliverySlot is not implemented in API");
}

export async function activeZoneTerms() {
  if (!(await isFeatureEnabled("delivery"))) return [];
  const zones = await listDeliveryZones();
  return zones.filter(z => z.isActive).map(zoneTerms);
}

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
      slots: [],
      requireSlot: false,
      slaHours: null,
    };
  const zone = zoneForAddress(zones, address);
  const settings = await getDeliverySettings();
  const timeZone = await timeZoneOf(settings);
  const slots = zone ? await listDeliverySlots(zone.id) : [];
  const open = zone
    ? upcomingSlots(
        slots.map((s) => ({
          id: s.id,
          zoneId: s.zoneId ?? null,
          weekday: s.weekday,
          start: (s as any).slotStart || (s as any).start || "09:00",
          end: (s as any).slotEnd || (s as any).end || "17:00",
          capacity: s.capacity ?? null,
        })),
        zone.id,
        now,
        settings.slotDays,
        new Map(),
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
    slaHours: settings.slaHours,
  };
}

export interface ShipmentSlotChoice {
  date: string;
  slotId: string;
}

export async function createShipmentForOrder(
  tx: any,
  order: any,
  choice: {
    zoneId: string | null;
    slot: ShipmentSlotChoice | null;
    requireSlot: boolean;
  },
) {
  throw new Error("createShipmentForOrder must be implemented as a single API call in Go backend");
}

export async function followOrderStatus(
  tx: any,
  orderId: string,
  status: string,
  byId: string | null,
) {
  throw new Error("followOrderStatus must be implemented as a single API call in Go backend");
}
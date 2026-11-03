// Delivery: who delivers, the zones and time slots customers choose, and how a shipment moves. Runtime-free.

/** Own drivers, courier agencies, or both. */
export const DELIVERY_MODES = ["own", "agency", "both"] as const;
export type DeliveryMode = (typeof DELIVERY_MODES)[number];

export const SHIPMENT_STATUSES = [
  "pending",
  "assigned",
  "out_for_delivery",
  "delivered",
  "failed",
  "returned",
  "cancelled",
] as const;
export type ShipmentStatus = (typeof SHIPMENT_STATUSES)[number];

/** Where a shipment may go next. A failed delivery is tried again (assigned / out again) or sent back. */
export const SHIPMENT_TRANSITIONS: Record<ShipmentStatus, ShipmentStatus[]> = {
  pending: ["assigned", "out_for_delivery", "cancelled"],
  assigned: ["pending", "out_for_delivery", "cancelled"],
  out_for_delivery: ["delivered", "failed"],
  failed: ["assigned", "out_for_delivery", "returned"],
  delivered: [],
  returned: [],
  cancelled: [],
};
export const canMoveShipment = (from: string, to: string) =>
  (SHIPMENT_TRANSITIONS[from as ShipmentStatus] ?? []).includes(
    to as ShipmentStatus,
  );
/** Shipments still on their way to the customer. */
export const OPEN_SHIPMENT_STATUSES: ShipmentStatus[] = [
  "pending",
  "assigned",
  "out_for_delivery",
  "failed",
];

export const FAILURE_REASONS = [
  "customer_absent",
  "unreachable",
  "wrong_address",
  "refused",
  "rescheduled",
  "damaged",
  "other",
] as const;
export type FailureReason = (typeof FAILURE_REASONS)[number];

/** The customer-facing steps of the tracking page, in order. */
export const TRACKING_STEPS = [
  "placed",
  "packing",
  "out_for_delivery",
  "delivered",
] as const;

/** A name for matching areas: case, spaces and Arabic letter variants do not matter. */
export function normalizeArea(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/\s+/g, " ");
}

export interface ZoneTerms {
  id: string;
  areas: string[];
  fee: number;
  minOrder: number | null;
  freeOver: number | null;
}

/** The first active zone that lists the address's area or city; a zone with no areas covers everywhere else. */
export function zoneForAddress<Z extends ZoneTerms>(
  zones: Z[],
  address: { area?: string; city?: string },
) {
  const keys = [address.area, address.city]
    .filter(Boolean)
    .map((v) => normalizeArea(v!));
  return (
    zones.find((z) => z.areas.some((a) => keys.includes(normalizeArea(a)))) ??
    zones.find((z) => z.areas.length === 0) ??
    null
  );
}

export interface SlotTemplate {
  id: string;
  zoneId: string | null;
  /** 0 = Sunday … 6 = Saturday. */
  weekday: number;
  start: string;
  end: string;
  capacity: number | null;
}

/** "HH:MM" on a 24-hour clock. */
export const isClockTime = (value: string) =>
  /^([01]\d|2[0-3]):[0-5]\d$/.test(value);

/** Time zones by company country, for slot times when the store has not chosen one. */
const COUNTRY_TIME_ZONES: Record<string, string> = {
  BH: "Asia/Bahrain",
  SA: "Asia/Riyadh",
  AE: "Asia/Dubai",
  KW: "Asia/Kuwait",
  QA: "Asia/Qatar",
  OM: "Asia/Muscat",
  JO: "Asia/Amman",
  EG: "Africa/Cairo",
  IQ: "Asia/Baghdad",
  LB: "Asia/Beirut",
  GB: "Europe/London",
  US: "America/New_York",
};
export const defaultTimeZone = (country: string | null | undefined) =>
  COUNTRY_TIME_ZONES[(country ?? "").trim().toUpperCase()] ?? "UTC";
export function isTimeZone(value: string) {
  try {
    new Intl.DateTimeFormat("en", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

/** Minutes the zone is ahead of UTC at that moment. */
function zoneOffsetMinutes(at: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(at);
  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);
  return Math.round(
    (Date.UTC(
      get("year"),
      get("month") - 1,
      get("day"),
      get("hour"),
      get("minute"),
    ) -
      at.getTime()) /
      60_000,
  );
}

/** The moment a local date and "HH:MM" happen in the zone. */
export function zonedMoment(date: string, time: string, timeZone: string) {
  const guess = new Date(`${date}T${time}:00Z`);
  return new Date(
    guess.getTime() - zoneOffsetMinutes(guess, timeZone) * 60_000,
  );
}

/** The local calendar date ("YYYY-MM-DD") in the zone. */
export const zonedDate = (at: Date, timeZone: string) =>
  new Date(at.getTime() + zoneOffsetMinutes(at, timeZone) * 60_000)
    .toISOString()
    .slice(0, 10);

/**
 * The delivery windows a customer can choose over the coming days, in the store's time zone: the zone's slots (or
 * the slots for every zone), starting at least `leadMinutes` from now, not full. `taken` counts shipments per
 * "date|slotId".
 */
export function upcomingSlots(
  slots: SlotTemplate[],
  zoneId: string | null,
  now: Date,
  days: number,
  taken: Map<string, number>,
  timeZone: string,
  leadMinutes = 60,
) {
  const out: {
    date: string;
    slotId: string;
    start: string;
    end: string;
    left: number | null;
  }[] = [];
  const relevant = slots.filter(
    (s) => s.zoneId === null || s.zoneId === zoneId,
  );
  const today = zonedDate(now, timeZone);
  for (let d = 0; d < days; d++) {
    const day = new Date(`${today}T00:00:00Z`);
    day.setUTCDate(day.getUTCDate() + d);
    const date = day.toISOString().slice(0, 10);
    for (const slot of relevant
      .filter((s) => s.weekday === day.getUTCDay())
      .sort((a, b) => a.start.localeCompare(b.start))) {
      if (
        zonedMoment(date, slot.start, timeZone).getTime() - now.getTime() <
        leadMinutes * 60_000
      )
        continue;
      const used = taken.get(`${date}|${slot.id}`) ?? 0;
      const left = slot.capacity == null ? null : slot.capacity - used;
      if (left !== null && left <= 0) continue;
      out.push({
        date,
        slotId: slot.id,
        start: slot.start,
        end: slot.end,
        left,
      });
    }
  }
  return out;
}

/** When the shipment is promised: the end of its slot, else the order time plus the delivery promise in hours. */
export function promisedBy(
  placedAt: Date,
  slaHours: number,
  slot: { date: string; end: string } | null,
  timeZone: string,
) {
  if (slot) return zonedMoment(slot.date, slot.end, timeZone);
  return new Date(placedAt.getTime() + Math.max(1, slaHours) * 3_600_000);
}

export const VEHICLE_KINDS = [
  "car",
  "van",
  "motorbike",
  "truck",
  "bicycle",
  "other",
] as const;

/** How a courier agency is reached: tracking numbers entered by hand, or its API. */
export const COURIER_KINDS = [
  "manual",
  "aramex",
  "dhl_express",
  "smsa",
] as const;
export type CourierKind = (typeof COURIER_KINDS)[number];

export const UNRESOLVED_COURIER_BOOKINGS = [
  "pending",
  "unknown",
  "review",
] as const;

/** Automatic booking handles one measured parcel; DHL also requires all three dimensions in centimetres. */
export function measuredCourierParcel(
  input: {
    weightKg?: string;
    lengthCm?: string;
    widthCm?: string;
    heightCm?: string;
  },
  requiresDimensions: boolean,
) {
  const weightKg = Number(input.weightKg);
  const dimensions = requiresDimensions
    ? {
        length: Number(input.lengthCm),
        width: Number(input.widthCm),
        height: Number(input.heightCm),
      }
    : undefined;
  if (
    !Number.isFinite(weightKg) ||
    weightKg <= 0 ||
    (dimensions &&
      Object.values(dimensions).some(
        (value) => !Number.isFinite(value) || value <= 0,
      ))
  )
    return null;
  return { weightKg, dimensions };
}

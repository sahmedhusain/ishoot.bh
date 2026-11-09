

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

export const TRACKING_STEPS = [
  "placed",
  "packing",
  "out_for_delivery",
  "delivered",
] as const;

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

  weekday: number;
  start: string;
  end: string;
  capacity: number | null;
}

export const isClockTime = (value: string) =>
  /^([01]\d|2[0-3]):[0-5]\d$/.test(value);

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

export function zonedMoment(date: string, time: string, timeZone: string) {
  const guess = new Date(`${date}T${time}:00Z`);
  return new Date(
    guess.getTime() - zoneOffsetMinutes(guess, timeZone) * 60_000,
  );
}

export const zonedDate = (at: Date, timeZone: string) =>
  new Date(at.getTime() + zoneOffsetMinutes(at, timeZone) * 60_000)
    .toISOString()
    .slice(0, 10);

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

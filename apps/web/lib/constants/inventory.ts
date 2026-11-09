
export const MOVEMENT_TYPES = [
  "receipt",
  "sale",
  "return",
  "transfer_out",
  "transfer_in",
  "adjustment",
  "write_off",
  "count",
] as const;
export type MovementType = (typeof MOVEMENT_TYPES)[number];

export const ADJUSTMENT_REASONS = [
  "damaged",
  "expired",
  "lost",
  "found",
  "correction",
  "sample",
  "other",
] as const;
export type AdjustmentReason = (typeof ADJUSTMENT_REASONS)[number];
export const isAdjustmentReason = (value: unknown): value is AdjustmentReason =>
  typeof value === "string" &&
  (ADJUSTMENT_REASONS as readonly string[]).includes(value);

export const MANUAL_MOVEMENTS = ["receipt", "adjustment", "write_off"] as const;
export type ManualMovement = (typeof MANUAL_MOVEMENTS)[number];

export const COUNT_STATUSES = [
  "counting",
  "review",
  "approved",
  "cancelled",
] as const;
export type CountStatus = (typeof COUNT_STATUSES)[number];

export const BATCH_ACTIVITIES = ["pharmacy", "food", "healthcare"] as const;

export const roundQuantity = (value: number) => Math.round(value * 1_000_000) / 1_000_000;
export const roundCost = (value: number) => Math.round(value * 10000) / 10000;

export function averageCostAfter(
  onHand: number,
  averageCost: number,
  quantity: number,
  unitCost: number,
) {
  if (quantity <= 0) return roundCost(averageCost);
  if (onHand <= 0) return roundCost(unitCost);
  return roundCost(
    (onHand * averageCost + quantity * unitCost) / (onHand + quantity),
  );
}

export const countVariance = (expected: number, counted: number | null) =>
  counted == null ? 0 : roundQuantity(counted - expected);

export function daysToExpiry(expiry: Date | string | null, today = new Date()) {
  if (!expiry) return null;
  const day = (d: Date) =>
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  return Math.round((day(new Date(expiry)) - day(today)) / 86_400_000);
}

export const WAREHOUSE_CODE = /^[A-Z0-9][A-Z0-9-]{0,19}$/;

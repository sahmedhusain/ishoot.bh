// Inventory: movement types, reasons and the stock arithmetic. Runtime-free, so forms and the server agree.

export const MOVEMENT_TYPES = ["receipt", "sale", "return", "transfer_out", "transfer_in", "adjustment", "write_off", "count"] as const;
export type MovementType = (typeof MOVEMENT_TYPES)[number];

/** Why stock was adjusted or written off by hand. */
export const ADJUSTMENT_REASONS = ["damaged", "expired", "lost", "found", "correction", "sample", "other"] as const;
export type AdjustmentReason = (typeof ADJUSTMENT_REASONS)[number];
export const isAdjustmentReason = (value: unknown): value is AdjustmentReason =>
  typeof value === "string" && (ADJUSTMENT_REASONS as readonly string[]).includes(value);

/** What people do by hand on the stock screen; the other types come from orders, purchases, transfers and counts. */
export const MANUAL_MOVEMENTS = ["receipt", "adjustment", "write_off"] as const;
export type ManualMovement = (typeof MANUAL_MOVEMENTS)[number];

export const COUNT_STATUSES = ["counting", "review", "approved", "cancelled"] as const;
export type CountStatus = (typeof COUNT_STATUSES)[number];

/** Activities whose stock usually has batches and expiry dates; new products there start batch-tracked. */
export const BATCH_ACTIVITIES = ["pharmacy", "food", "healthcare"] as const;

/** Quantities are kept to three decimals (kilograms, litres). */
export const roundQuantity = (value: number) => Math.round(value * 1000) / 1000;
/** Unit costs are kept to four decimals. */
export const roundCost = (value: number) => Math.round(value * 10000) / 10000;

/**
 * Weighted average cost after stock comes in: what was on hand at the old average plus what arrived at its
 * cost, spread over the new total. Stock that was negative or empty takes the new cost.
 */
export function averageCostAfter(onHand: number, averageCost: number, quantity: number, unitCost: number) {
  if (quantity <= 0) return roundCost(averageCost);
  if (onHand <= 0) return roundCost(unitCost);
  return roundCost((onHand * averageCost + quantity * unitCost) / (onHand + quantity));
}

/** What a count changes: counted minus expected (positive found more, negative found less). */
export const countVariance = (expected: number, counted: number | null) => (counted == null ? 0 : roundQuantity(counted - expected));

/** Days until a batch expires (negative once expired), or null without an expiry date. */
export function daysToExpiry(expiry: Date | string | null, today = new Date()) {
  if (!expiry) return null;
  const day = (d: Date) => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  return Math.round((day(new Date(expiry)) - day(today)) / 86_400_000);
}

export const WAREHOUSE_CODE = /^[A-Z0-9][A-Z0-9-]{0,19}$/;

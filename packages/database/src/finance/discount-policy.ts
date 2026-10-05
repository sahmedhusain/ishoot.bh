import { db } from "../db";

export interface DiscountDecision {
  /** Discount as a percentage of the subtotal (0 when there is none). */
  percent: number;
  /** The issuer's limit; null means unlimited (Super Admin). */
  limit: number | null;
  limitSource: "user" | "company" | "super_admin";
  withinLimit: boolean;
  /** Whether the document must go through approval. */
  needsApproval: boolean;
}

export function discountPercent(subtotal: number, discountAmount: number): number {
  if (!(subtotal > 0) || !(discountAmount > 0)) return 0;
  return Math.round((discountAmount / subtotal) * 10000) / 100;
}

/**
 * Discounts up to the issuer's limit (their own, else the company default) need no approval.
 * Super Admin has no limit. A company can still require approval for every quotation.
 */
export async function discountDecision(
  userId: string,
  subtotal: number,
  discountAmount: number,
  options: { alwaysApprove?: boolean } = {},
): Promise<DiscountDecision> {
  const [user, company] = await Promise.all([
    db.user.findUniqueOrThrow({ where: { id: userId }, select: { role: true, discountLimitPercent: true } }),
    db.companySetting.findFirst({ select: { defaultDiscountLimitPercent: true, quotationsAlwaysNeedApproval: true } }),
  ]);
  const percent = discountPercent(subtotal, discountAmount);
  const always = options.alwaysApprove ?? company?.quotationsAlwaysNeedApproval ?? false;
  if (user.role === "super_admin") return { percent, limit: null, limitSource: "super_admin", withinLimit: true, needsApproval: false };
  const own = user.discountLimitPercent === null ? null : Number(user.discountLimitPercent);
  const limit = own ?? Number(company?.defaultDiscountLimitPercent ?? 0);
  const withinLimit = percent <= limit + 1e-9;
  return { percent, limit, limitSource: own === null ? "company" : "user", withinLimit, needsApproval: always || !withinLimit };
}

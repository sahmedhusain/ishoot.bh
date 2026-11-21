import { reserveDocumentNumber } from "../api/company";
import { listOrders } from "../api/commerce";

const sequenceCounters = ((globalThis as unknown as Record<string, unknown>).__platformSequenceCounters ??=
  new Map<string, number>()) as Map<string, number>;

async function highestExistingOrderSeq(prefix: string, year: number): Promise<number> {
  if (prefix !== "SO") return 0;
  try {
    const orders = await listOrders();
    const pat = new RegExp(`^${prefix}-${year}-(\\d+)$`);
    let max = 0;
    for (const o of orders || []) {
      const m = pat.exec(String(o?.number ?? ""));
      if (m) {
        const n = Number(m[1]);
        if (Number.isFinite(n) && n > max) max = n;
      }
    }
    return max;
  } catch {
    return 0;
  }
}

export async function getNextSequenceNumber(
  prefix: string,
  year?: number,
  _client?: unknown,
): Promise<string> {
  const currentYear = year || new Date().getFullYear();
  if (prefix === "INV" || prefix === "REC") {
    try {
      const reserved = await reserveDocumentNumber(
        prefix === "INV" ? "invoice" : "receipt",
        new Date().toISOString().slice(0, 10),
        `seq:${prefix}:${currentYear}:${Date.now()}:${Math.random().toString(36).slice(2)}`,
      );
      if (reserved) return reserved;
    } catch {}
  }

  const sequenceId = `${prefix}_${currentYear}`;
  const seededMax = await highestExistingOrderSeq(prefix, currentYear);
  const next = Math.max(sequenceCounters.get(sequenceId) ?? 0, seededMax) + 1;
  sequenceCounters.set(sequenceId, next);
  const paddedNumber = String(next).padStart(6, "0");
  return `${prefix}-${currentYear}-${paddedNumber}`;
}

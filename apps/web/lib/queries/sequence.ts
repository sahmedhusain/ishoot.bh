import { reserveDocumentNumber } from "../api/company";

const sequenceCounters = new Map<string, number>();

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
  const next = (sequenceCounters.get(sequenceId) ?? 0) + 1;
  sequenceCounters.set(sequenceId, next);
  const paddedNumber = String(next).padStart(6, "0");
  return `${prefix}-${currentYear}-${paddedNumber}`;
}

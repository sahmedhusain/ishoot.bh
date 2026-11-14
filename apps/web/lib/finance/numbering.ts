import { reserveDocumentNumber } from "../api/company";
import { formatDocumentNumber } from "../constants/finance";

const counters = new Map<string, number>();

export async function allocateDocumentNumber(
  kind: "invoice" | "receipt",
  documentDate: Date,
  _client?: unknown,
): Promise<string> {
  try {
    const num = await reserveDocumentNumber(
      kind,
      documentDate.toISOString().slice(0, 10),
      `alloc:${kind}:${Date.now()}:${Math.random().toString(36).slice(2)}`,
    );
    if (num) return num;
  } catch {}
  const year = documentDate.getFullYear();
  const key = `${kind}:${year}`;
  const next = (counters.get(key) ?? 0) + 1;
  counters.set(key, next);
  return formatDocumentNumber(kind === "invoice" ? "INV" : "REC", year, next);
}

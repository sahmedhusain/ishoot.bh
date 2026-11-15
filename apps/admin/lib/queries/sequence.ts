import { listTableRows, upsertTableRow } from "../api/tables";

export async function getNextSequenceNumber(
  prefix: string,
  year?: number,
  _client?: any,
): Promise<string> {
  const currentYear = year || new Date().getFullYear();
  const sequenceId = `${prefix}_${currentYear}`;

  const rows = await listTableRows<any>("system", "reference_sequence").catch(() => []);
  const existing = rows.find((r) => r.id === sequenceId);
  const nextNumber = (existing ? Number(existing.lastNumber ?? 0) : 0) + 1;

  await upsertTableRow("system", "reference_sequence", {
    ...(existing || {}),
    id: sequenceId,
    prefix,
    year: currentYear,
    lastNumber: nextNumber,
    updatedAt: new Date().toISOString(),
  });

  const paddedNumber = String(nextNumber).padStart(6, "0");
  return `${prefix}-${currentYear}-${paddedNumber}`;
}

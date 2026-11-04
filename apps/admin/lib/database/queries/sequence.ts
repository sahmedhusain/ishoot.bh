import { db } from "../db";

type SequenceClient = Pick<typeof db, "referenceSequence">;

/** Next number in a yearly sequence, e.g. SR-2026-000012. Pass a transaction client to roll the number back with the record. */
export async function getNextSequenceNumber(
  prefix: string,
  year?: number,
  client: any = db,
): Promise<string> {
  const currentYear = year || new Date().getFullYear();
  const sequenceId = `${prefix}_${currentYear}`;

  const result = await client.referenceSequence.upsert({
    where: { id: sequenceId },
    update: {
      lastNumber: { increment: 1 },
      updatedAt: new Date(),
    },
    create: {
      id: sequenceId,
      prefix,
      year: currentYear,
      lastNumber: 1,
    },
  });

  const paddedNumber = String(result.lastNumber).padStart(6, "0");
  return `${prefix}-${currentYear}-${paddedNumber}`;
}

import { db } from "../db";

export async function getNextSequenceNumber(prefix: string, year?: number): Promise<string> {
  const currentYear = year || new Date().getFullYear();
  const sequenceId = `${prefix}_${currentYear}`;

  const result = await db.referenceSequence.upsert({
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

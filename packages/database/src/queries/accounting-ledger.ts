import { createHash } from "node:crypto";
import { db, runAtomicMutation } from "../db";
import { assertCompanyCurrency } from "../finance/company-currency";
import {
  validateJournalLines,
  type JournalPostingLine,
} from "../finance/journal";
import { requireBranchAccess } from "./branches";

export interface JournalPosting {
  sourceKey: string;
  postingDate: string;
  currency: string;
  memo: string;
  branchId?: string;
  lines: JournalPostingLine[];
}
async function requireLedgerAdministrator(actorId: string) {
  const actor = await db.user.findUnique({ where: { id: actorId } });
  // New ledger permissions must be provisioned before delegating posting to additional roles.
  if (!actor?.isActive || actor.role !== "super_admin")
    throw new Error("Ledger administration requires a super administrator");
}
function dateOnly(value: string) {
  const parsed = new Date(`${value}T00:00:00Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    !Number.isFinite(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== value
  )
    throw new Error("Invalid posting date");
  return parsed;
}
export async function postJournal(input: JournalPosting, actorId: string) {
  return postJournalRecord(input, actorId);
}
async function postJournalRecord(
  input: JournalPosting,
  actorId: string,
  reversalOfId?: string,
) {
  if (
    !/^[A-Za-z0-9:._/-]{1,180}$/.test(input.sourceKey) ||
    !input.memo.trim() ||
    input.memo.length > 1000
  )
    throw new Error("Invalid journal reference or description");
  const postingDate = dateOnly(input.postingDate);
  validateJournalLines(input.lines, input.currency);
  const hash = createHash("sha256")
    .update(
      JSON.stringify([
        input.sourceKey,
        input.postingDate,
        input.currency,
        input.memo,
        input.branchId ?? null,
        reversalOfId ?? null,
        input.lines.map((line) => [
          line.accountId,
          line.debit,
          line.credit,
          line.memo ?? "",
        ]),
      ]),
    )
    .digest("hex");
  return runAtomicMutation(async () => {
    await requireLedgerAdministrator(actorId);
    if (input.branchId) await requireBranchAccess(actorId, input.branchId);
    await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`journal:${input.sourceKey}`}, 0))`;
    const existing = await db.journalEntry.findUnique({
      where: { sourceKey: input.sourceKey },
    });
    if (existing) {
      if (existing.requestHash !== hash)
        throw new Error(
          "Journal reference already posted with different values",
        );
      return { id: existing.id };
    }
    await assertCompanyCurrency(input.currency);
    // The same lock serializes period closing and posting; closing cannot race past a posting.
    await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended('accounting-periods', 0))`;
    const periods = await db.accountingPeriod.findMany({
      where: { startsOn: { lte: postingDate }, endsOn: { gte: postingDate } },
    });
    if (periods.length !== 1 || periods[0].status !== "open")
      throw new Error("Posting requires exactly one open accounting period");
    const accountIds = Array.from(new Set(input.lines.map((line) => line.accountId)));
    if (
      (await db.accountingAccount.count({
        where: { id: { in: accountIds }, isActive: true },
      })) !== accountIds.length
    )
      throw new Error("Journal contains an unavailable account");
    const entry = await db.journalEntry.create({
      data: {
        sourceKey: input.sourceKey,
        requestHash: hash,
        periodId: periods[0].id,
        postingDate,
        currency: input.currency,
        memo: input.memo.trim(),
        branchId: input.branchId,
        createdById: actorId,
        reversalOfId,
        lines: {
          create: input.lines.map((line) => ({
            accountId: line.accountId,
            debit: line.debit,
            credit: line.credit,
            memo: line.memo,
          })),
        },
      },
    });
    await db.activityLog.create({
      data: {
        userId: actorId,
        action: "create",
        entityType: "journal",
        entityId: entry.id,
        details: { sourceKey: input.sourceKey },
      },
    });
    return { id: entry.id };
  });
}
export async function createAccountingPeriod(
  input: { name: string; startsOn: string; endsOn: string },
  actorId: string,
) {
  const startsOn = dateOnly(input.startsOn),
    endsOn = dateOnly(input.endsOn);
  if (startsOn > endsOn || !input.name.trim() || input.name.length > 100)
    throw new Error("Invalid accounting period");
  return runAtomicMutation(async () => {
    await requireLedgerAdministrator(actorId);
    await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended('accounting-periods', 0))`;
    if (
      await db.accountingPeriod.count({
        where: { startsOn: { lte: endsOn }, endsOn: { gte: startsOn } },
      })
    )
      throw new Error("Accounting periods overlap");
    return db.accountingPeriod.create({
      data: { name: input.name.trim(), startsOn, endsOn },
    });
  });
}

/** Closing is serialized against posting and is irreversible through this service. */
export async function closeAccountingPeriod(periodId: string, actorId: string) {
  return runAtomicMutation(async () => {
    await requireLedgerAdministrator(actorId);
    await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended('accounting-periods', 0))`;
    const period = await db.accountingPeriod.findUniqueOrThrow({
      where: { id: periodId },
    });
    if (period.status === "closed") return period;
    const closed = await db.accountingPeriod.update({
      where: { id: periodId },
      data: {
        status: "closed",
        closedById: actorId,
        closedAt: new Date(),
      },
    });
    await db.activityLog.create({
      data: {
        userId: actorId,
        action: "update",
        entityType: "accounting_period",
        entityId: periodId,
        details: { operation: "close" },
      },
    });
    return closed;
  });
}

/** Reversals use today's chosen open period; the original posting remains unchanged. */
export async function reverseJournal(
  input: {
    entryId: string;
    sourceKey: string;
    postingDate: string;
    reason: string;
  },
  actorId: string,
) {
  if (!input.reason.trim() || input.reason.length > 900)
    throw new Error("A reversal reason is required");
  return runAtomicMutation(async () => {
    await requireLedgerAdministrator(actorId);
    // Two different retry keys must not reverse one entry twice.
    await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`reversal:${input.entryId}`}, 0))`;
    const original = await db.journalEntry.findUniqueOrThrow({
      where: { id: input.entryId },
      include: { lines: { orderBy: { id: "asc" } } },
    });
    if (original.branchId)
      await requireBranchAccess(actorId, original.branchId);
    if (original.reversalOfId)
      throw new Error("A reversal cannot itself be reversed");
    const previous = await db.journalEntry.findUnique({
      where: { reversalOfId: original.id },
    });
    if (previous && previous.sourceKey !== input.sourceKey)
      throw new Error("Journal has already been reversed");
    return postJournalRecord(
      {
        sourceKey: input.sourceKey,
        postingDate: input.postingDate,
        currency: original.currency,
        memo: `Reversal: ${input.reason.trim()}`,
        branchId: original.branchId ?? undefined,
        lines: original.lines.map((line) => ({
          accountId: line.accountId,
          debit: line.credit.toString(),
          credit: line.debit.toString(),
          memo: line.memo ?? undefined,
        })),
      },
      actorId,
      original.id,
    );
  });
}

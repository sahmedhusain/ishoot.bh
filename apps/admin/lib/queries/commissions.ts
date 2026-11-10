import { Database } from "@platform/database/decimal";
import { db, runAtomicMutation } from "../atomic";

export interface CommissionRuleInput {
  code: string;
  name: string;
  rate: number | string;
  effectiveFrom: string;
  effectiveTo?: string;
}

export async function createCommissionRule(input: CommissionRuleInput, actorId: string) {
  return runAtomicMutation(async () => {
    if (!input.code.trim() || !input.name.trim()) throw new Error("Invalid commission rule");
    const rateVal = new Database.Decimal(input.rate.toString());
    if (rateVal.lessThan(0) || rateVal.greaterThan(1)) throw new Error("Invalid commission rule");

    const rule = await db.commissionRule.create({
      data: {
        code: input.code.trim().toUpperCase(),
        name: input.name.trim(),
        rate: rateVal,
        effectiveFrom: new Date(`${input.effectiveFrom}T00:00:00.000Z`),
        effectiveTo: input.effectiveTo ? new Date(`${input.effectiveTo}T00:00:00.000Z`) : null,
      },
    });

    return rule;
  });
}

export async function listCommissionRules() {
  return db.commissionRule.findMany({
    where: { isActive: true },
    orderBy: { effectiveFrom: "desc" },
  });
}

export interface RecordCommissionInput {
  orderId: string;
  orderLineId?: string;
  attributedUserId: string;
  basisAmount: number | string;
  currency: string;
  ruleCode?: string;
}

export async function recordCommissionSnapshot(input: RecordCommissionInput, actorId: string) {
  return runAtomicMutation(async () => {
    const user = await db.user.findUnique({ where: { id: input.attributedUserId } });
    if (!user || !user.isActive) throw new Error("Commission rule not found");

    const now = new Date();
    const rule = input.ruleCode
      ? await db.commissionRule.findUnique({ where: { code: input.ruleCode } })
      : await db.commissionRule.findFirst({
          where: {
            isActive: true,
            effectiveFrom: { lte: now },
            OR: [{ effectiveTo: null }, { effectiveTo: { gte: now } }],
          },
          orderBy: { version: "desc" },
        });

    if (!rule) throw new Error("Commission rule not found");

    const basis = new Database.Decimal(input.basisAmount.toString());
    const commission = basis.mul(rule.rate);

    const snapshot = await db.commissionSnapshot.create({
      data: {
        orderId: input.orderId,
        orderLineId: input.orderLineId || null,
        attributedUserId: input.attributedUserId,
        ruleId: rule.id,
        ruleVersion: rule.version,
        ruleRate: rule.rate,
        basisAmount: basis,
        commissionAmount: commission,
        currency: input.currency,
        status: "earned",
        calculationDetails: {
          rate: rule.rate.toString(),
          basis: basis.toString(),
          ruleCode: rule.code,
        },
        createdById: actorId,
      },
    });

    return snapshot;
  });
}

export async function reverseCommissionSnapshot(snapshotId: string, reason: string, actorId: string) {
  return runAtomicMutation(async () => {
    const original = await db.commissionSnapshot.findUnique({
      where: { id: snapshotId },
    });
    if (!original) throw new Error("Commission snapshot not found");
    if (original.status === "reversed") throw new Error("Commission snapshot already reversed");

    const reversing = await db.commissionSnapshot.create({
      data: {
        orderId: original.orderId,
        orderLineId: original.orderLineId,
        attributedUserId: original.attributedUserId,
        ruleId: original.ruleId,
        ruleVersion: original.ruleVersion,
        ruleRate: original.ruleRate,
        basisAmount: original.basisAmount.negated(),
        commissionAmount: original.commissionAmount.negated(),
        currency: original.currency,
        status: "reversed",
        reversalOfId: original.id,
        calculationDetails: {
          originalSnapshotId: original.id,
          reversalReason: reason,
        },
        createdById: actorId,
      },
    });

    await db.stockTraceEvent.create({
      data: {
        entityType: "commission_snapshot",
        entityId: original.id,
        revision: 1,
        action: "reversed",
        actorId,
        details: { reason, reversingId: reversing.id },
      },
    });

    return reversing;
  });
}

export async function listCommissionSnapshots(attributedUserId?: string, orderId?: string) {
  return db.commissionSnapshot.findMany({
    where: {
      ...(attributedUserId ? { attributedUserId } : {}),
      ...(orderId ? { orderId } : {}),
    },
    include: { rule: true },
    orderBy: { earnedAt: "desc" },
  });
}

import { Database } from "@platform/database/decimal";
import { runAtomicMutation } from "../api/atomic";
import { listTableRows, upsertTableRow } from "../api/tables";

export interface CommissionRuleInput {
  code: string;
  name: string;
  rate: number | string;
  effectiveFrom: string;
  effectiveTo?: string;
}

export async function createCommissionRule(input: CommissionRuleInput, _actorId: string) {
  return runAtomicMutation(async () => {
    if (!input.code.trim() || !input.name.trim()) throw new Error("Invalid commission rule");
    const rateVal = new Database.Decimal(input.rate.toString());
    if (rateVal.lessThan(0) || rateVal.greaterThan(1)) throw new Error("Invalid commission rule");

    return upsertTableRow("finance", "commission_rule", {
      id: crypto.randomUUID(),
      code: input.code.trim().toUpperCase(),
      name: input.name.trim(),
      rate: rateVal.toString(),
      effectiveFrom: `${input.effectiveFrom}T00:00:00.000Z`,
      effectiveTo: input.effectiveTo ? `${input.effectiveTo}T00:00:00.000Z` : null,
      isActive: true,
      version: 1,
    });
  });
}

export async function listCommissionRules() {
  const rows = await listTableRows<any>("finance", "commission_rule");
  return rows
    .filter((r) => r.isActive)
    .sort((a, b) =>
      String(b.effectiveFrom ?? "").localeCompare(String(a.effectiveFrom ?? "")),
    );
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
    const [users, rules] = await Promise.all([
      listTableRows<any>("identity", "user"),
      listTableRows<any>("finance", "commission_rule"),
    ]);
    const user = users.find((u) => u.id === input.attributedUserId);
    if (!user || !user.isActive) throw new Error("Commission rule not found");

    const now = new Date();
    const rule = input.ruleCode
      ? rules.find((r) => r.code === input.ruleCode)
      : rules
          .filter(
            (r) =>
              r.isActive &&
              new Date(r.effectiveFrom) <= now &&
              (!r.effectiveTo || new Date(r.effectiveTo) >= now),
          )
          .sort((a, b) => Number(b.version ?? 0) - Number(a.version ?? 0))[0];

    if (!rule) throw new Error("Commission rule not found");

    const basis = new Database.Decimal(input.basisAmount.toString());
    const commission = basis.mul(new Database.Decimal(String(rule.rate)));

    return upsertTableRow("finance", "commission_snapshot", {
      id: crypto.randomUUID(),
      orderId: input.orderId,
      orderLineId: input.orderLineId || null,
      attributedUserId: input.attributedUserId,
      ruleId: rule.id,
      ruleVersion: rule.version,
      ruleRate: String(rule.rate),
      basisAmount: basis.toString(),
      commissionAmount: commission.toString(),
      currency: input.currency,
      status: "earned",
      calculationDetails: {
        rate: String(rule.rate),
        basis: basis.toString(),
        ruleCode: rule.code,
      },
      createdById: actorId,
    });
  });
}

export async function reverseCommissionSnapshot(snapshotId: string, reason: string, actorId: string) {
  return runAtomicMutation(async () => {
    const snapshots = await listTableRows<any>("finance", "commission_snapshot");
    const original = snapshots.find((s) => s.id === snapshotId);
    if (!original) throw new Error("Commission snapshot not found");
    if (original.status === "reversed") throw new Error("Commission snapshot already reversed");

    const reversing = await upsertTableRow<any>("finance", "commission_snapshot", {
      id: crypto.randomUUID(),
      orderId: original.orderId,
      orderLineId: original.orderLineId,
      attributedUserId: original.attributedUserId,
      ruleId: original.ruleId,
      ruleVersion: original.ruleVersion,
      ruleRate: original.ruleRate,
      basisAmount: new Database.Decimal(String(original.basisAmount)).negated().toString(),
      commissionAmount: new Database.Decimal(String(original.commissionAmount)).negated().toString(),
      currency: original.currency,
      status: "reversed",
      reversalOfId: original.id,
      calculationDetails: {
        originalSnapshotId: original.id,
        reversalReason: reason,
      },
      createdById: actorId,
    });

    await upsertTableRow("inventory", "stock_trace_event", {
      id: crypto.randomUUID(),
      entityType: "commission_snapshot",
      entityId: original.id,
      revision: 1,
      action: "reversed",
      actorId,
      details: { reason, reversingId: reversing.id },
    });

    return reversing;
  });
}

export async function listCommissionSnapshots(attributedUserId?: string, orderId?: string) {
  const [snapshots, rules] = await Promise.all([
    listTableRows<any>("finance", "commission_snapshot"),
    listTableRows<any>("finance", "commission_rule"),
  ]);
  const ruleMap = new Map<string, any>(rules.map((r) => [r.id, r]));
  return snapshots
    .filter((s) => {
      if (attributedUserId && s.attributedUserId !== attributedUserId) return false;
      if (orderId && s.orderId !== orderId) return false;
      return true;
    })
    .map((s) => ({ ...s, rule: ruleMap.get(s.ruleId) ?? null }))
    .sort((a, b) =>
      String(b.earnedAt ?? "").localeCompare(String(a.earnedAt ?? "")),
    );
}

import { roundMoney } from "../finance/money";
import { serverMessages } from "@platform/locales";
import { runAtomicMutation } from "../api/atomic";
import { listTableRows, upsertTableRow } from "../api/tables";
import { companyCurrency } from "../finance/company-currency";

export type AttributedDocument = "quotation" | "invoice";

const toIso = (v: unknown): string => {
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "string" && v) return new Date(v).toISOString();
  return new Date().toISOString();
};

export async function resolveSalesOwner(
  requested: string | null | undefined,
  issuerId: string | null | undefined,
): Promise<string | null> {
  const id = requested || issuerId || null;
  if (!id) return null;
  const users = await listTableRows<Record<string, any>>("identity", "user");
  const user = users.find((u) => u.id === id);
  if (!user?.isActive)
    throw new Error(serverMessages.creditTheDocumentToAnActiveTeam);
  return id;
}

export async function listSalesPeople() {
  const users = await listTableRows<Record<string, any>>("identity", "user", "full_name ASC");
  const allowedRoles = new Set([
    "sales",
    "admin",
    "super_admin",
    "marketing",
    "operations_manager",
  ]);
  return users
    .filter(
      (u) =>
        Boolean(u.isActive) &&
        (allowedRoles.has(String(u.role ?? "")) || u.commissionRatePercent != null),
    )
    .sort((a, b) => String(a.fullName ?? "").localeCompare(String(b.fullName ?? "")))
    .map((u) => ({
      id: String(u.id),
      name: String(u.fullName ?? ""),
      role: String(u.role ?? ""),
      commissionRate:
        u.commissionRatePercent == null ? null : Number(u.commissionRatePercent),
    }));
}

export async function reassignSalesOwner(
  entityType: AttributedDocument,
  entityId: string,
  toUserId: string,
  actorId: string,
  reason?: string | null,
) {
  return runAtomicMutation(async () => {
    const schema = entityType === "quotation" ? "sales" : "finance";
    const table = entityType === "quotation" ? "quotation" : "invoice";
    const rows = await listTableRows<Record<string, any>>(schema, table);
    const current = rows.find((r) => r.id === entityId);
    if (!current)
      throw new Error(
        `${entityType === "quotation" ? "Quotation" : "Invoice"} not found`,
      );
    if (current.salesOwnerId === toUserId) return { changed: false };
    await resolveSalesOwner(toUserId, null);
    await upsertTableRow(schema, table, {
      id: entityId,
      salesOwnerId: toUserId,
    });
    await upsertTableRow("sales", "sales_attribution_change", {
      id: crypto.randomUUID(),
      entityType,
      entityId,
      fromUserId: current.salesOwnerId ?? null,
      toUserId,
      changedById: actorId,
      reason: reason?.trim() || null,
    });
    return { changed: true };
  });
}

export interface AttributionInfo {
  issuedBy: { id: string; name: string } | null;
  salesOwner: { id: string; name: string } | null;
  history: Array<{
    id: string;
    from: string | null;
    to: string;
    changedBy: string;
    reason: string | null;
    at: string;
  }>;
}

export async function getAttribution(
  entityType: AttributedDocument,
  entityId: string,
): Promise<AttributionInfo> {
  const schema = entityType === "quotation" ? "sales" : "finance";
  const table = entityType === "quotation" ? "quotation" : "invoice";
  const [docs, changes, users] = await Promise.all([
    listTableRows<Record<string, any>>(schema, table),
    listTableRows<Record<string, any>>("sales", "sales_attribution_change", "created_at DESC"),
    listTableRows<Record<string, any>>("identity", "user"),
  ]);
  const userById = new Map(users.map((u) => [String(u.id), String(u.fullName ?? "")]));
  const doc = docs.find((d) => d.id === entityId);
  const history = changes
    .filter((h) => h.entityType === entityType && h.entityId === entityId)
    .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime());

  const createdById = doc?.createdById ? String(doc.createdById) : null;
  const salesOwnerId = doc?.salesOwnerId ? String(doc.salesOwnerId) : null;

  return {
    issuedBy:
      createdById && userById.has(createdById)
        ? { id: createdById, name: userById.get(createdById)! }
        : null,
    salesOwner:
      salesOwnerId && userById.has(salesOwnerId)
        ? { id: salesOwnerId, name: userById.get(salesOwnerId)! }
        : null,
    history: history.map((h) => ({
      id: String(h.id),
      from: h.fromUserId ? (userById.get(String(h.fromUserId)) ?? null) : null,
      to: userById.get(String(h.toUserId)) ?? String(h.toUserId ?? ""),
      changedBy: userById.get(String(h.changedById)) ?? String(h.changedById ?? ""),
      reason: h.reason ?? null,
      at: toIso(h.createdAt),
    })),
  };
}

export async function setUserCommissionRate(
  userId: string,
  rate: number | null,
) {
  if (rate !== null && !(Number.isFinite(rate) && rate >= 0 && rate <= 100))
    throw new Error(serverMessages.theCommissionRateMustBeBetween0);
  const rounded = rate === null ? null : Math.round(rate * 100) / 100;
  const updated = await upsertTableRow<Record<string, any>>("identity", "user", {
    id: userId,
    commissionRatePercent: rounded,
  });
  return {
    commission_rate_percent:
      updated.commissionRatePercent == null
        ? null
        : Number(updated.commissionRatePercent),
  };
}

export interface CommissionRow {
  userId: string;
  name: string;
  role: string;
  ratePercent: number;
  invoices: number;
  collectedNet: number;
  commission: number;
  payout: {
    id: string;
    amount: number;
    recordedAt: string;
    expenseId: string | null;
    viaPayroll: boolean;
  } | null;
  onPayroll: boolean;
}

function monthRange(month: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))
    throw new Error(serverMessages.chooseAMonth);
  const [y, m] = month.split("-").map(Number);
  return {
    gte: new Date(Date.UTC(y, m - 1, 1)),
    lt: new Date(Date.UTC(y, m, 1)),
  };
}

export async function commissionsForRange(
  range: { gte: Date; lt: Date },
  userIds?: string[],
) {
  const FUNCTIONAL_CURRENCY = await companyCurrency();
  const [payments, invoices] = await Promise.all([
    listTableRows<Record<string, any>>("finance", "payment"),
    listTableRows<Record<string, any>>("finance", "invoice"),
  ]);
  const invoiceById = new Map(invoices.map((i) => [String(i.id), i]));
  const allowedUsers = userIds ? new Set(userIds) : null;
  const gteMs = range.gte.getTime();
  const ltMs = range.lt.getTime();

  const byOwner = new Map<string, { net: number; invoices: Set<string> }>();
  for (const p of payments) {
    if (p.currency !== FUNCTIONAL_CURRENCY) continue;
    const pMs = new Date(p.paymentDate).getTime();
    if (!(pMs >= gteMs && pMs < ltMs)) continue;
    const inv = p.invoiceId ? invoiceById.get(String(p.invoiceId)) : null;
    if (!inv || inv.status === "void" || !inv.salesOwnerId) continue;
    const ownerId = String(inv.salesOwnerId);
    if (allowedUsers && !allowedUsers.has(ownerId)) continue;

    const amount = Number(p.amount);
    const total = Number(inv.totalAmount);
    const net =
      total > 0
        ? amount -
          ((Number(inv.vatAmount ?? 0) + Number(inv.otherTaxAmount ?? 0)) * amount) /
            total
        : amount;
    const row = byOwner.get(ownerId) ?? {
      net: 0,
      invoices: new Set<string>(),
    };
    row.net += net;
    row.invoices.add(String(inv.id));
    byOwner.set(ownerId, row);
  }
  return byOwner;
}

export const commissionAmount = (collectedNet: number, ratePercent: number, currency?: string) =>
  currency ? roundMoney(collectedNet * ratePercent / 100, currency) : Math.round(collectedNet * ratePercent * 10) / 1000;

export async function getCommissionStatement(
  month: string,
): Promise<CommissionRow[]> {
  const currency = await companyCurrency();
  const range = monthRange(month);
  const [byOwner, allUsers, allPayouts, hrPolicies, employees] = await Promise.all([
    commissionsForRange(range),
    listTableRows<Record<string, any>>("identity", "user"),
    listTableRows<Record<string, any>>("finance", "commission_payout"),
    listTableRows<Record<string, any>>("system", "hr_policy"),
    listTableRows<Record<string, any>>("hr", "employee"),
  ]);

  const people = allUsers.filter(
    (u) => u.commissionRatePercent != null || byOwner.has(String(u.id)),
  );
  const payouts = allPayouts.filter((p) => p.periodMonth === month);
  const policy = hrPolicies.find((p) => p.id === "default");
  const payrollStaff = employees.filter(
    (e) => e.userId != null && e.status !== "terminated",
  );

  const viaPayroll = new Set(
    (policy?.commissionInPayroll ?? true)
      ? payrollStaff.map((e) => String(e.userId))
      : [],
  );
  return people
    .map((u) => {
      const uid = String(u.id);
      const earned = byOwner.get(uid);
      const rate =
        u.commissionRatePercent == null ? 0 : Number(u.commissionRatePercent);
      const collectedNet = roundMoney(earned?.net ?? 0, currency);
      const payout = payouts.find((p) => p.userId === uid);
      return {
        userId: uid,
        name: String(u.fullName ?? ""),
        role: String(u.role ?? ""),
        ratePercent: rate,
        invoices: earned?.invoices.size ?? 0,
        collectedNet,
        commission: commissionAmount(collectedNet, rate, currency),
        payout: payout
          ? {
              id: String(payout.id),
              amount: Number(payout.amount),
              recordedAt: toIso(payout.createdAt),
              expenseId: payout.expenseId ?? null,
              viaPayroll: !!payout.payrollItemId,
            }
          : null,
        onPayroll: viaPayroll.has(uid),
      };
    })
    .sort((a, b) => b.collectedNet - a.collectedNet);
}

export async function recordCommissionPayout(
  userId: string,
  month: string,
  actorId: string,
) {
  const FUNCTIONAL_CURRENCY = await companyCurrency();
  return runAtomicMutation(async () => {
    const row = (await getCommissionStatement(month)).find(
      (r) => r.userId === userId,
    );
    if (!row) throw new Error(serverMessages.noCommissionForThisPersonInThat);
    if (row.payout)
      throw new Error(serverMessages.thisMonthSCommissionIsAlreadyRecorded);
    if (!(row.commission > 0))
      throw new Error(serverMessages.thereIsNoCommissionToPayFor);
    const [hrPolicies, employees, categories] = await Promise.all([
      listTableRows<Record<string, any>>("system", "hr_policy"),
      listTableRows<Record<string, any>>("hr", "employee"),
      listTableRows<Record<string, any>>("finance", "expense_category"),
    ]);
    const policy = hrPolicies.find((p) => p.id === "default");
    const employee = employees.find(
      (e) => e.userId === userId && e.status !== "terminated",
    );
    if ((policy?.commissionInPayroll ?? true) && employee)
      throw new Error(serverMessages.thisPersonIsOnPayrollTheirCommission);
    const category = categories.find((c) => c.slug === "commissions");
    const range = monthRange(month);
    const lastDay = new Date(range.lt.getTime() - 86400000);
    const expense = await upsertTableRow<Record<string, any>>("finance", "expense", {
      id: crypto.randomUUID(),
      categoryId: category?.id ?? null,
      scope: "internal",
      descriptionEn: `Sales commission ${month} · ${row.name} (${row.ratePercent}% of ${row.collectedNet.toFixed(3)} ${FUNCTIONAL_CURRENCY} collected)`,
      amount: row.commission,
      netAmount: row.commission,
      inputVatAmount: 0,
      isVatRecoverable: false,
      currency: FUNCTIONAL_CURRENCY,
      expenseDate: lastDay.toISOString(),
      vendorName: row.name,
      paymentMethod: "bank_transfer",
      status: "approved",
      createdById: actorId,
    });
    return upsertTableRow("finance", "commission_payout", {
      id: crypto.randomUUID(),
      userId,
      currency: FUNCTIONAL_CURRENCY,
      periodMonth: month,
      basisAmount: row.collectedNet,
      ratePercent: row.ratePercent,
      amount: row.commission,
      expenseId: expense.id,
      recordedById: actorId,
    });
  });
}

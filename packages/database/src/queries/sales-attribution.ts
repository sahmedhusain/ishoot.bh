import { serverMessages } from "@platform/locales";
import { db, runAtomicMutation } from "../db";
import { FUNCTIONAL_CURRENCY } from "../constants/finance";

export type AttributedDocument = "quotation" | "invoice";

/** The person a new document is credited to: the requested salesperson if valid, else the issuer. */
export async function resolveSalesOwner(
  requested: string | null | undefined,
  issuerId: string | null | undefined,
): Promise<string | null> {
  const id = requested || issuerId || null;
  if (!id) return null;
  const user = await db.user.findUnique({
    where: { id },
    select: { isActive: true },
  });
  if (!user?.isActive)
    throw new Error(serverMessages.creditTheDocumentToAnActiveTeam);
  return id;
}

/** People who can be credited with sales: anyone selling, plus anyone already owning documents or earning commission. */
export async function listSalesPeople() {
  const users = await db.user.findMany({
    where: {
      isActive: true,
      OR: [
        {
          role: {
            in: [
              "sales",
              "admin",
              "super_admin",
              "marketing",
              "operations_manager",
            ],
          },
        },
        { commissionRatePercent: { not: null } },
      ],
    },
    select: {
      id: true,
      fullName: true,
      role: true,
      commissionRatePercent: true,
    },
    orderBy: { fullName: "asc" },
  });
  return users.map((u) => ({
    id: u.id,
    name: u.fullName,
    role: u.role,
    commissionRate:
      u.commissionRatePercent == null ? null : Number(u.commissionRatePercent),
  }));
}

/** Credits a quotation or invoice to someone else and keeps the change in its internal history. */
export async function reassignSalesOwner(
  entityType: AttributedDocument,
  entityId: string,
  toUserId: string,
  actorId: string,
  reason?: string | null,
) {
  return runAtomicMutation(async () => {
    const current =
      entityType === "quotation"
        ? await db.quotation.findUnique({
            where: { id: entityId },
            select: { salesOwnerId: true },
          })
        : await db.invoice.findUnique({
            where: { id: entityId },
            select: { salesOwnerId: true, status: true },
          });
    if (!current)
      throw new Error(
        `${entityType === "quotation" ? "Quotation" : "Invoice"} not found`,
      );
    if (current.salesOwnerId === toUserId) return { changed: false };
    await resolveSalesOwner(toUserId, null);
    if (entityType === "quotation")
      await db.quotation.update({
        where: { id: entityId },
        data: { salesOwnerId: toUserId },
      });
    else
      await db.invoice.update({
        where: { id: entityId },
        data: { salesOwnerId: toUserId },
      });
    await db.salesAttributionChange.create({
      data: {
        entityType,
        entityId,
        fromUserId: current.salesOwnerId,
        toUserId,
        changedById: actorId,
        reason: reason?.trim() || null,
      },
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
  const select = {
    createdBy: { select: { id: true, fullName: true } },
    salesOwner: { select: { id: true, fullName: true } },
  } as const;
  const doc =
    entityType === "quotation"
      ? await db.quotation.findUnique({ where: { id: entityId }, select })
      : await db.invoice.findUnique({ where: { id: entityId }, select });
  const history = await db.salesAttributionChange.findMany({
    where: { entityType, entityId },
    include: {
      fromUser: { select: { fullName: true } },
      toUser: { select: { fullName: true } },
      changedBy: { select: { fullName: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return {
    issuedBy: doc?.createdBy
      ? { id: doc.createdBy.id, name: doc.createdBy.fullName }
      : null,
    salesOwner: doc?.salesOwner
      ? { id: doc.salesOwner.id, name: doc.salesOwner.fullName }
      : null,
    history: history.map((h) => ({
      id: h.id,
      from: h.fromUser?.fullName ?? null,
      to: h.toUser.fullName,
      changedBy: h.changedBy.fullName,
      reason: h.reason,
      at: h.createdAt.toISOString(),
    })),
  };
}

export async function setUserCommissionRate(
  userId: string,
  rate: number | null,
) {
  if (rate !== null && !(Number.isFinite(rate) && rate >= 0 && rate <= 100))
    throw new Error(serverMessages.theCommissionRateMustBeBetween0);
  const updated = await db.user.update({
    where: { id: userId },
    data: {
      commissionRatePercent:
        rate === null ? null : Math.round(rate * 100) / 100,
    },
    select: { commissionRatePercent: true },
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
  /** Paid with the salary (HR policy), so no separate payout is recorded. */
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

/**
 * Commission earned on money collected in [range.gte, range.lt) (net of VAT, BHD) on invoices credited to each
 * salesperson, at their commission rate. Shared by the commission statement and payroll.
 */
export async function commissionsForRange(
  range: { gte: Date; lt: Date },
  userIds?: string[],
) {
  const payments = await db.payment.findMany({
    where: {
      paymentDate: range,
      currency: FUNCTIONAL_CURRENCY,
      invoice: {
        status: { not: "void" },
        salesOwnerId: userIds ? { in: userIds } : { not: null },
      },
    },
    select: {
      amount: true,
      invoice: {
        select: {
          id: true,
          salesOwnerId: true,
          totalAmount: true,
          vatAmount: true,
          otherTaxAmount: true,
        },
      },
    },
  });
  const byOwner = new Map<string, { net: number; invoices: Set<string> }>();
  for (const p of payments) {
    const inv = p.invoice!;
    const amount = Number(p.amount);
    const total = Number(inv.totalAmount);
    // Commission is earned on revenue net of VAT and any other tax collected for the government.
    const net =
      total > 0
        ? amount -
          ((Number(inv.vatAmount) + Number(inv.otherTaxAmount ?? 0)) * amount) /
            total
        : amount;
    const row = byOwner.get(inv.salesOwnerId!) ?? {
      net: 0,
      invoices: new Set<string>(),
    };
    row.net += net;
    row.invoices.add(inv.id);
    byOwner.set(inv.salesOwnerId!, row);
  }
  return byOwner;
}

export const commissionAmount = (collectedNet: number, ratePercent: number) =>
  Math.round(collectedNet * ratePercent * 10) / 1000;

/**
 * Commission is earned on money collected in the month (net of VAT, BHD) on invoices credited to
 * the salesperson, at their commission rate. Closed, paid work is what counts.
 */
export async function getCommissionStatement(
  month: string,
): Promise<CommissionRow[]> {
  const range = monthRange(month);
  const [byOwner, people, payouts, policy, payrollStaff] = await Promise.all([
    commissionsForRange(range),
    db.user.findMany({
      where: {
        OR: [
          { commissionRatePercent: { not: null } },
          {
            invoicesOwned: {
              some: { payments: { some: { paymentDate: range } } },
            },
          },
        ],
      },
      select: {
        id: true,
        fullName: true,
        role: true,
        commissionRatePercent: true,
      },
    }),
    db.commissionPayout.findMany({ where: { periodMonth: month } }),
    db.hrPolicy.findUnique({
      where: { id: "default" },
      select: { commissionInPayroll: true },
    }),
    db.employee.findMany({
      where: { userId: { not: null }, status: { not: "terminated" } },
      select: { userId: true },
    }),
  ]);
  const viaPayroll = new Set(
    (policy?.commissionInPayroll ?? true)
      ? payrollStaff.map((e) => e.userId)
      : [],
  );
  return people
    .map((u) => {
      const earned = byOwner.get(u.id);
      const rate =
        u.commissionRatePercent == null ? 0 : Number(u.commissionRatePercent);
      const collectedNet = Math.round((earned?.net ?? 0) * 1000) / 1000;
      const payout = payouts.find((p) => p.userId === u.id);
      return {
        userId: u.id,
        name: u.fullName,
        role: u.role,
        ratePercent: rate,
        invoices: earned?.invoices.size ?? 0,
        collectedNet,
        commission: commissionAmount(collectedNet, rate),
        payout: payout
          ? {
              id: payout.id,
              amount: Number(payout.amount),
              recordedAt: payout.createdAt.toISOString(),
              expenseId: payout.expenseId,
              viaPayroll: !!payout.payrollItemId,
            }
          : null,
        onPayroll: viaPayroll.has(u.id),
      };
    })
    .sort((a, b) => b.collectedNet - a.collectedNet);
}

/** Records a month's commission once, booking it as an approved payroll-type expense. */
export async function recordCommissionPayout(
  userId: string,
  month: string,
  actorId: string,
) {
  return runAtomicMutation(async () => {
    const row = (await getCommissionStatement(month)).find(
      (r) => r.userId === userId,
    );
    if (!row) throw new Error(serverMessages.noCommissionForThisPersonInThat);
    if (row.payout)
      throw new Error(serverMessages.thisMonthSCommissionIsAlreadyRecorded);
    if (!(row.commission > 0))
      throw new Error(serverMessages.thereIsNoCommissionToPayFor);
    // Staff on payroll receive commission with their salary when the HR policy says so.
    const [policy, employee] = await Promise.all([
      db.hrPolicy.findUnique({
        where: { id: "default" },
        select: { commissionInPayroll: true },
      }),
      db.employee.findFirst({
        where: { userId, status: { not: "terminated" } },
        select: { id: true },
      }),
    ]);
    if ((policy?.commissionInPayroll ?? true) && employee)
      throw new Error(serverMessages.thisPersonIsOnPayrollTheirCommission);
    const category = await db.expenseCategory.findUnique({
      where: { slug: "commissions" },
      select: { id: true },
    });
    const range = monthRange(month);
    const lastDay = new Date(range.lt.getTime() - 86400000);
    const expense = await db.expense.create({
      data: {
        categoryId: category?.id ?? null,
        scope: "internal",
        descriptionEn: `Sales commission ${month} · ${row.name} (${row.ratePercent}% of ${row.collectedNet.toFixed(3)} BHD collected)`,
        amount: row.commission,
        netAmount: row.commission,
        inputVatAmount: 0,
        isVatRecoverable: false,
        currency: FUNCTIONAL_CURRENCY,
        expenseDate: lastDay,
        vendorName: row.name,
        paymentMethod: "bank_transfer",
        status: "approved",
        createdById: actorId,
      },
    });
    return db.commissionPayout.create({
      data: {
        userId,
        periodMonth: month,
        basisAmount: row.collectedNet,
        ratePercent: row.ratePercent,
        amount: row.commission,
        expenseId: expense.id,
        recordedById: actorId,
      },
    });
  });
}

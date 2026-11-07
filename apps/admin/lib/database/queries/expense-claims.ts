import { roundMoney, validMoneyAmount } from "../finance/money";
import { assertCompanyCurrency } from "../finance/company-currency";
import { serverMessages } from "@platform/locales";
import { db, runAtomicMutation } from "../atomic";
import {
  EXPENSE_PAYMENT_METHODS,
} from "../constants/finance";
import { claimUploadOrLink } from "../services/uploads";
import { getNextSequenceNumber } from "./sequence";

export const EXPENSE_CLAIM_STATUSES = [
  "submitted",
  "approved",
  "rejected",
  "scheduled",
  "paid",
  "cancelled",
] as const;
export type ExpenseClaimStatus = (typeof EXPENSE_CLAIM_STATUSES)[number];

export interface ExpenseClaimRow {
  id: string;
  claimNumber: string;
  claimantId: string;
  claimantName: string;
  amount: number;
  currency: string;
  expenseDate: string;
  reason: string;
  categoryId: string | null;
  categoryName: { en: string; ar: string } | null;
  deal: { id: string; title: string } | null;
  invoice: { id: string; number: string } | null;
  meeting: { id: string; title: string; startDate: string } | null;
  receiptUrl: string;
  status: ExpenseClaimStatus;
  reviewNotes: string | null;
  scheduledForDate: string | null;
  paidAt: string | null;
  paidByName: string | null;
  paymentMethod: string | null;
  paymentReference: string | null;
  expenseId: string | null;
  createdAt: string;
}

const claimInclude = {
  claimant: { select: { fullName: true } },
  category: { select: { nameEn: true, nameAr: true } },
  deal: { select: { id: true, title: true } },
  invoice: { select: { id: true, invoiceNumber: true } },
  calendarEvent: { select: { id: true, title: true, startDate: true } },
  paidBy: { select: { fullName: true } },
} as const;

function mapClaim(c: any): ExpenseClaimRow {
  return {
    id: c.id,
    claimNumber: c.claimNumber,
    claimantId: c.claimantId,
    claimantName: c.claimant?.fullName ?? "",
    amount: Number(c.amount),
    currency: c.currency,
    expenseDate: c.expenseDate.toISOString().slice(0, 10),
    reason: c.reason,
    categoryId: c.categoryId,
    categoryName: c.category
      ? { en: c.category.nameEn, ar: c.category.nameAr }
      : null,
    deal: c.deal ? { id: c.deal.id, title: c.deal.title } : null,
    invoice: c.invoice
      ? { id: c.invoice.id, number: c.invoice.invoiceNumber }
      : null,
    meeting: c.calendarEvent
      ? {
          id: c.calendarEvent.id,
          title: c.calendarEvent.title,
          startDate: c.calendarEvent.startDate.toISOString(),
        }
      : null,
    receiptUrl: c.receiptUrl,
    status: c.status,
    reviewNotes: c.reviewNotes,
    scheduledForDate: c.scheduledForDate
      ? c.scheduledForDate.toISOString().slice(0, 10)
      : null,
    paidAt: c.paidAt ? c.paidAt.toISOString() : null,
    paidByName: c.paidBy?.fullName ?? null,
    paymentMethod: c.paymentMethod,
    paymentReference: c.paymentReference,
    expenseId: c.expenseId,
    createdAt: c.createdAt.toISOString(),
  };
}

export interface ExpenseClaimInput {
  amount: number;
  currency?: string;
  expenseDate: string;
  reason: string;
  categoryId?: string | null;
  dealId?: string | null;
  invoiceId?: string | null;
  calendarEventId?: string | null;
  receiptUrl: string;
}

/** Files a claim with its receipt; the caller submits it for approval in the same transaction. */
export async function createExpenseClaim(
  input: ExpenseClaimInput,
  claimantId: string,
): Promise<ExpenseClaimRow> {
  if (!Number.isFinite(input.amount) || input.amount <= 0)
    throw new Error(serverMessages.claimAmountMustBePositive);
  const reason = input.reason?.trim();
  if (!reason || reason.length > 1000)
    throw new Error(serverMessages.explainWhatTheExpenseWasFor);
  const currency = await assertCompanyCurrency(input.currency);
  if (!validMoneyAmount(input.amount, currency)) throw new Error(serverMessages.paymentCurrencyPrecisionInvalid);
  if (!input.receiptUrl)
    throw new Error(serverMessages.attachAPhotoOrScanOfThe);
  const date = new Date(input.expenseDate);
  if (Number.isNaN(date.getTime()) || date > new Date(Date.now() + 86400000))
    throw new Error(serverMessages.enterTheDateYouPaid);
  return runAtomicMutation(async () => {
    await assertCompanyCurrency(currency);
    if (
      input.categoryId &&
      !(await db.expenseCategory.findFirst({
        where: { id: input.categoryId, isActive: true },
        select: { id: true },
      }))
    )
      throw new Error(serverMessages.chooseAnActiveExpenseCategory);
    if (
      input.dealId &&
      !(await db.crmDeal.findUnique({
        where: { id: input.dealId },
        select: { id: true },
      }))
    )
      throw new Error(serverMessages.dealNotFound);
    if (
      input.invoiceId &&
      !(await db.invoice.findUnique({
        where: { id: input.invoiceId },
        select: { id: true },
      }))
    )
      throw new Error(serverMessages.invoiceNotFound);
    if (
      input.calendarEventId &&
      !(await db.calendarEvent.findUnique({
        where: { id: input.calendarEventId },
        select: { id: true },
      }))
    )
      throw new Error(serverMessages.meetingNotFound);
    const upload = await claimUploadOrLink(input.receiptUrl, claimantId);
    const claim = await db.expenseClaim.create({
      data: {
        claimNumber: await getNextSequenceNumber("CLM", date.getUTCFullYear()),
        claimantId,
        amount: roundMoney(input.amount, currency),
        currency,
        expenseDate: date,
        reason,
        categoryId: input.categoryId || null,
        dealId: input.dealId || null,
        invoiceId: input.invoiceId || null,
        calendarEventId: input.calendarEventId || null,
        receiptUrl: input.receiptUrl,
      },
      include: claimInclude,
    });
    if (upload)
      await db.attachment.create({
        data: {
          entityType: "expense_claim",
          entityId: claim.id,
          fileName: upload.fileName,
          fileUrl: upload.fileUrl,
          fileSize: upload.fileSize,
          mimeType: upload.mimeType,
          uploadedById: claimantId,
        },
      });
    return mapClaim(claim);
  });
}

export async function getExpenseClaim(id: string) {
  const claim = await db.expenseClaim.findUnique({
    where: { id },
    include: claimInclude,
  });
  return claim ? mapClaim(claim) : null;
}

export interface ExpenseClaimListResult {
  items: ExpenseClaimRow[];
  stats: {
    submitted: number;
    approved: number;
    scheduled: number;
    paidThisMonth: number;
    outstanding: { currency: string; amount: number }[];
  };
}

/** A claimant's own claims, or (for finance) everyone's. */
export async function listExpenseClaims(options: {
  claimantId?: string;
  status?: string;
  take?: number;
  /** Data scope: the claimants whose claims the viewer may see; null or missing for everyone. */
  claimantIds?: string[] | null;
}): Promise<ExpenseClaimListResult> {
  const base = options.claimantId
    ? { claimantId: options.claimantId }
    : options.claimantIds
      ? { claimantId: { in: options.claimantIds } }
      : {};
  const where = {
    ...base,
    ...(options.status &&
      options.status !== "all" && { status: options.status }),
  };
  const monthStart = new Date(
    Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1),
  );
  const [rows, grouped, paidThisMonth, outstanding] = await Promise.all([
    db.expenseClaim.findMany({
      where,
      include: claimInclude,
      orderBy: [{ createdAt: "desc" }],
      take: options.take ?? 200,
    }),
    db.expenseClaim.groupBy({
      by: ["status"],
      where: base,
      _count: { _all: true },
    }),
    db.expenseClaim.count({
      where: { ...base, status: "paid", paidAt: { gte: monthStart } },
    }),
    db.expenseClaim.groupBy({
      by: ["currency"],
      where: { ...base, status: { in: ["approved", "scheduled"] } },
      _sum: { amount: true },
    }),
  ]);
  const count = (status: string) =>
    grouped.find((g) => g.status === status)?._count._all ?? 0;
  return {
    items: rows.map(mapClaim),
    stats: {
      submitted: count("submitted"),
      approved: count("approved"),
      scheduled: count("scheduled"),
      paidThisMonth,
      outstanding: outstanding.map((o) => ({
        currency: o.currency,
        amount: Number(o._sum.amount ?? 0),
      })),
    },
  };
}

/** Finance stages an approved claim for the next payment run. */
export async function scheduleExpenseClaim(
  id: string,
  actorId: string,
  payOn?: string | null,
) {
  return runAtomicMutation(async () => {
    const claim = await db.expenseClaim.findUniqueOrThrow({
      where: { id },
      select: { status: true },
    });
    if (claim.status !== "approved")
      throw new Error(serverMessages.onlyApprovedClaimsCanBeScheduledFor);
    const date = payOn ? new Date(payOn) : null;
    if (date && Number.isNaN(date.getTime()))
      throw new Error(serverMessages.invalidPaymentDate);
    return mapClaim(
      await db.expenseClaim.update({
        where: { id },
        data: {
          status: "scheduled",
          scheduledAt: new Date(),
          scheduledById: actorId,
          scheduledForDate: date,
        },
        include: claimInclude,
      }),
    );
  });
}

/**
 * Marks a claim reimbursed and records the expense it represents, filed against the claim's deal
 * (and so its client) or as an internal cost, already approved because the claim was.
 */
export async function payExpenseClaim(
  id: string,
  actorId: string,
  payment: {
    method: string;
    reference?: string | null;
    categoryId?: string | null;
  },
) {
  if (!(EXPENSE_PAYMENT_METHODS as readonly string[]).includes(payment.method))
    throw new Error(serverMessages.chooseHowTheClaimWasPaid);
  return runAtomicMutation(async () => {
    const claim = await db.expenseClaim.findUniqueOrThrow({
      where: { id },
      include: {
        claimant: { select: { fullName: true } },
        deal: { select: { contactId: true } },
      },
    });
    if (!["approved", "scheduled"].includes(claim.status))
      throw new Error(serverMessages.onlyApprovedClaimsCanBePaid);
    const categoryId = payment.categoryId || claim.categoryId;
    if (!categoryId)
      throw new Error(serverMessages.chooseTheExpenseCategoryBeforePaying);
    const expense = await db.expense.create({
      data: {
        categoryId,
        dealId: claim.dealId,
        clientId: claim.deal?.contactId ?? null,
        scope: claim.dealId ? "deal" : "internal",
        descriptionEn: `${claim.claimNumber} · ${claim.reason}`.slice(0, 500),
        amount: claim.amount,
        netAmount: claim.amount,
        inputVatAmount: 0,
        isVatRecoverable: false,
        currency: claim.currency,
        expenseDate: claim.expenseDate,
        vendorName: claim.claimant.fullName,
        receiptUrl: claim.receiptUrl,
        paymentMethod: "staff_reimbursement",
        notes: payment.reference
          ? `Reimbursed via ${payment.method}: ${payment.reference}`
          : `Reimbursed via ${payment.method}`,
        status: "approved",
        createdById: actorId,
      },
    });
    return mapClaim(
      await db.expenseClaim.update({
        where: { id },
        data: {
          status: "paid",
          paidAt: new Date(),
          paidById: actorId,
          paymentMethod: payment.method,
          paymentReference: payment.reference?.trim() || null,
          categoryId,
          expenseId: expense.id,
        },
        include: claimInclude,
      }),
    );
  });
}

/** A claimant can withdraw a claim that has not been decided yet. */
export async function cancelExpenseClaim(id: string, actorId: string) {
  return runAtomicMutation(async () => {
    const claim = await db.expenseClaim.findUniqueOrThrow({
      where: { id },
      select: { status: true, claimantId: true },
    });
    if (claim.claimantId !== actorId)
      throw new Error(serverMessages.onlyTheClaimantCanWithdrawThisClaim);
    if (claim.status !== "submitted")
      throw new Error(serverMessages.onlyClaimsAwaitingApprovalCanBeWithdrawn);
    await db.approvalRequest.updateMany({
      where: { targetType: "expense_claim", targetId: id, status: "pending" },
      data: { status: "cancelled" },
    });
    return mapClaim(
      await db.expenseClaim.update({
        where: { id },
        data: { status: "cancelled" },
        include: claimInclude,
      }),
    );
  });
}

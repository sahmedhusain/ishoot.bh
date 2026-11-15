import { roundMoney, validMoneyAmount } from "../finance/money";
import { assertCompanyCurrency } from "../finance/company-currency";
import { serverMessages } from "@platform/locales";
import { runAtomicMutation } from "../api/atomic";
import { listTableRows, upsertTableRow } from "../api/tables";
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

const toIsoStr = (v: any): string =>
  v instanceof Date ? v.toISOString() : v ? String(v) : "";

async function hydrateClaims(claims: any[]) {
  if (!claims.length) return [];
  const [users, categories, deals, invoices, events] = await Promise.all([
    listTableRows<any>("identity", "user").catch(() => []),
    listTableRows<any>("finance", "expense_category").catch(() => []),
    listTableRows<any>("sales", "crm_deal").catch(() => []),
    listTableRows<any>("finance", "invoice").catch(() => []),
    listTableRows<any>("workflow", "calendar_event").catch(() => []),
  ]);
  const userMap = new Map<string, any>(users.map((u): [any, any] => [u.id, u]));
  const catMap = new Map<string, any>(categories.map((c): [any, any] => [c.id, c]));
  const dealMap = new Map<string, any>(deals.map((d): [any, any] => [d.id, d]));
  const invMap = new Map<string, any>(invoices.map((i): [any, any] => [i.id, i]));
  const evtMap = new Map<string, any>(events.map((e): [any, any] => [e.id, e]));
  return claims.map((c) => ({
    ...c,
    claimant: c.claimantId ? userMap.get(c.claimantId) ?? null : null,
    paidBy: c.paidById ? userMap.get(c.paidById) ?? null : null,
    category: c.categoryId ? catMap.get(c.categoryId) ?? null : null,
    deal: c.dealId ? dealMap.get(c.dealId) ?? null : null,
    invoice: c.invoiceId ? invMap.get(c.invoiceId) ?? null : null,
    calendarEvent: c.calendarEventId ? evtMap.get(c.calendarEventId) ?? null : null,
  }));
}

function mapClaim(c: any): ExpenseClaimRow {
  return {
    id: c.id,
    claimNumber: c.claimNumber,
    claimantId: c.claimantId,
    claimantName: c.claimant?.fullName ?? "",
    amount: Number(c.amount),
    currency: c.currency,
    expenseDate: toIsoStr(c.expenseDate).slice(0, 10),
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
          startDate: toIsoStr(c.calendarEvent.startDate),
        }
      : null,
    receiptUrl: c.receiptUrl,
    status: c.status,
    reviewNotes: c.reviewNotes,
    scheduledForDate: c.scheduledForDate
      ? toIsoStr(c.scheduledForDate).slice(0, 10)
      : null,
    paidAt: c.paidAt ? toIsoStr(c.paidAt) : null,
    paidByName: c.paidBy?.fullName ?? null,
    paymentMethod: c.paymentMethod,
    paymentReference: c.paymentReference,
    expenseId: c.expenseId,
    createdAt: toIsoStr(c.createdAt) || new Date().toISOString(),
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
      !(await listTableRows<any>("finance", "expense_category")).some(
        (c) => c.id === input.categoryId && c.isActive,
      )
    )
      throw new Error(serverMessages.chooseAnActiveExpenseCategory);
    if (
      input.dealId &&
      !(await listTableRows<any>("sales", "crm_deal")).some(
        (d) => d.id === input.dealId,
      )
    )
      throw new Error(serverMessages.dealNotFound);
    if (
      input.invoiceId &&
      !(await listTableRows<any>("finance", "invoice")).some(
        (i) => i.id === input.invoiceId,
      )
    )
      throw new Error(serverMessages.invoiceNotFound);
    if (
      input.calendarEventId &&
      !(await listTableRows<any>("workflow", "calendar_event")).some(
        (e) => e.id === input.calendarEventId,
      )
    )
      throw new Error(serverMessages.meetingNotFound);
    const upload = await claimUploadOrLink(input.receiptUrl, claimantId);
    const claim = await upsertTableRow<any>("finance", "expense_claim", {
      id: crypto.randomUUID(),
      claimNumber: await getNextSequenceNumber("CLM", date.getUTCFullYear()),
      claimantId,
      amount: roundMoney(input.amount, currency),
      currency,
      expenseDate: date.toISOString(),
      reason,
      categoryId: input.categoryId || null,
      dealId: input.dealId || null,
      invoiceId: input.invoiceId || null,
      calendarEventId: input.calendarEventId || null,
      receiptUrl: input.receiptUrl,
      status: "submitted",
    });
    if (upload)
      await upsertTableRow("notify", "attachment", {
        id: crypto.randomUUID(),
        entityType: "expense_claim",
        entityId: claim.id,
        fileName: upload.fileName,
        fileUrl: upload.fileUrl,
        fileSize: upload.fileSize,
        mimeType: upload.mimeType,
        uploadedById: claimantId,
      });
    const [hydrated] = await hydrateClaims([claim]);
    return mapClaim(hydrated);
  });
}

export async function getExpenseClaim(id: string) {
  const claims = await listTableRows<any>("finance", "expense_claim");
  const claim = claims.find((c) => c.id === id);
  if (!claim) return null;
  const [hydrated] = await hydrateClaims([claim]);
  return mapClaim(hydrated);
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

export async function listExpenseClaims(options: {
  claimantId?: string;
  status?: string;
  take?: number;
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
  const allClaims = await listTableRows<any>("finance", "expense_claim");
  const baseRows = allClaims.filter((c) => {
    if (options.claimantId) return c.claimantId === options.claimantId;
    if (options.claimantIds) return options.claimantIds.includes(c.claimantId);
    return true;
  });
  const rows = baseRows
    .filter(
      (c) => !options.status || options.status === "all" || c.status === options.status,
    )
    .sort((a, b) =>
      String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? "")),
    )
    .slice(0, options.take ?? 200);
  const hydrated = await hydrateClaims(rows);
  const count = (status: string) =>
    baseRows.filter((c) => c.status === status).length;
  const paidThisMonth = baseRows.filter(
    (c) => c.status === "paid" && c.paidAt && new Date(c.paidAt) >= monthStart,
  ).length;
  const outByCurrency = new Map<string, number>();
  for (const c of baseRows) {
    if (["approved", "scheduled"].includes(c.status)) {
      outByCurrency.set(
        c.currency,
        (outByCurrency.get(c.currency) ?? 0) + Number(c.amount ?? 0),
      );
    }
  }
  return {
    items: hydrated.map(mapClaim),
    stats: {
      submitted: count("submitted"),
      approved: count("approved"),
      scheduled: count("scheduled"),
      paidThisMonth,
      outstanding: Array.from(outByCurrency.entries()).map(
        ([currency, amount]) => ({ currency, amount }),
      ),
    },
  };
}

export async function scheduleExpenseClaim(
  id: string,
  actorId: string,
  payOn?: string | null,
) {
  return runAtomicMutation(async () => {
    const claims = await listTableRows<any>("finance", "expense_claim");
    const claim = claims.find((c) => c.id === id);
    if (!claim) throw new Error("Claim not found");
    if (claim.status !== "approved")
      throw new Error(serverMessages.onlyApprovedClaimsCanBeScheduledFor);
    const date = payOn ? new Date(payOn) : null;
    if (date && Number.isNaN(date.getTime()))
      throw new Error(serverMessages.invalidPaymentDate);
    const updated = await upsertTableRow("finance", "expense_claim", {
      ...claim,
      status: "scheduled",
      scheduledAt: new Date().toISOString(),
      scheduledById: actorId,
      scheduledForDate: date ? date.toISOString() : null,
    });
    const [hydrated] = await hydrateClaims([updated]);
    return mapClaim(hydrated);
  });
}

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
    const [claims, users, deals] = await Promise.all([
      listTableRows<any>("finance", "expense_claim"),
      listTableRows<any>("identity", "user"),
      listTableRows<any>("sales", "crm_deal"),
    ]);
    const rawClaim = claims.find((c) => c.id === id);
    if (!rawClaim) throw new Error("Claim not found");
    const claimant = users.find((u) => u.id === rawClaim.claimantId);
    const deal = rawClaim.dealId
      ? deals.find((d) => d.id === rawClaim.dealId)
      : null;
    if (!["approved", "scheduled"].includes(rawClaim.status))
      throw new Error(serverMessages.onlyApprovedClaimsCanBePaid);
    const categoryId = payment.categoryId || rawClaim.categoryId;
    if (!categoryId)
      throw new Error(serverMessages.chooseTheExpenseCategoryBeforePaying);
    const expense = await upsertTableRow<any>("finance", "expense", {
      id: crypto.randomUUID(),
      categoryId,
      dealId: rawClaim.dealId,
      clientId: deal?.contactId ?? null,
      scope: rawClaim.dealId ? "deal" : "internal",
      descriptionEn: `${rawClaim.claimNumber} · ${rawClaim.reason}`.slice(0, 500),
      amount: rawClaim.amount,
      netAmount: rawClaim.amount,
      inputVatAmount: 0,
      isVatRecoverable: false,
      currency: rawClaim.currency,
      expenseDate: rawClaim.expenseDate,
      vendorName: claimant?.fullName ?? "",
      receiptUrl: rawClaim.receiptUrl,
      paymentMethod: "staff_reimbursement",
      notes: payment.reference
        ? `Reimbursed via ${payment.method}: ${payment.reference}`
        : `Reimbursed via ${payment.method}`,
      status: "approved",
      createdById: actorId,
    });
    const updated = await upsertTableRow("finance", "expense_claim", {
      ...rawClaim,
      status: "paid",
      paidAt: new Date().toISOString(),
      paidById: actorId,
      paymentMethod: payment.method,
      paymentReference: payment.reference?.trim() || null,
      categoryId,
      expenseId: expense.id,
    });
    const [hydrated] = await hydrateClaims([updated]);
    return mapClaim(hydrated);
  });
}

export async function cancelExpenseClaim(id: string, actorId: string) {
  return runAtomicMutation(async () => {
    const [claims, approvals] = await Promise.all([
      listTableRows<any>("finance", "expense_claim"),
      listTableRows<any>("workflow", "approval_request"),
    ]);
    const claim = claims.find((c) => c.id === id);
    if (!claim) throw new Error("Claim not found");
    if (claim.claimantId !== actorId)
      throw new Error(serverMessages.onlyTheClaimantCanWithdrawThisClaim);
    if (claim.status !== "submitted")
      throw new Error(serverMessages.onlyClaimsAwaitingApprovalCanBeWithdrawn);
    await Promise.all(
      approvals
        .filter(
          (a) =>
            a.targetType === "expense_claim" &&
            a.targetId === id &&
            a.status === "pending",
        )
        .map((a) =>
          upsertTableRow("workflow", "approval_request", {
            ...a,
            status: "cancelled",
          }),
        ),
    );
    const updated = await upsertTableRow("finance", "expense_claim", {
      ...claim,
      status: "cancelled",
    });
    const [hydrated] = await hydrateClaims([updated]);
    return mapClaim(hydrated);
  });
}

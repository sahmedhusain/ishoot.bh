import { serverMessages } from "@platform/locales";
import { db, runAtomicMutation } from "../db";
import { ROUTES } from "../constants/routes";
import { hasPermission } from "./permissions";
import { createExpense } from "./expenses";
import { submitForApproval } from "../services/approval-engine";
import type { SupportedCurrency } from "../types";

export const EXPENSE_FREQUENCIES = [
  "weekly",
  "monthly",
  "quarterly",
  "semiannual",
  "yearly",
] as const;
export type ExpenseFrequency = (typeof EXPENSE_FREQUENCIES)[number];
const MONTHS: Record<ExpenseFrequency, number> = {
  weekly: 0,
  monthly: 1,
  quarterly: 3,
  semiannual: 6,
  yearly: 12,
};
/** Average occurrences per month, for the monthly-equivalent cost. */
const PER_MONTH: Record<ExpenseFrequency, number> = {
  weekly: 52 / 12,
  monthly: 1,
  quarterly: 1 / 3,
  semiannual: 1 / 6,
  yearly: 1 / 12,
};

export interface RecurringExpenseInput {
  title_en: string;
  title_ar?: string;
  category_id?: string;
  vendor_name?: string;
  reference?: string;
  amount: number;
  input_vat_amount?: number;
  is_vat_recoverable?: boolean;
  currency?: string;
  payment_method?: string;
  frequency: string;
  start_date: string;
  end_date?: string;
  auto_record: boolean;
  remind_days_before?: number;
  is_active: boolean;
  notes?: string;
}

export interface RecurringExpenseRecord {
  id: string;
  title_en: string;
  title_ar?: string;
  category_id?: string;
  category?: { name_en: string; name_ar: string; color: string };
  vendor_name?: string;
  reference?: string;
  amount: number;
  input_vat_amount: number;
  is_vat_recoverable: boolean;
  currency: string;
  payment_method?: string;
  frequency: ExpenseFrequency;
  start_date: string;
  end_date?: string;
  next_due_date: string;
  auto_record: boolean;
  remind_days_before: number;
  is_active: boolean;
  notes?: string;
  monthly_equivalent: number;
  /** Days until the next due date (negative when overdue). */
  days_until: number;
  recorded_count: number;
  last_recorded_at?: string;
}

const iso = (d: Date) => d.toISOString().slice(0, 10);
const day = (s: string) => new Date(`${s}T00:00:00Z`);
const todayBahrain = () =>
  day(new Date(Date.now() + 3 * 3600000).toISOString().slice(0, 10));

/** The due date after `date`: the same day of the month (the month's last day when shorter), or a week later. */
export function nextDueAfter(
  date: Date,
  frequency: ExpenseFrequency,
  anchorDay = date.getUTCDate(),
): Date {
  if (frequency === "weekly") return new Date(date.getTime() + 7 * 86400000);
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth() + MONTHS[frequency];
  const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return new Date(Date.UTC(y, m, Math.min(anchorDay, last)));
}

function normalize(input: RecurringExpenseInput) {
  const titleEn = input.title_en?.trim().slice(0, 150);
  if (!titleEn) throw new Error(serverMessages.enterTheBillSName);
  if (!(EXPENSE_FREQUENCIES as readonly string[]).includes(input.frequency))
    throw new Error(serverMessages.chooseHowOftenTheBillIs);
  const amount = Math.round(Number(input.amount) * 1000) / 1000;
  if (!Number.isFinite(amount) || amount <= 0)
    throw new Error(serverMessages.expenseAmountMustBePositive);
  const vat = Math.round(Number(input.input_vat_amount ?? 0) * 1000) / 1000;
  if (!Number.isFinite(vat) || vat < 0 || vat >= amount)
    throw new Error(serverMessages.inputVatMustBeLessThanThe);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(input.start_date ?? "") ||
    !Number.isFinite(Date.parse(input.start_date))
  )
    throw new Error(serverMessages.invalidDate);
  const end = input.end_date?.trim() || null;
  if (end && (!/^\d{4}-\d{2}-\d{2}$/.test(end) || end < input.start_date))
    throw new Error(serverMessages.theEndDateCannotBeBefore);
  const remind = Math.round(Number(input.remind_days_before ?? 3));
  if (!Number.isFinite(remind) || remind < 0 || remind > 60)
    throw new Error(serverMessages.remindersCanBe0To60);
  return {
    titleEn,
    titleAr: input.title_ar?.trim().slice(0, 150) || null,
    categoryId: input.category_id || null,
    vendorName: input.vendor_name?.trim().slice(0, 150) || null,
    reference: input.reference?.trim().slice(0, 80) || null,
    amount,
    inputVatAmount: vat,
    isVatRecoverable: input.is_vat_recoverable ?? true,
    currency: (input.currency || "BHD").toUpperCase(),
    paymentMethod: input.payment_method || null,
    frequency: input.frequency as ExpenseFrequency,
    startDate: day(input.start_date),
    endDate: end ? day(end) : null,
    autoRecord: !!input.auto_record,
    remindDaysBefore: remind,
    isActive: !!input.is_active,
    notes: input.notes?.trim().slice(0, 1000) || null,
  };
}

type Row = NonNullable<Awaited<ReturnType<typeof loadOne>>>;
const loadOne = (id: string) =>
  db.recurringExpense.findUnique({
    where: { id },
    include: {
      category: { select: { nameEn: true, nameAr: true, color: true } },
      _count: { select: { expenses: true } },
    },
  });

function map(r: Row): RecurringExpenseRecord {
  const frequency = r.frequency as ExpenseFrequency;
  return {
    id: r.id,
    title_en: r.titleEn,
    title_ar: r.titleAr ?? undefined,
    category_id: r.categoryId ?? undefined,
    category: r.category
      ? {
          name_en: r.category.nameEn,
          name_ar: r.category.nameAr,
          color: r.category.color,
        }
      : undefined,
    vendor_name: r.vendorName ?? undefined,
    reference: r.reference ?? undefined,
    amount: Number(r.amount),
    input_vat_amount: Number(r.inputVatAmount),
    is_vat_recoverable: r.isVatRecoverable,
    currency: r.currency,
    payment_method: r.paymentMethod ?? undefined,
    frequency,
    start_date: iso(r.startDate),
    end_date: r.endDate ? iso(r.endDate) : undefined,
    next_due_date: iso(r.nextDueDate),
    auto_record: r.autoRecord,
    remind_days_before: r.remindDaysBefore,
    is_active: r.isActive,
    notes: r.notes ?? undefined,
    monthly_equivalent:
      Math.round(Number(r.amount) * PER_MONTH[frequency] * 1000) / 1000,
    days_until: Math.round(
      (r.nextDueDate.getTime() - todayBahrain().getTime()) / 86400000,
    ),
    recorded_count: r._count.expenses,
    last_recorded_at: r.lastRecordedAt?.toISOString(),
  };
}

export async function listRecurringExpenses(): Promise<
  RecurringExpenseRecord[]
> {
  const rows = await db.recurringExpense.findMany({
    orderBy: [{ isActive: "desc" }, { nextDueDate: "asc" }],
    include: {
      category: { select: { nameEn: true, nameAr: true, color: true } },
      _count: { select: { expenses: true } },
    },
  });
  return rows.map(map);
}

export async function saveRecurringExpense(
  input: RecurringExpenseInput,
  actorId: string,
  id?: string,
) {
  const data = normalize(input);
  return runAtomicMutation(async () => {
    if (data.categoryId) {
      const category = await db.expenseCategory.findUnique({
        where: { id: data.categoryId },
        select: { isActive: true },
      });
      if (!category?.isActive)
        throw new Error(serverMessages.chooseAnActiveExpenseCategory);
    }
    if (id) {
      const existing = await db.recurringExpense.findUnique({
        where: { id },
        include: { _count: { select: { expenses: true } } },
      });
      if (!existing) throw new Error(serverMessages.recurringExpenseNotFound);
      // Before anything is recorded the schedule restarts from the start date; afterwards it continues.
      const nextDueDate =
        existing._count.expenses === 0 ? data.startDate : existing.nextDueDate;
      return db.recurringExpense.update({
        where: { id },
        data: { ...data, nextDueDate },
      });
    }
    return db.recurringExpense.create({
      data: { ...data, nextDueDate: data.startDate, createdById: actorId },
    });
  });
}

export async function deleteRecurringExpense(id: string) {
  const existing = await db.recurringExpense.findUnique({
    where: { id },
    include: { _count: { select: { expenses: true } } },
  });
  if (!existing) throw new Error(serverMessages.recurringExpenseNotFound);
  if (existing._count.expenses)
    throw new Error(serverMessages.expensesWereAlreadyRecordedFromThis);
  await db.recurringExpense.delete({ where: { id } });
}

function advance(r: {
  nextDueDate: Date;
  frequency: string;
  startDate: Date;
  endDate: Date | null;
}) {
  const next = nextDueAfter(
    r.nextDueDate,
    r.frequency as ExpenseFrequency,
    r.startDate.getUTCDate(),
  );
  return { nextDueDate: next, isActive: !(r.endDate && next > r.endDate) };
}

/**
 * Records the expense for the bill's current due date (with the actual amount when it differs) and moves
 * the schedule to the next due date. The expense goes through the expense approval policy like any other.
 */
export async function recordRecurringExpense(
  id: string,
  actorId: string,
  actual: {
    amount?: number;
    input_vat_amount?: number;
    receipt_url?: string;
    notes?: string;
  } = {},
) {
  return runAtomicMutation(async () => {
    const r = await db.recurringExpense.findUnique({ where: { id } });
    if (!r) throw new Error(serverMessages.recurringExpenseNotFound);
    if (!r.isActive)
      throw new Error(serverMessages.thisRecurringExpenseIsPaused);
    const dueDate = iso(r.nextDueDate);
    const expense = await createExpense(
      {
        category_id: r.categoryId ?? undefined,
        scope: "internal",
        payment_method: r.paymentMethod ?? undefined,
        description_en: r.titleEn,
        description_ar: r.titleAr ?? undefined,
        amount: actual.amount ?? Number(r.amount),
        input_vat_amount:
          actual.input_vat_amount ??
          (actual.amount !== undefined ? 0 : Number(r.inputVatAmount)),
        is_vat_recoverable: r.isVatRecoverable,
        currency: r.currency as SupportedCurrency,
        expense_date: dueDate,
        vendor_name: r.vendorName ?? undefined,
        receipt_url: actual.receipt_url,
        is_recurring: true,
        recurrence_interval: r.frequency,
        notes:
          [r.reference ? `Ref ${r.reference}` : null, actual.notes ?? r.notes]
            .filter(Boolean)
            .join(" · ") || undefined,
      },
      actorId,
    );
    await db.expense.update({
      where: { id: expense.id },
      data: { recurringExpenseId: r.id },
    });
    await submitForApproval({
      targetType: "expense",
      targetId: expense.id,
      requesterId: actorId,
      policySnapshot: {
        amount: expense.amount,
        currency: expense.currency,
        vendor: r.vendorName,
        recurring: r.id,
      },
    });
    await db.recurringExpense.update({
      where: { id },
      data: { ...advance(r), lastRecordedAt: new Date() },
    });
    return { expenseId: expense.id, dueDate };
  });
}

/** Skips the current due date (e.g. a waived bill) without recording an expense. */
export async function skipRecurringExpense(id: string) {
  const r = await db.recurringExpense.findUnique({ where: { id } });
  if (!r) throw new Error(serverMessages.recurringExpenseNotFound);
  await db.recurringExpense.update({ where: { id }, data: advance(r) });
  return iso(r.nextDueDate);
}

async function financeUsers() {
  const users = await db.user.findMany({
    where: { isActive: true },
    select: { id: true, role: true, permissions: true },
  });
  const allowed = await Promise.all(
    users.map((u) =>
      hasPermission(
        u.role,
        "expenses",
        "write",
        u.permissions as Record<string, boolean> | null,
      ),
    ),
  );
  return users.filter((_, i) => allowed[i]).map((u) => u.id);
}

/**
 * Daily pass: records automatic bills whose due date has come (catching up missed ones), and reminds
 * finance about manual bills due within their reminder window or overdue, once per due date.
 */
export async function processRecurringExpenses() {
  const today = todayBahrain();
  let recorded = 0;
  let reminded = 0;
  const due = await db.recurringExpense.findMany({
    where: { isActive: true, autoRecord: true, nextDueDate: { lte: today } },
  });
  for (const r of due) {
    for (let i = 0; i < 12; i++) {
      const current = await db.recurringExpense.findUnique({
        where: { id: r.id },
      });
      if (!current?.isActive || current.nextDueDate > today) break;
      await recordRecurringExpense(
        r.id,
        current.createdById ?? (await financeUsers())[0],
      );
      recorded++;
    }
  }
  const manual = await db.recurringExpense.findMany({
    where: { isActive: true, autoRecord: false },
  });
  const recipients = manual.length ? await financeUsers() : [];
  for (const r of manual) {
    const days = Math.round(
      (r.nextDueDate.getTime() - today.getTime()) / 86400000,
    );
    if (days > r.remindDaysBefore) continue;
    const key = `recurring-expense:${r.id}:${iso(r.nextDueDate)}:${days < 0 ? "overdue" : "due"}`;
    const already = new Set(
      (
        await db.notification.findMany({
          where: { eventKey: key },
          select: { userId: true },
        })
      ).map((n) => n.userId),
    );
    const data = recipients
      .filter((u) => !already.has(u))
      .map((userId) => ({
        userId,
        title: days < 0 ? "Bill overdue" : "Bill due",
        message: `${r.titleEn} ${days < 0 ? "was due on" : "is due on"} ${iso(r.nextDueDate)}`,
        type: days < 0 ? "warning" : "info",
        entityType: "recurring_expense",
        entityId: r.id,
        messageKey:
          days < 0
            ? "recurringExpenses.notifications.overdue"
            : "recurringExpenses.notifications.due",
        messageParams: {
          nameEn: r.titleEn,
          nameAr: r.titleAr ?? r.titleEn,
          date: iso(r.nextDueDate),
          days: String(days),
        },
        actionUrl: ROUTES.expenses.recurring,
        eventKey: key,
      }));
    if (data.length) {
      await db.notification.createMany({ data });
      reminded += data.length;
    }
  }
  return { recorded, reminded };
}

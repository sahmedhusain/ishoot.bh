import { validMoneyAmount } from "../finance/money";
import { assertCompanyCurrency } from "../finance/company-currency";
import { serverMessages } from "@platform/locales";
import { runAtomicMutation } from "../api/atomic";
import { deleteTableRow, listTableRows, upsertTableRow } from "../api/tables";
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
  days_until: number;
  recorded_count: number;
  last_recorded_at?: string;
}

const iso = (d: Date) => d.toISOString().slice(0, 10);
const day = (s: string) => new Date(`${s}T00:00:00Z`);
const todayDate = () =>
  day(new Date().toISOString().slice(0, 10));

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
  const amount = Number(input.amount);
  if (!Number.isFinite(amount) || amount <= 0)
    throw new Error(serverMessages.expenseAmountMustBePositive);
  const vat = Number(input.input_vat_amount ?? 0);
  if (!Number.isFinite(vat) || vat < 0 || vat >= amount)
    throw new Error(serverMessages.inputVatMustBeLessThanThe);
  if (!validMoneyAmount(amount, input.currency ?? "") || !validMoneyAmount(vat, input.currency ?? "", true)) throw new Error(serverMessages.paymentCurrencyPrecisionInvalid);
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
    currency: input.currency ?? "",
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

type Row = any;

function hydrateRecurringRow(
  r: any,
  catMap: Map<string, any>,
  expenseCounts: Map<string, number>,
) {
  return {
    ...r,
    startDate: new Date(r.startDate),
    endDate: r.endDate ? new Date(r.endDate) : null,
    nextDueDate: new Date(r.nextDueDate),
    lastRecordedAt: r.lastRecordedAt ? new Date(r.lastRecordedAt) : null,
    category: r.categoryId ? catMap.get(r.categoryId) ?? null : null,
    _count: { expenses: expenseCounts.get(r.id) ?? 0 },
  };
}

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
      (r.nextDueDate.getTime() - todayDate().getTime()) / 86400000,
    ),
    recorded_count: r._count.expenses,
    last_recorded_at: r.lastRecordedAt?.toISOString(),
  };
}

export async function listRecurringExpenses(): Promise<
  RecurringExpenseRecord[]
> {
  const [rows, categories, expenses] = await Promise.all([
    listTableRows<any>("finance", "recurring_expense"),
    listTableRows<any>("finance", "expense_category"),
    listTableRows<any>("finance", "expense"),
  ]);
  const catMap = new Map<string, any>(categories.map((c) => [c.id, c]));
  const counts = new Map<string, number>();
  for (const e of expenses) {
    if (e.recurringExpenseId) {
      counts.set(
        e.recurringExpenseId,
        (counts.get(e.recurringExpenseId) ?? 0) + 1,
      );
    }
  }
  return rows
    .map((r) => hydrateRecurringRow(r, catMap, counts))
    .sort((a, b) => {
      if (Boolean(b.isActive) !== Boolean(a.isActive))
        return b.isActive ? 1 : -1;
      return a.nextDueDate.getTime() - b.nextDueDate.getTime();
    })
    .map(map);
}

export async function saveRecurringExpense(
  input: RecurringExpenseInput,
  actorId: string,
  id?: string,
) {
  const data = normalize({ ...input, currency: await assertCompanyCurrency(input.currency) });
  return runAtomicMutation(async () => {
    await assertCompanyCurrency(data.currency);
    if (data.categoryId) {
      const categories = await listTableRows<any>("finance", "expense_category");
      const category = categories.find((c) => c.id === data.categoryId);
      if (!category?.isActive)
        throw new Error(serverMessages.chooseAnActiveExpenseCategory);
    }
    const payload = {
      ...data,
      startDate: data.startDate.toISOString(),
      endDate: data.endDate ? data.endDate.toISOString() : null,
    };
    if (id) {
      const [rows, expenses] = await Promise.all([
        listTableRows<any>("finance", "recurring_expense"),
        listTableRows<any>("finance", "expense"),
      ]);
      const existing = rows.find((r) => r.id === id);
      if (!existing) throw new Error(serverMessages.recurringExpenseNotFound);
      const expenseCount = expenses.filter((e) => e.recurringExpenseId === id).length;
      const nextDueDate =
        expenseCount === 0
          ? data.startDate.toISOString()
          : existing.nextDueDate;
      return upsertTableRow("finance", "recurring_expense", {
        ...existing,
        ...payload,
        nextDueDate,
      });
    }
    return upsertTableRow("finance", "recurring_expense", {
      id: crypto.randomUUID(),
      ...payload,
      nextDueDate: data.startDate.toISOString(),
      createdById: actorId,
    });
  });
}

export async function deleteRecurringExpense(id: string) {
  const [rows, expenses] = await Promise.all([
    listTableRows<any>("finance", "recurring_expense"),
    listTableRows<any>("finance", "expense"),
  ]);
  const existing = rows.find((r) => r.id === id);
  if (!existing) throw new Error(serverMessages.recurringExpenseNotFound);
  if (expenses.some((e) => e.recurringExpenseId === id))
    throw new Error(serverMessages.expensesWereAlreadyRecordedFromThis);
  await deleteTableRow("finance", "recurring_expense", id);
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
    const rows = await listTableRows<any>("finance", "recurring_expense");
    const rawR = rows.find((row) => row.id === id);
    if (!rawR) throw new Error(serverMessages.recurringExpenseNotFound);
    const r = {
      ...rawR,
      startDate: new Date(rawR.startDate),
      endDate: rawR.endDate ? new Date(rawR.endDate) : null,
      nextDueDate: new Date(rawR.nextDueDate),
    };
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
    const allExpenses = await listTableRows<any>("finance", "expense");
    const createdExpense = allExpenses.find((e) => e.id === expense.id);
    if (createdExpense) {
      await upsertTableRow("finance", "expense", {
        ...createdExpense,
        recurringExpenseId: r.id,
      });
    }
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
    const next = advance(r);
    await upsertTableRow("finance", "recurring_expense", {
      ...rawR,
      nextDueDate: next.nextDueDate.toISOString(),
      isActive: next.isActive,
      lastRecordedAt: new Date().toISOString(),
    });
    return { expenseId: expense.id, dueDate };
  });
}

export async function skipRecurringExpense(id: string) {
  const rows = await listTableRows<any>("finance", "recurring_expense");
  const rawR = rows.find((row) => row.id === id);
  if (!rawR) throw new Error(serverMessages.recurringExpenseNotFound);
  const r = {
    ...rawR,
    startDate: new Date(rawR.startDate),
    endDate: rawR.endDate ? new Date(rawR.endDate) : null,
    nextDueDate: new Date(rawR.nextDueDate),
  };
  const next = advance(r);
  await upsertTableRow("finance", "recurring_expense", {
    ...rawR,
    nextDueDate: next.nextDueDate.toISOString(),
    isActive: next.isActive,
  });
  return iso(r.nextDueDate);
}

async function financeUsers() {
  const allUsers = await listTableRows<any>("identity", "user");
  const users = allUsers.filter((u) => u.isActive);
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

export async function processRecurringExpenses() {
  const today = todayDate();
  let recorded = 0;
  let reminded = 0;
  const allRows = await listTableRows<any>("finance", "recurring_expense");
  const due = allRows
    .map((r) => ({ ...r, nextDueDate: new Date(r.nextDueDate) }))
    .filter((r) => r.isActive && r.autoRecord && r.nextDueDate <= today);
  const fallbackRecorder = due.some((r) => !r.createdById) ? (await financeUsers())[0] : undefined;
  for (const r of due) {
    for (let i = 0; i < 12; i++) {
      const freshRows = await listTableRows<any>("finance", "recurring_expense");
      const current = freshRows.find((row) => row.id === r.id);
      if (!current?.isActive || new Date(current.nextDueDate) > today) break;
      await recordRecurringExpense(r.id, current.createdById ?? fallbackRecorder!);
      recorded++;
    }
  }
  const latestRows = await listTableRows<any>("finance", "recurring_expense");
  const manual = latestRows
    .filter((r) => r.isActive && !r.autoRecord)
    .map((r) => ({ ...r, nextDueDate: new Date(r.nextDueDate) }));
  const recipients = manual.length ? await financeUsers() : [];
  const reminders = manual.flatMap((r) => {
    const days = Math.round(
      (r.nextDueDate.getTime() - today.getTime()) / 86400000,
    );
    if (days > r.remindDaysBefore) return [];
    return [{ r, days, key: `recurring-expense:${r.id}:${iso(r.nextDueDate)}:${days < 0 ? "overdue" : "due"}` }];
  });
  const existingNotifications = reminders.length
    ? await listTableRows<any>("notify", "notification")
    : [];
  const reminderKeys = new Set(reminders.map((entry) => entry.key));
  const told = new Set(
    existingNotifications
      .filter((n) => reminderKeys.has(n.eventKey))
      .map((n) => `${n.eventKey}|${n.userId}`),
  );
  for (const { r, days, key } of reminders) {
    const data = recipients
      .filter((u) => !told.has(`${key}|${u}`))
      .map((userId) => ({
        id: crypto.randomUUID(),
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
      await Promise.all(
        data.map((n) => upsertTableRow("notify", "notification", n)),
      );
      reminded += data.length;
    }
  }
  return { recorded, reminded };
}

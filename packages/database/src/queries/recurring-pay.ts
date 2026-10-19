import { serverMessages } from "@platform/locales";
import { db } from "../db";
import { PAY_LINE_CATEGORIES } from "../constants/hr";

export interface RecurringPayInput {
  kind: "addition" | "deduction";
  category: string;
  label: string;
  amount: number;
  start_month: string;
  end_month?: string;
  is_active: boolean;
  note?: string;
}

export interface RecurringPayRecord extends RecurringPayInput {
  id: string;
}

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

export async function listRecurringPay(employeeId: string): Promise<RecurringPayRecord[]> {
  const rows = await db.employeeRecurringPay.findMany({ where: { employeeId }, orderBy: [{ kind: "asc" }, { createdAt: "asc" }] });
  return rows.map((r) => ({
    id: r.id,
    kind: r.kind as "addition" | "deduction",
    category: r.category,
    label: r.label,
    amount: Number(r.amount),
    start_month: r.startMonth,
    end_month: r.endMonth ?? undefined,
    is_active: r.isActive,
    note: r.note ?? undefined,
  }));
}

/** A custom addition or deduction paid every month from `start_month` (to `end_month` if set). */
export async function saveRecurringPay(employeeId: string, input: RecurringPayInput, id?: string) {
  if (input.kind !== "addition" && input.kind !== "deduction") throw new Error(serverMessages.chooseACategoryForEveryLine);
  if (!(PAY_LINE_CATEGORIES[input.kind] as readonly string[]).includes(input.category)) throw new Error(serverMessages.chooseACategoryForEveryLine);
  const label = input.label?.trim().slice(0, 120);
  if (!label) throw new Error(serverMessages.everyAdditionAndDeductionNeedsA);
  const amount = Math.round(Number(input.amount) * 1000) / 1000;
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000) throw new Error(serverMessages.everyLineNeedsAnAmountAbove);
  if (!MONTH.test(input.start_month ?? "")) throw new Error(serverMessages.chooseTheFirstMonth);
  const end = input.end_month?.trim() || null;
  if (end && (!MONTH.test(end) || end < input.start_month)) throw new Error(serverMessages.theLastMonthCannotBeBefore);
  const data = { kind: input.kind, category: input.category, label, amount, startMonth: input.start_month, endMonth: end, isActive: !!input.is_active, note: input.note?.trim().slice(0, 300) || null };
  if (id) {
    const existing = await db.employeeRecurringPay.findUnique({ where: { id }, select: { employeeId: true } });
    if (!existing || existing.employeeId !== employeeId) throw new Error(serverMessages.recurringItemNotFound);
    return db.employeeRecurringPay.update({ where: { id }, data });
  }
  return db.employeeRecurringPay.create({ data: { ...data, employeeId } });
}

export async function deleteRecurringPay(id: string) {
  const existing = await db.employeeRecurringPay.findUnique({ where: { id }, select: { employeeId: true } });
  if (!existing) throw new Error(serverMessages.recurringItemNotFound);
  await db.employeeRecurringPay.delete({ where: { id } });
  return existing.employeeId;
}

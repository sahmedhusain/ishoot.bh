import { db } from "../db";
import { FinancialSummary } from "../types";

// SQL numeric arithmetic keeps balances exact until the public number DTO boundary.
// One statement gives a consistent snapshot without fetching contacts or line items.
export async function getFinancialSummary(): Promise<FinancialSummary> {
  const [row] = await db.$queryRaw<
    Array<{
      revenue: unknown;
      expenses: unknown;
      outstanding: unknown;
      overdue: unknown;
      discountsGiven: unknown;
      vatCollected: unknown;
    }>
  >`
    WITH paid AS (
      SELECT "invoiceId", SUM(amount) AS amount FROM "Payment" WHERE currency = 'BHD' GROUP BY "invoiceId"
    ), invoices AS (
      SELECT i.*, COALESCE(p.amount, 0) AS paid,
        GREATEST(0, i."totalAmount" - COALESCE(p.amount, 0)) AS due
      FROM "Invoice" i LEFT JOIN paid p ON p."invoiceId" = i.id
      WHERE i.currency = 'BHD' AND i.status <> 'void'
    )
    SELECT
      (SELECT COALESCE(SUM(p.amount), 0) FROM "Payment" p JOIN "Invoice" i ON i.id = p."invoiceId" WHERE p.currency = 'BHD' AND i.status <> 'void') AS revenue,
      (SELECT COALESCE(SUM(amount), 0) FROM "Expense" WHERE currency = 'BHD') AS expenses,
      COALESCE(SUM(due) FILTER (WHERE status IN ('sent', 'partially_paid', 'overdue')), 0) AS outstanding,
      COALESCE(SUM(due) FILTER (WHERE status <> 'draft' AND "dueDate" < (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Bahrain')::date), 0) AS overdue,
      COALESCE(SUM("discountAmount"), 0) AS "discountsGiven",
      COALESCE(SUM(CASE WHEN "vatEnabled" AND status <> 'draft' AND "totalAmount" > 0 THEN "vatAmount" * LEAST(1, paid / "totalAmount") ELSE 0 END), 0) AS "vatCollected"
    FROM invoices
  `;
  const revenue = Number(row.revenue);
  const expenses = Number(row.expenses);
  const netProfit = revenue - expenses;
  return {
    revenue,
    expenses,
    netProfit,
    profitMargin: revenue > 0 ? (netProfit / revenue) * 100 : 0,
    outstanding: Number(row.outstanding),
    overdue: Number(row.overdue),
    discountsGiven: Number(row.discountsGiven),
    vatCollected: Number(row.vatCollected),
    currency: "BHD",
  };
}

export interface MonthlyCashflowPoint {
  monthKey: string;
  revenue: number;
  expenses: number;
}

export async function getMonthlyCashflow(
  monthsCount = 6,
): Promise<MonthlyCashflowPoint[]> {
  if (!Number.isInteger(monthsCount) || monthsCount < 1 || monthsCount > 120)
    throw new Error("Month count must be between 1 and 120");
  const rows = await db.$queryRaw<
    Array<{ monthKey: string; revenue: unknown; expenses: unknown }>
  >`
    WITH bounds AS (
      SELECT date_trunc('month', CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Bahrain')::date AS last_month
    ), months AS (
      SELECT generate_series(last_month - (${monthsCount} - 1) * INTERVAL '1 month', last_month, INTERVAL '1 month') AS month FROM bounds
    ), revenue AS (
      SELECT date_trunc('month', p."paymentDate") AS month, SUM(p.amount) AS amount
      FROM "Payment" p JOIN "Invoice" i ON i.id = p."invoiceId"
      WHERE p.currency = 'BHD' AND i.status <> 'void'
        AND p."paymentDate" >= (SELECT MIN(month) FROM months)
        AND p."paymentDate" < (SELECT MAX(month) + INTERVAL '1 month' FROM months)
      GROUP BY 1
    ), expenses AS (
      SELECT date_trunc('month', "expenseDate") AS month, SUM(amount) AS amount FROM "Expense"
      WHERE currency = 'BHD' AND "expenseDate" >= (SELECT MIN(month) FROM months)
        AND "expenseDate" < (SELECT MAX(month) + INTERVAL '1 month' FROM months)
      GROUP BY 1
    )
    SELECT to_char(m.month, 'YYYY-MM') AS "monthKey", COALESCE(r.amount, 0) AS revenue, COALESCE(e.amount, 0) AS expenses
    FROM months m LEFT JOIN revenue r ON r.month = m.month LEFT JOIN expenses e ON e.month = m.month ORDER BY m.month
  `;
  return rows.map((row) => ({
    monthKey: row.monthKey,
    revenue: Number(row.revenue),
    expenses: Number(row.expenses),
  }));
}

export async function getExpenseCategoryTotals(): Promise<
  Record<string, number>
> {
  const rows = await db.$queryRaw<Array<{ slug: string; amount: unknown }>>`
    SELECT COALESCE(c.slug, 'other') AS slug, SUM(e.amount) AS amount
    FROM "Expense" e LEFT JOIN "ExpenseCategory" c ON c.id = e."categoryId"
    WHERE e.currency = 'BHD' GROUP BY COALESCE(c.slug, 'other')
  `;
  return Object.fromEntries(rows.map((row) => [row.slug, Number(row.amount)]));
}

// Invoice readers receive invoice metrics without expense or unrelated revenue data.
export async function getInvoiceSummary() {
  const [row] = await db.$queryRaw<Array<{ outstanding: unknown; overdue: unknown; discountsGiven: unknown }>>`
    WITH paid AS (SELECT "invoiceId", SUM(amount) amount FROM "Payment" WHERE currency='BHD' GROUP BY "invoiceId"),
    balances AS (SELECT i.*, GREATEST(0, i."totalAmount" - COALESCE(p.amount,0)) due FROM "Invoice" i LEFT JOIN paid p ON p."invoiceId"=i.id WHERE i.currency='BHD' AND i.status<>'void')
    SELECT COALESCE(SUM(due) FILTER (WHERE status IN ('sent','partially_paid','overdue')),0) outstanding,
    COALESCE(SUM(due) FILTER (WHERE status<>'draft' AND "dueDate"<(CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Bahrain')::date),0) overdue,
    COALESCE(SUM("discountAmount"),0) "discountsGiven" FROM balances
  `;
  return { outstanding: Number(row.outstanding), overdue: Number(row.overdue), discountsGiven: Number(row.discountsGiven) };
}

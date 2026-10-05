import { db } from "../db";
import { FinancialSummary } from "../types";
import { getFinancialSummaryReport } from "./finance-reports";

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
      (SELECT COALESCE(SUM(amount), 0) FROM "Expense" WHERE currency = 'BHD' AND status = 'approved') AS expenses,
      COALESCE(SUM(due) FILTER (WHERE status IN ('sent', 'partially_paid', 'overdue')), 0) AS outstanding,
      COALESCE(SUM(due) FILTER (WHERE status <> 'draft' AND "dueDate" < (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Bahrain')::date), 0) AS overdue,
      COALESCE(SUM("discountAmount"), 0) AS "discountsGiven",
      COALESCE(SUM(CASE WHEN "vatEnabled" AND status <> 'draft' AND "totalAmount" > 0 THEN "vatAmount" * LEAST(1, paid / "totalAmount") ELSE 0 END), 0) AS "vatCollected"
    FROM invoices
  `;
  // Profit uses the same definition as the financial report (net of VAT, incl. payroll and bank fees).
  const report = await getFinancialSummaryReport({ basis: "cash" });
  const revenue = report.cashNetReceipts;
  const expenses = Math.round((report.expensesNet + report.inputVatNonRecoverable + report.payrollCostsTotal + report.bankFeesTotal) * 1000) / 1000;
  const netProfit = report.operatingProfit;
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
      -- Same definitions as the financial report: receipts net of the VAT they carry (allocated pro rata)...
      SELECT date_trunc('month', p."paymentDate") AS month,
        SUM(p.amount - CASE WHEN i."totalAmount" > 0 THEN ROUND(i."vatAmount" * p.amount / i."totalAmount", 3) ELSE 0 END) AS amount
      FROM "Payment" p JOIN "Invoice" i ON i.id = p."invoiceId"
      WHERE p.currency = 'BHD' AND i.status <> 'void'
        AND p."paymentDate" >= (SELECT MIN(month) FROM months)
        AND p."paymentDate" < (SELECT MAX(month) + INTERVAL '1 month' FROM months)
      GROUP BY 1
    ), costs AS (
      -- ...and operating costs = approved expenses net of recoverable VAT + paid payroll + bank fees.
      SELECT date_trunc('month', "expenseDate") AS month,
        (CASE WHEN "netAmount" > 0 THEN "netAmount" ELSE amount - "inputVatAmount" END)
          + CASE WHEN "isVatRecoverable" THEN 0 ELSE "inputVatAmount" END AS amount
      FROM "Expense" WHERE currency = 'BHD' AND status = 'approved'
      UNION ALL SELECT date_trunc('month', "paidAt"), "totalEmployerCost" FROM "PayrollRun" WHERE status = 'paid' AND "paidAt" IS NOT NULL
      UNION ALL SELECT date_trunc('month', "settlementDate"), "bankFeeBhd" FROM "BankSettlement" WHERE status = 'settled'
    ), expenses AS (
      SELECT month, SUM(amount) AS amount FROM costs
      WHERE month >= (SELECT MIN(month) FROM months) AND month <= (SELECT MAX(month) FROM months)
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
    WHERE e.currency = 'BHD' AND e.status = 'approved' GROUP BY COALESCE(c.slug, 'other')
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

export interface ReceivablesInsight {
  /** Share of the last 12 months' issued value that has been collected. */
  collectionRate: number;
  /** Average days from issue to the payment that settled an invoice (last 12 months). */
  averageDaysToCollect: number;
  averageInvoiceValue: number;
  invoicesIssued: number;
  aging: Array<{ bucket: "current" | "d1_30" | "d31_60" | "d61_90" | "d90_plus"; amount: number; count: number }>;
  topClients: Array<{ clientId: string; name: string; collected: number; invoices: number }>;
}

/** Receivables and client analytics (BHD) — the operational view; the P&L lives in the financial report. */
export async function getReceivablesInsight(): Promise<ReceivablesInsight> {
  const [summary] = await db.$queryRaw<Array<{ issued: unknown; paid: unknown; count: bigint; avg: unknown; days: unknown }>>`
    WITH recent AS (
      SELECT i.id, i."totalAmount", i."issueDate", i.status FROM "Invoice" i
      WHERE i.currency = 'BHD' AND i.status NOT IN ('draft','void') AND i."issueDate" >= CURRENT_DATE - INTERVAL '12 months'
    ), paid AS (SELECT p."invoiceId", SUM(p.amount) amount, MAX(p."paymentDate") last FROM "Payment" p JOIN recent r ON r.id = p."invoiceId" GROUP BY 1)
    SELECT COALESCE(SUM(r."totalAmount"),0) issued, COALESCE(SUM(p.amount),0) paid, COUNT(r.id) count, COALESCE(AVG(r."totalAmount"),0) avg,
      COALESCE(AVG(EXTRACT(DAY FROM (p.last::timestamp - r."issueDate"::timestamp))) FILTER (WHERE r.status = 'paid'), 0) days
    FROM recent r LEFT JOIN paid p ON p."invoiceId" = r.id`;
  const aging = await db.$queryRaw<Array<{ bucket: ReceivablesInsight["aging"][number]["bucket"]; amount: unknown; count: bigint }>>`
    WITH open AS (
      SELECT i.id, i."totalAmount" - COALESCE((SELECT SUM(p.amount) FROM "Payment" p WHERE p."invoiceId" = i.id), 0) due,
        CURRENT_DATE - i."dueDate"::date late
      FROM "Invoice" i WHERE i.currency = 'BHD' AND i.status IN ('sent','partially_paid','overdue'))
    SELECT CASE WHEN late <= 0 THEN 'current' WHEN late <= 30 THEN 'd1_30' WHEN late <= 60 THEN 'd31_60' WHEN late <= 90 THEN 'd61_90' ELSE 'd90_plus' END bucket,
      SUM(due) amount, COUNT(*) count FROM open WHERE due > 0 GROUP BY 1`;
  const top = await db.$queryRaw<Array<{ clientId: string; name: string; collected: unknown; invoices: bigint }>>`
    SELECT c.id "clientId", COALESCE(c."companyName", TRIM(c."firstName" || ' ' || COALESCE(c."lastName", ''))) name,
      SUM(p.amount) collected, COUNT(DISTINCT i.id) invoices
    FROM "Payment" p JOIN "Invoice" i ON i.id = p."invoiceId" JOIN "CrmContact" c ON c.id = i."clientId"
    WHERE p.currency = 'BHD' AND i.status <> 'void' AND p."paymentDate" >= CURRENT_DATE - INTERVAL '12 months'
    GROUP BY c.id ORDER BY collected DESC LIMIT 5`;
  const issued = Number(summary.issued);
  const buckets: ReceivablesInsight["aging"][number]["bucket"][] = ["current", "d1_30", "d31_60", "d61_90", "d90_plus"];
  return {
    collectionRate: issued > 0 ? Math.round((Number(summary.paid) / issued) * 1000) / 10 : 0,
    averageDaysToCollect: Math.round(Number(summary.days)),
    averageInvoiceValue: Math.round(Number(summary.avg) * 1000) / 1000,
    invoicesIssued: Number(summary.count),
    aging: buckets.map((bucket) => {
      const row = aging.find((a) => a.bucket === bucket);
      return { bucket, amount: Number(row?.amount ?? 0), count: Number(row?.count ?? 0) };
    }),
    topClients: top.map((row) => ({ clientId: row.clientId, name: row.name, collected: Number(row.collected), invoices: Number(row.invoices) })),
  };
}

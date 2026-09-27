import { getAllInvoices } from "./invoices";
import { getAllPayments } from "./payments";
import { getAllExpenses } from "./expenses";
import { FinancialSummary } from "../types";

export async function getFinancialSummary(): Promise<FinancialSummary> {
  const [invoices, payments, expenses] = await Promise.all([
    getAllInvoices(),
    getAllPayments(),
    getAllExpenses(),
  ]);

  const revenue = payments.reduce((acc, p) => acc + Number(p.amount), 0);
  const totalExpenses = expenses.reduce((acc, e) => acc + Number(e.amount), 0);
  const netProfit = revenue - totalExpenses;
  const profitMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;

  const outstanding = invoices
    .filter((inv) => inv.status === "sent" || inv.status === "partially_paid")
    .reduce((acc, inv) => acc + Number(inv.amount_due), 0);

  const overdue = invoices
    .filter((inv) => inv.status === "overdue")
    .reduce((acc, inv) => acc + Number(inv.amount_due), 0);

  const discountsGiven = invoices.reduce(
    (acc, inv) => acc + Number(inv.discount_amount),
    0,
  );
  const vatCollected = invoices
    .filter((inv) => inv.vat_enabled)
    .reduce((acc, inv) => acc + Number(inv.vat_amount), 0);

  return {
    revenue,
    expenses: totalExpenses,
    netProfit,
    profitMargin,
    outstanding,
    overdue,
    discountsGiven,
    vatCollected,
    currency: "BHD",
  };
}

export interface MonthlyCashflowPoint {
  monthKey: string;
  revenue: number;
  expenses: number;
}

export async function getMonthlyCashflow(
  monthsCount: number = 6,
): Promise<MonthlyCashflowPoint[]> {
  const [payments, expenses] = await Promise.all([
    getAllPayments(),
    getAllExpenses(),
  ]);

  const now = new Date();
  const result: MonthlyCashflowPoint[] = [];

  for (let i = monthsCount - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const yearMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

    const monthRevenue = payments
      .filter((p) => p.payment_date && p.payment_date.startsWith(yearMonth))
      .reduce((sum, p) => sum + Number(p.amount), 0);

    const monthExpenses = expenses
      .filter((e) => e.expense_date && e.expense_date.startsWith(yearMonth))
      .reduce((sum, e) => sum + Number(e.amount), 0);

    result.push({
      monthKey: yearMonth,
      revenue: monthRevenue,
      expenses: monthExpenses,
    });
  }

  return result;
}

import { getAllInvoices } from "./invoices";
import { getAllPayments } from "./payments";
import { getAllExpenses } from "./expenses";
import { FinancialSummary } from "../types";

export async function getFinancialSummary(): Promise<FinancialSummary> {
  const [allInvoices, allPayments, allExpenses] = await Promise.all([
    getAllInvoices(),
    getAllPayments(),
    getAllExpenses(),
  ]);

  const invoices = allInvoices.filter((invoice) => invoice.currency === "BHD" && invoice.status !== "void");
  const payments = allPayments.filter((payment) => payment.currency === "BHD" && payment.invoice?.status !== "void");
  const expenses = allExpenses.filter((expense) => expense.currency === "BHD");
  const revenue = payments.reduce((acc, p) => acc + Number(p.amount), 0);
  const totalExpenses = expenses.reduce((acc, e) => acc + Number(e.amount), 0);
  const netProfit = revenue - totalExpenses;
  const profitMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;

  const outstanding = invoices
    .filter((inv) => ["sent", "partially_paid", "overdue"].includes(inv.status))
    .reduce((acc, inv) => acc + Number(inv.amount_due), 0);

  const overdue = invoices
    .filter((inv) => inv.status !== "draft" && inv.amount_due > 0 && inv.due_date < new Date().toISOString().slice(0, 10))
    .reduce((acc, inv) => acc + Number(inv.amount_due), 0);

  const discountsGiven = invoices.reduce(
    (acc, inv) => acc + Number(inv.discount_amount),
    0,
  );
  const vatCollected = invoices
    .filter((inv) => inv.vat_enabled && inv.total_amount > 0 && inv.status !== "draft")
    .reduce((acc, inv) => acc + Number(inv.vat_amount) * Math.min(1, inv.amount_paid / inv.total_amount), 0);

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
      .filter((p) => p.currency === "BHD" && p.invoice?.status !== "void" && p.payment_date && p.payment_date.startsWith(yearMonth))
      .reduce((sum, p) => sum + Number(p.amount), 0);

    const monthExpenses = expenses
      .filter((e) => e.currency === "BHD" && e.expense_date && e.expense_date.startsWith(yearMonth))
      .reduce((sum, e) => sum + Number(e.amount), 0);

    result.push({
      monthKey: yearMonth,
      revenue: monthRevenue,
      expenses: monthExpenses,
    });
  }

  return result;
}

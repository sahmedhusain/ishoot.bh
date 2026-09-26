import { getAllInvoices } from './invoices';
import { getAllPayments } from './payments';
import { getAllExpenses } from './expenses';
import { FinancialSummary } from '../types';

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
    .filter((inv) => inv.status === 'sent' || inv.status === 'partially_paid')
    .reduce((acc, inv) => acc + Number(inv.amount_due), 0);

  const overdue = invoices
    .filter((inv) => inv.status === 'overdue')
    .reduce((acc, inv) => acc + Number(inv.amount_due), 0);

  const discountsGiven = invoices.reduce((acc, inv) => acc + Number(inv.discount_amount), 0);
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
    currency: 'BHD',
  };
}

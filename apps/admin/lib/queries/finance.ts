import { getCurrencyDecimals } from "@platform/config/currency";
import { roundMoney } from "../finance/money";
import { companyCurrency as getAccountingCurrency } from "../finance/company-currency";
import { serverMessages } from "@platform/locales";
import { db } from "../atomic";
import { FinancialSummary } from "../types";
import {
  listInvoices,
  listPayments,
  listExpenses,
  listExpenseCategories,
} from "../api/finance";
import { listContacts } from "../api/sales";
import { getCompanyConfiguration } from "../api/company";

async function getCompanyTimeZone(): Promise<string> {
  const setting = await getCompanyConfiguration().catch(() => null);
  return setting?.timeZone || "UTC";
}

export async function getFinancialSummary(): Promise<FinancialSummary> {
  const [accountingCurrency, invoices, payments, expenses] = await Promise.all([
    getAccountingCurrency(),
    listInvoices().catch(() => []),
    listPayments().catch(() => []),
    listExpenses().catch(() => []),
  ]);

  const currencyInvoices = (invoices || []).filter(
    (i) => (!i.currency || i.currency === accountingCurrency) && i.status !== "void"
  );
  const currencyPayments = (payments || []).filter(
    (p) => (!p.currency || p.currency === accountingCurrency) && p.status !== "void"
  );
  const currencyExpenses = (expenses || []).filter(
    (e) => (!e.currency || e.currency === accountingCurrency) && e.status !== "rejected"
  );

  const revenue = roundMoney(
    currencyPayments.reduce((sum, p) => sum + Number((p as any).amount ?? (p as any).amountPaid ?? 0), 0),
    accountingCurrency
  );

  const totalExpenses = roundMoney(
    currencyExpenses.reduce((sum, e) => sum + Number(e.amount ?? 0), 0),
    accountingCurrency
  );

  const netProfit = roundMoney(revenue - totalExpenses, accountingCurrency);
  const profitMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;

  const outstanding = roundMoney(
    currencyInvoices
      .filter((i) => ["sent", "partially_paid", "overdue"].includes(i.status) || (!i.status && Number(i.balanceDue ?? 0) > 0))
      .reduce((sum, i) => sum + Number(i.balanceDue ?? (Number(i.total ?? 0) - Number(i.amountPaid ?? 0))), 0),
    accountingCurrency
  );

  const todayStr = new Date().toISOString().slice(0, 10);
  const overdue = roundMoney(
    currencyInvoices
      .filter((i) => i.status !== "draft" && i.dueDate && String(i.dueDate).slice(0, 10) < todayStr && Number(i.balanceDue ?? 0) > 0)
      .reduce((sum, i) => sum + Number(i.balanceDue ?? (Number(i.total ?? 0) - Number(i.amountPaid ?? 0))), 0),
    accountingCurrency
  );

  const discountsGiven = roundMoney(
    currencyInvoices.reduce((sum, i) => sum + Number(i.discount ?? 0), 0),
    accountingCurrency
  );

  const vatCollected = roundMoney(
    currencyInvoices.reduce((sum, i) => {
      const tot = Number(i.total ?? 0);
      const vat = Number(i.vatAmount ?? 0);
      const paid = Number(i.amountPaid ?? 0);
      if (tot > 0 && vat > 0 && paid > 0) {
        return sum + (vat * Math.min(1, paid / tot));
      }
      return sum;
    }, 0),
    accountingCurrency
  );

  return {
    revenue,
    expenses: totalExpenses,
    netProfit,
    profitMargin,
    outstanding,
    overdue,
    discountsGiven,
    vatCollected,
    currency: accountingCurrency,
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
  const [accountingCurrency, invoices, payments, expenses] = await Promise.all([
    getAccountingCurrency(),
    listInvoices().catch(() => []),
    listPayments().catch(() => []),
    listExpenses().catch(() => []),
  ]);

  if (!Number.isInteger(monthsCount) || monthsCount < 1 || monthsCount > 120)
    throw new Error(serverMessages.monthCountMustBeBetween1And);

  const result: MonthlyCashflowPoint[] = [];
  const now = new Date();
  const invoiceMap = new Map<string, any>((invoices || []).map((i: any): [string, any] => [i.id, i]));

  for (let i = monthsCount - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

    const monthPayments = (payments || []).filter((p) => {
      if (p.currency && p.currency !== accountingCurrency) return false;
      const pDate = p.paymentDate ? String(p.paymentDate).slice(0, 7) : "";
      return pDate === monthKey;
    });

    const monthRevenue = monthPayments.reduce((sum, p) => {
      const amount = Number((p as any).amount ?? (p as any).amountPaid ?? 0);
      const inv = p.invoiceId ? invoiceMap.get(p.invoiceId) : undefined;
      const total = Number(inv?.total ?? 0);
      const vat = Number(inv?.vatAmount ?? 0);
      if (total > 0 && vat > 0) {
        return sum + Math.max(0, amount - ((vat * amount) / total));
      }
      return sum + amount;
    }, 0);

    const monthExpenses = (expenses || []).filter((e) => {
      if (e.currency && e.currency !== accountingCurrency) return false;
      if (e.status === "rejected") return false;
      const eDate = e.expenseDate ? String(e.expenseDate).slice(0, 7) : "";
      return eDate === monthKey;
    });

    const monthExpenseTotal = monthExpenses.reduce((sum, e) => sum + Number(e.amount ?? 0), 0);

    result.push({
      monthKey,
      revenue: roundMoney(monthRevenue, accountingCurrency),
      expenses: roundMoney(monthExpenseTotal, accountingCurrency),
    });
  }

  return result;
}

export async function getExpenseCategoryTotals(): Promise<
  Record<string, number>
> {
  const [accountingCurrency, expenses, categories] = await Promise.all([
    getAccountingCurrency(),
    listExpenses().catch(() => []),
    listExpenseCategories().catch(() => []),
  ]);

  const catMap = new Map<string, string>((categories || []).map((c: any): [string, string] => [c.id, c.code || c.nameEn?.toLowerCase().replace(/\s+/g, "_") || "other"]));
  const totals: Record<string, number> = {};

  for (const exp of (expenses || [])) {
    if (exp.currency && exp.currency !== accountingCurrency) continue;
    if (exp.status === "rejected") continue;
    const slug = (exp.categoryId ? catMap.get(exp.categoryId) : undefined) || "other";
    totals[slug] = roundMoney((totals[slug] || 0) + Number(exp.amount ?? 0), accountingCurrency);
  }

  return totals;
}

export async function getInvoiceSummary() {
  const [accountingCurrency, invoices] = await Promise.all([
    getAccountingCurrency(),
    listInvoices().catch(() => []),
  ]);

  const todayStr = new Date().toISOString().slice(0, 10);
  const currencyInvoices = (invoices || []).filter(
    (i) => (!i.currency || i.currency === accountingCurrency) && i.status !== "void"
  );

  const outstanding = currencyInvoices
    .filter((i) => ["sent", "partially_paid", "overdue"].includes(i.status) || (!i.status && Number(i.balanceDue ?? 0) > 0))
    .reduce((sum, i) => sum + Number(i.balanceDue ?? (Number(i.total ?? 0) - Number(i.amountPaid ?? 0))), 0);

  const overdue = currencyInvoices
    .filter((i) => i.status !== "draft" && i.dueDate && String(i.dueDate).slice(0, 10) < todayStr && Number(i.balanceDue ?? 0) > 0)
    .reduce((sum, i) => sum + Number(i.balanceDue ?? (Number(i.total ?? 0) - Number(i.amountPaid ?? 0))), 0);

  const discountsGiven = currencyInvoices.reduce((sum, i) => sum + Number(i.discount ?? 0), 0);

  return {
    outstanding: roundMoney(outstanding, accountingCurrency),
    overdue: roundMoney(overdue, accountingCurrency),
    discountsGiven: roundMoney(discountsGiven, accountingCurrency),
  };
}

export interface ReceivablesInsight {
  collectionRate: number;
  averageDaysToCollect: number;
  averageInvoiceValue: number;
  invoicesIssued: number;
  aging: Array<{
    bucket: "current" | "d1_30" | "d31_60" | "d61_90" | "d90_plus";
    amount: number;
    count: number;
  }>;
  topClients: Array<{
    clientId: string;
    name: string;
    collected: number;
    invoices: number;
  }>;
}

export async function getReceivablesInsight(): Promise<ReceivablesInsight> {
  const [accountingCurrency, invoices, payments, contacts] = await Promise.all([
    getAccountingCurrency(),
    listInvoices().catch(() => []),
    listPayments().catch(() => []),
    listContacts().catch(() => []),
  ]);

  const now = new Date();
  const twelveMonthsAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()).toISOString().slice(0, 10);
  const todayStr = now.toISOString().slice(0, 10);

  const recentInvoices = (invoices || []).filter(
    (i) => (!i.currency || i.currency === accountingCurrency) &&
           i.status !== "void" &&
           i.status !== "draft" &&
           (!i.issueDate || String(i.issueDate).slice(0, 10) >= twelveMonthsAgo)
  );

  const issued = recentInvoices.reduce((sum, i) => sum + Number(i.total ?? 0), 0);
  const count = recentInvoices.length;
  const avg = count > 0 ? issued / count : 0;

  const recentPayments = (payments || []).filter(
    (p) => (!p.currency || p.currency === accountingCurrency) &&
           p.status !== "void" &&
           (!p.paymentDate || String(p.paymentDate).slice(0, 10) >= twelveMonthsAgo)
  );
  const totalPaid = recentPayments.reduce((sum, p) => sum + Number((p as any).amount ?? (p as any).amountPaid ?? 0), 0);

  const paymentDatesByInvoice = new Map<string, string>();
  for (const p of recentPayments) {
    if (p.invoiceId && p.paymentDate) {
      const prev = paymentDatesByInvoice.get(p.invoiceId);
      if (!prev || String(p.paymentDate) > prev) {
        paymentDatesByInvoice.set(p.invoiceId, String(p.paymentDate));
      }
    }
  }

  let totalDays = 0;
  let paidCount = 0;
  for (const inv of recentInvoices) {
    if (inv.status === "paid" && inv.issueDate) {
      const lastPayDate = paymentDatesByInvoice.get(inv.id);
      if (lastPayDate) {
        const diffMs = new Date(lastPayDate).getTime() - new Date(inv.issueDate).getTime();
        const diffDays = Math.max(0, Math.round(diffMs / 86400000));
        totalDays += diffDays;
        paidCount++;
      }
    }
  }
  const averageDaysToCollect = paidCount > 0 ? Math.round(totalDays / paidCount) : 0;

  const openInvoices = (invoices || []).filter(
    (i) => (!i.currency || i.currency === accountingCurrency) &&
           ["sent", "partially_paid", "overdue"].includes(i.status) &&
           Number(i.balanceDue ?? 0) > 0
  );

  const agingBuckets: Record<ReceivablesInsight["aging"][number]["bucket"], { amount: number; count: number }> = {
    current: { amount: 0, count: 0 },
    d1_30: { amount: 0, count: 0 },
    d31_60: { amount: 0, count: 0 },
    d61_90: { amount: 0, count: 0 },
    d90_plus: { amount: 0, count: 0 },
  };

  for (const inv of openInvoices) {
    const due = Number(inv.balanceDue ?? 0);
    const dueDateStr = inv.dueDate ? String(inv.dueDate).slice(0, 10) : todayStr;
    const diffDays = Math.round((new Date(todayStr).getTime() - new Date(dueDateStr).getTime()) / 86400000);

    let bucket: ReceivablesInsight["aging"][number]["bucket"] = "current";
    if (diffDays <= 0) bucket = "current";
    else if (diffDays <= 30) bucket = "d1_30";
    else if (diffDays <= 60) bucket = "d31_60";
    else if (diffDays <= 90) bucket = "d61_90";
    else bucket = "d90_plus";

    agingBuckets[bucket].amount += due;
    agingBuckets[bucket].count += 1;
  }

  const contactMap = new Map<string, string>((contacts || []).map((c: any): [string, string] => [c.id, (c.companyName || `${c.firstName || ""} ${c.lastName || ""}`.trim() || "Client") as string]));
  const clientPayments = new Map<string, { collected: number; invoiceIds: Set<string> }>();

  for (const p of recentPayments) {
    const inv = p.invoiceId ? (invoices || []).find((i) => i.id === p.invoiceId) : undefined;
    const clientId = p.contactId || inv?.contactId;
    if (clientId) {
      const entry = clientPayments.get(clientId) || { collected: 0, invoiceIds: new Set<string>() };
      entry.collected += Number((p as any).amount ?? (p as any).amountPaid ?? 0);
      if (p.invoiceId) entry.invoiceIds.add(p.invoiceId);
      clientPayments.set(clientId, entry);
    }
  }

  const topClients = Array.from(clientPayments.entries())
    .map(([clientId, data]) => ({
      clientId,
      name: (contactMap.get(clientId) || "Client") as string,
      collected: roundMoney(data.collected, accountingCurrency),
      invoices: data.invoiceIds.size,
    }))
    .sort((a, b) => b.collected - a.collected)
    .slice(0, 5);

  const buckets: ReceivablesInsight["aging"][number]["bucket"][] = [
    "current",
    "d1_30",
    "d31_60",
    "d61_90",
    "d90_plus",
  ];

  return {
    collectionRate: issued > 0 ? Math.round((totalPaid / issued) * 1000) / 10 : 0,
    averageDaysToCollect,
    averageInvoiceValue: roundMoney(avg, accountingCurrency),
    invoicesIssued: count,
    aging: buckets.map((bucket) => ({
      bucket,
      amount: roundMoney(agingBuckets[bucket].amount, accountingCurrency),
      count: agingBuckets[bucket].count,
    })),
    topClients,
  };
}

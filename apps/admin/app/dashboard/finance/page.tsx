import { requirePermission } from "../../../lib/auth";
import * as React from "react";
import {
  getFinancialSummary,
  getMonthlyCashflow,
  getAllExpenses,
  getExpenseCategories,
  getAllInvoices,
} from "@ishoot/database";
import { FinancialAnalyticsView } from "../../../components/finance/FinancialAnalyticsView";

export const dynamic = "force-dynamic";

export default async function FinancialDashboardPage() {
  await requirePermission("finance_analytics", "read");
  await requirePermission("invoices", "read");
  const [finance, expenses, categories, invoices, monthlyCashflow] = await Promise.all([
    getFinancialSummary(),
    getAllExpenses(),
    getExpenseCategories(),
    getAllInvoices(),
    getMonthlyCashflow(6),
  ]);

  return (
    <FinancialAnalyticsView
      finance={finance}
      expenses={expenses}
      categories={categories}
      invoices={invoices.filter((invoice) => invoice.currency === "BHD")}
      monthlyCashflow={monthlyCashflow}
    />
  );
}

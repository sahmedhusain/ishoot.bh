import * as React from "react";
import {
  getFinancialSummary,
  getAllExpenses,
  getExpenseCategories,
  getAllInvoices,
} from "@ishoot/database";
import { FinancialAnalyticsView } from "../../../components/finance/FinancialAnalyticsView";

export const dynamic = "force-dynamic";

export default async function FinancialDashboardPage() {
  const [finance, expenses, categories, invoices] = await Promise.all([
    getFinancialSummary(),
    getAllExpenses(),
    getExpenseCategories(),
    getAllInvoices(),
  ]);

  return (
    <FinancialAnalyticsView
      finance={finance}
      expenses={expenses}
      categories={categories}
      invoices={invoices}
    />
  );
}

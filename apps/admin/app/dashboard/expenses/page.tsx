import * as React from "react";
import {
  getAllExpenses,
  getExpenseCategories,
  getCRMDeals,
} from "@ishoot/database";
import { ExpensesManagementView } from "../../../components/expenses/ExpensesManagementView";

export const dynamic = "force-dynamic";

export default async function ExpensesPage() {
  const [expenses, categories, deals] = await Promise.all([
    getAllExpenses(),
    getExpenseCategories(),
    getCRMDeals(),
  ]);

  return (
    <ExpensesManagementView
      initialExpenses={expenses}
      categories={categories}
      deals={deals}
    />
  );
}

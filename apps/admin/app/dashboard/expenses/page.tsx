import { requirePermission } from "../../../lib/auth";
import { getExpensesPage, getExpenseCategories, type ListParameters } from "@ishoot/database";
import { ExpensesManagementView } from "../../../components/expenses/ExpensesManagementView";
import { ListControls } from "../../../components/shared/ListControls";
export const dynamic = "force-dynamic";
export default async function ExpensesPage({ searchParams }: { searchParams: Promise<ListParameters> }) {
  await requirePermission("expenses", "read");
  const [result, categories] = await Promise.all([getExpensesPage(await searchParams), getExpenseCategories()]);
  return <><ListControls path="/dashboard/expenses" {...result} exportDomain="expenses" /><ExpensesManagementView key={JSON.stringify(result.filters) + result.page} initialExpenses={result.items} categories={categories} totals={result.totals} count={result.count} /></>;
}

import { ROUTES } from "../../../constants/routes";
import { requirePagePermission } from "../../../lib/auth";
import { getExpensesPage, getExpenseCategories, type ListParameters } from "@platform/database";
import { ExpensesManagementView } from "../../../components/expenses/ExpensesManagementView";
import { ListControls } from "../../../components/shared/ListControls";
import { dataScope } from "../../../lib/data-scope";
import { pageMetadata } from "../../../lib/company-metadata";

export const generateMetadata = () => pageMetadata("expenses");

export const dynamic = "force-dynamic";
export default async function ExpensesPage({ searchParams }: { searchParams: Promise<ListParameters> }) {
  await requirePagePermission("expenses", "read");
  const [result, categories] = await Promise.all([getExpensesPage(await searchParams, undefined, await dataScope("expenses")), getExpenseCategories()]);
  return <ExpensesManagementView key={JSON.stringify(result.filters) + result.page} initialExpenses={result.items} categories={categories} totals={result.totals} count={result.count} scopeCounts={result.scopeCounts} controls={<ListControls path={ROUTES.expenses.list()} {...result} exportDomain="expenses" />} />;
}

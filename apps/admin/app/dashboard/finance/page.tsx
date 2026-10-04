import { requirePermission } from "../../../lib/auth";
import {
getFinancialSummary,
getMonthlyCashflow,
getExpenseCategoryTotals,
getExpenseCategories,
} from "@ishoot/database";
import { FinancialAnalyticsView } from "../../../components/finance/FinancialAnalyticsView";

export const dynamic = "force-dynamic";

export default async function FinancialDashboardPage() {
  await requirePermission("finance_analytics", "read");
  const [finance, categoryTotals, categories, monthlyCashflow] =
    await Promise.all([
      getFinancialSummary(),
      getExpenseCategoryTotals(),
      getExpenseCategories(),
      getMonthlyCashflow(6),
    ]);

  return (
    <FinancialAnalyticsView
      finance={finance}
      categoryTotals={categoryTotals}
      categories={categories}
      monthlyCashflow={monthlyCashflow}
    />
  );
}

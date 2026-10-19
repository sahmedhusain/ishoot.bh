import { requirePagePermission } from "../../../lib/auth";
import {
getFinancialSummary,
getMonthlyCashflow,
getExpenseCategoryTotals,
getExpenseCategories,
getReceivablesInsight,
} from "@platform/database";
import { FinancialAnalyticsView } from "../../../components/finance/FinancialAnalyticsView";

export const dynamic = "force-dynamic";

export default async function FinancialDashboardPage() {
  await requirePagePermission("finance_analytics", "read");
  const [finance, insight, categoryTotals, categories, monthlyCashflow] =
    await Promise.all([
      getFinancialSummary(),
      getReceivablesInsight(),
      getExpenseCategoryTotals(),
      getExpenseCategories(),
      getMonthlyCashflow(12),
    ]);

  return (
    <FinancialAnalyticsView
      finance={finance}
      insight={insight}
      categoryTotals={categoryTotals}
      categories={categories}
      monthlyCashflow={monthlyCashflow}
    />
  );
}

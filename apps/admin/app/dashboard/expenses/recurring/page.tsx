import { getCurrentPermissions, requirePagePermission } from "../../../../lib/auth";
import { getExpenseCategories, listRecurringExpenses } from "@ishoot/database";
import { RecurringExpensesView } from "../../../../components/expenses/RecurringExpensesView";

export const dynamic = "force-dynamic";

export default async function RecurringExpensesPage() {
  await requirePagePermission("expenses", "read");
  const [items, categories, grants] = await Promise.all([listRecurringExpenses(), getExpenseCategories(), getCurrentPermissions()]);
  return (
    <RecurringExpensesView
      items={items}
      categories={categories}
      canWrite={grants["expenses:write"] === true}
      canDelete={grants["expenses:delete"] === true}
    />
  );
}

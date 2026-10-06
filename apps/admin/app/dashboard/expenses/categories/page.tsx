import { getCurrentPermissions, requirePagePermission } from "../../../../lib/auth";
import { getExpenseCategories } from "@ishoot/database";
import { ExpenseCategoriesView } from "../../../../components/expenses/ExpenseCategoriesView";

export const dynamic = "force-dynamic";

export default async function ExpenseCategoriesPage() {
  await requirePagePermission("expenses", "write");
  const [categories, grants] = await Promise.all([getExpenseCategories({ includeInactive: true }), getCurrentPermissions()]);
  return <ExpenseCategoriesView initialCategories={categories} canDelete={grants["expenses:delete"] === true} />;
}

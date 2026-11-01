import { getCurrentPermissions, requirePagePermission } from "../../../../lib/auth";
import { getExpenseCategories } from "@platform/database";
import { ExpenseCategoriesView } from "../../../../components/expenses/ExpenseCategoriesView";
import { pageMetadata } from "../../../../lib/company-metadata";

export const generateMetadata = () => pageMetadata("expenses/categories");

export const dynamic = "force-dynamic";

export default async function ExpenseCategoriesPage() {
  await requirePagePermission("expenses", "write");
  const [categories, grants] = await Promise.all([getExpenseCategories({ includeInactive: true }), getCurrentPermissions()]);
  return <ExpenseCategoriesView initialCategories={categories} canDelete={grants["expenses:delete"] === true} />;
}

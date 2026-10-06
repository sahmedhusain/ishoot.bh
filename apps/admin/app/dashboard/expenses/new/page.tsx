import { getCurrentPermissions, requirePagePermission } from "../../../../lib/auth";
import { Metadata } from "next";
import { getExpenseCategories } from "@ishoot/database";
import { getCachedCompanySettings } from "../../../../lib/cached-queries";
import { NewExpenseFormView } from "@/components/expenses/NewExpenseFormView";

export const metadata: Metadata = {
  title: "New expense | Finance",
};

export default async function NewExpensePage({ searchParams }: { searchParams: Promise<{ dealId?: string; clientId?: string }> }) {
  await requirePagePermission("expenses", "write");
  const [params, categories, company, grants] = await Promise.all([searchParams, getExpenseCategories(), getCachedCompanySettings(), getCurrentPermissions()]);
  return (
    <NewExpenseFormView
      categories={categories}
      defaultCurrency={company?.default_currency ?? "BHD"}
      dealId={params.dealId}
      clientId={params.clientId}
      canManageCategories={grants["expenses:write"] === true}
    />
  );
}

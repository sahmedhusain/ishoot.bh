import { requirePermission } from "../../../../lib/auth";
import { getPortfolioItems,getPortfolioCategories } from "@ishoot/database";
import { PortfolioManagementView } from "../../../../components/cms/PortfolioManagementView";

export const dynamic = "force-dynamic";

export default async function PortfolioManagerPage() {
  await requirePermission("portfolio", "read");
  const [items, categories] = await Promise.all([
    getPortfolioItems(),
    getPortfolioCategories(),
  ]);

  return (
    <PortfolioManagementView initialItems={items} categories={categories} />
  );
}

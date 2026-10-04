import { requirePermission } from "../../../../lib/auth";
import { getPortfolioItems,getPortfolioCategories } from "@ishoot/database";
import { PortfolioManagementView } from "../../../../components/cms/PortfolioManagementView";
import { WebsitePublicationNotice } from "../../../../components/cms/WebsitePublicationNotice";

export const dynamic = "force-dynamic";

export default async function PortfolioManagerPage() {
  await requirePermission("portfolio", "read");
  const [items, categories] = await Promise.all([
    getPortfolioItems(),
    getPortfolioCategories(),
  ]);

  return (
    <div className="space-y-4">
      <WebsitePublicationNotice section="portfolio" />
      <PortfolioManagementView initialItems={items} categories={categories} />
    </div>
  );
}

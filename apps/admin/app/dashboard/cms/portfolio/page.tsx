import { requirePagePermission } from "../../../../lib/auth";
import { getPortfolioItems, getPortfolioCategories, getWebsiteEditor, getCompanySettings } from "@platform/database";
import { resolveWebsiteConfig, validateWebsiteConfig } from "@platform/database/website-config";
import { activityPreset } from "@platform/database/website-presets";
import { PortfolioManagementView } from "../../../../components/cms/PortfolioManagementView";
import { WebsitePublicationNotice } from "../../../../components/cms/WebsitePublicationNotice";
import { pageMetadata } from "../../../../lib/company-metadata";

export const generateMetadata = () => pageMetadata("cms/portfolio");

export const dynamic = "force-dynamic";

export default async function PortfolioManagerPage() {
  await requirePagePermission("portfolio", "read");
  const [items, categories, website, company] = await Promise.all([
    getPortfolioItems(),
    getPortfolioCategories(),
    getWebsiteEditor(),
    getCompanySettings(),
  ]);
  // The catalogue is edited with the details its website type uses (price for products, client for projects…).
  const config = resolveWebsiteConfig(validateWebsiteConfig(website.draft));
  const preset = activityPreset(config.purpose);
  const fields = config.collection.layout === preset.collection.layout ? preset.collection.fields : activityFieldsForLayout(config.collection.layout);

  return (
    <div className="space-y-4">
      <WebsitePublicationNotice section="portfolio" />
      <PortfolioManagementView
        initialItems={items}
        categories={categories}
        languages={company.content_languages}
        catalogue={{ nameEn: config.collection.navEn, nameAr: config.collection.navAr, layout: config.collection.layout, fields, currency: company.default_currency }}
      />
    </div>
  );
}

/** Details for a card style chosen independently of the website type. */
function activityFieldsForLayout(layout: string) {
  if (layout === "product") return activityPreset("products").collection.fields;
  if (layout === "listing") return activityPreset("real_estate").collection.fields;
  return activityPreset("services").collection.fields;
}

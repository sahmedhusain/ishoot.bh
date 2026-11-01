import { requirePagePermission } from "../../../../lib/auth";
import { listProductCategories, requireFeatureEnabled } from "@platform/database";
import { getCachedCompanySettings } from "../../../../lib/cached-queries";
import { ProductEditorView } from "../../../../components/products/ProductEditorView";
import { BATCH_ACTIVITIES } from "@platform/database/constants/inventory";
import { pageMetadata } from "../../../../lib/company-metadata";

export const generateMetadata = () => pageMetadata("products/new");

export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  await requirePagePermission("products", "create");
  await requireFeatureEnabled("products");
  const [categories, company] = await Promise.all([listProductCategories(), getCachedCompanySettings()]);
  const batchesByDefault = (BATCH_ACTIVITIES as readonly string[]).includes(company.business_activity ?? "");
  return <ProductEditorView product={null} categories={categories} currency={company.default_currency} languages={company.content_languages} canEdit canDelete={false} canPublish={false} batchesByDefault={batchesByDefault} />;
}

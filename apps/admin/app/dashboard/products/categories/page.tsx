import { hasPermission, requirePagePermission } from "../../../../lib/auth";
import { listProductCategories, requireFeatureEnabled } from "@platform/database";
import { getCachedCompanySettings } from "../../../../lib/cached-queries";
import { ProductCategoriesView } from "../../../../components/products/ProductCategoriesView";

export const dynamic = "force-dynamic";

export default async function ProductCategoriesPage() {
  await requirePagePermission("products", "read");
  await requireFeatureEnabled("products");
  const [categories, company, canEdit, canDelete] = await Promise.all([listProductCategories(), getCachedCompanySettings(), hasPermission("products", "edit"), hasPermission("products", "delete")]);
  return <ProductCategoriesView categories={categories} languages={company.content_languages} canEdit={canEdit} canDelete={canDelete} />;
}

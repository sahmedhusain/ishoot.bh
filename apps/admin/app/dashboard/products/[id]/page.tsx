import { notFound } from "next/navigation";
import { hasPermission, requirePagePermission } from "../../../../lib/auth";
import { getProduct, listProductCategories, requireFeatureEnabled } from "@platform/database";
import { getCachedCompanySettings } from "../../../../lib/cached-queries";
import { ProductEditorView } from "../../../../components/products/ProductEditorView";

export const dynamic = "force-dynamic";

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePagePermission("products", "read");
  await requireFeatureEnabled("products");
  const { id } = await params;
  const [product, categories, company, canEdit, canDelete, canPublish] = await Promise.all([
    getProduct(id),
    listProductCategories(),
    getCachedCompanySettings(),
    hasPermission("products", "edit"),
    hasPermission("products", "delete"),
    hasPermission("portfolio", "create"),
  ]);
  if (!product) notFound();
  return <ProductEditorView product={product} categories={categories} currency={company.default_currency} languages={company.content_languages} canEdit={canEdit} canDelete={canDelete} canPublish={canPublish} />;
}

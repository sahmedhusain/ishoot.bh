import { notFound } from "next/navigation";
import { hasPermission, requirePagePermission } from "../../../../lib/auth";
import { getProduct, getProductStock, listProductCategories, listWarehouses, requireFeatureEnabled } from "@platform/database";
import { ProductStockPanel } from "../../../../components/inventory/ProductStockPanel";
import { getCachedCompanySettings } from "../../../../lib/cached-queries";
import { ProductEditorView } from "../../../../components/products/ProductEditorView";

export const dynamic = "force-dynamic";

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePagePermission("products", "read");
  await requireFeatureEnabled("products");
  const { id } = await params;
  const [product, categories, company, canEdit, canDelete, canPublish, canSeeStock, canEditStock] = await Promise.all([
    getProduct(id),
    listProductCategories(),
    getCachedCompanySettings(),
    hasPermission("products", "edit"),
    hasPermission("products", "delete"),
    hasPermission("portfolio", "create"),
    hasPermission("inventory", "read"),
    hasPermission("inventory", "edit"),
  ]);
  if (!product) notFound();
  const [stock, warehouses] = canSeeStock && product.track_stock ? await Promise.all([getProductStock(product.id), listWarehouses()]) : [null, []];
  const stockPanel = stock ? (
    <ProductStockPanel
      key="stock"
      productId={product.id}
      name={company.primary_language === "ar" ? product.name_ar : product.name_en}
      sku={product.sku}
      trackBatches={product.track_batches}
      options={product.options}
      variants={product.variants.map((v) => ({ id: v.id, values: v.option_values }))}
      stock={stock}
      warehouses={warehouses}
      currency={company.default_currency}
      canEdit={canEditStock}
    />
  ) : null;
  return <ProductEditorView product={product} categories={categories} currency={company.default_currency} languages={company.content_languages} canEdit={canEdit} canDelete={canDelete} canPublish={canPublish} stockPanel={stockPanel} />;
}

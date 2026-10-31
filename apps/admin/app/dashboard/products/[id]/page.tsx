import { notFound } from "next/navigation";
import { getCurrentUser, hasPermission, requirePagePermission } from "../../../../lib/auth";
import { getProduct, getProductStock, isFeatureEnabled, listProductCategories, listWarehouses, purchasePriceHistory, requireFeatureEnabled } from "@platform/database";
import { PurchasePricesCard } from "../../../../components/procurement/PurchasePricesCard";
import { ProductStockPanel } from "../../../../components/inventory/ProductStockPanel";
import { getCachedCompanySettings } from "../../../../lib/cached-queries";
import { ProductEditorView } from "../../../../components/products/ProductEditorView";

export const dynamic = "force-dynamic";

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePagePermission("products", "read");
  await requireFeatureEnabled("products");
  const { id } = await params;
  const [product, categories, company, canEdit, canDelete, canPublish, canSeeStock, canEditStock, user] = await Promise.all([
    getProduct(id),
    listProductCategories(),
    getCachedCompanySettings(),
    hasPermission("products", "edit"),
    hasPermission("products", "delete"),
    hasPermission("portfolio", "create"),
    hasPermission("inventory", "read"),
    hasPermission("inventory", "edit"),
    getCurrentUser(),
  ]);
  const showPrices = (await isFeatureEnabled("procurement")) && (await hasPermission("procurement", "read"));
  const prices = showPrices && product ? await purchasePriceHistory(product.id) : null;
  if (!product) notFound();
  const [stock, warehouses] = canSeeStock && product.track_stock ? await Promise.all([getProductStock(product.id, user?.id), listWarehouses(user?.id)]) : [null, []];
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
  const panels =
    stockPanel || prices ? (
      <div key="panels" className="space-y-6">
        {stockPanel}
        {prices ? <PurchasePricesCard rows={prices} currency={company.default_currency} /> : null}
      </div>
    ) : null;
  return <ProductEditorView product={product} categories={categories} currency={company.default_currency} languages={company.content_languages} canEdit={canEdit} canDelete={canDelete} canPublish={canPublish} stockPanel={panels} />;
}

import { notFound } from "next/navigation";
import { hasPermission, requirePagePermission } from "../../../../../lib/auth";
import { db, getPurchaseOrder, listSuppliers, listWarehouses, procurementProductOptions, requireFeatureEnabled } from "@platform/database";
import { RECEIVABLE_ORDER_STATUSES } from "@platform/database/constants/procurement";
import { ReceiveGoodsPanel } from "../../../../../components/procurement/ReceiveGoodsPanel";
import { getCachedCompanySettings } from "../../../../../lib/cached-queries";
import { PurchaseOrderView } from "../../../../../components/procurement/PurchaseOrderView";

export const dynamic = "force-dynamic";

export default async function PurchaseOrderPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePagePermission("procurement", "read");
  await requireFeatureEnabled("procurement");
  const { id } = await params;
  const [order, suppliers, warehouses, products, company, canEdit, canExport, canCreate] = await Promise.all([getPurchaseOrder(id), listSuppliers(), listWarehouses(), procurementProductOptions(), getCachedCompanySettings(), hasPermission("procurement", "edit"), hasPermission("procurement", "export"), hasPermission("procurement", "create")]);
  if (!order) notFound();
  const receivable = canCreate && (RECEIVABLE_ORDER_STATUSES as readonly string[]).includes(order.status);
  // Goods go to the order's warehouse (all warehouses when none was set).
  const locations = warehouses
    .filter((w) => w.is_active && (!order.warehouse || w.id === order.warehouse.id))
    .flatMap((w) => w.locations.filter((l) => l.is_active).map((l) => ({ id: l.id, label: `${company.primary_language === "ar" ? w.name_ar : w.name_en} · ${l.name || l.code}` })));
  const batchProducts = receivable ? (await db.product.findMany({ where: { id: { in: order.lines.map((l) => l.product_id).filter((v): v is string => !!v) }, trackBatches: true }, select: { id: true } })).map((p) => p.id) : [];
  return (
    <PurchaseOrderView
      order={order}
      fromRequisition={null}
      suppliers={suppliers}
      warehouses={warehouses}
      products={products}
      company={{ currency: company.default_currency, vatEnabled: company.vat_enabled, vatPercentage: Number(company.vat_percentage), name: company.primary_language === "ar" ? company.company_name_ar : company.company_name_en }}
      rights={{ edit: canEdit, export: canExport, cancel: canEdit, receive: receivable, bill: canCreate }}
      receivePanel={receivable ? <ReceiveGoodsPanel key="receive" order={order} locations={locations} batchProducts={batchProducts} /> : null}
    />
  );
}

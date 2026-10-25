import { notFound } from "next/navigation";
import { hasPermission, requirePagePermission } from "../../../../../lib/auth";
import { getPurchaseOrder, listSuppliers, listWarehouses, procurementProductOptions, requireFeatureEnabled } from "@platform/database";
import { getCachedCompanySettings } from "../../../../../lib/cached-queries";
import { PurchaseOrderView } from "../../../../../components/procurement/PurchaseOrderView";

export const dynamic = "force-dynamic";

export default async function PurchaseOrderPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePagePermission("procurement", "read");
  await requireFeatureEnabled("procurement");
  const { id } = await params;
  const [order, suppliers, warehouses, products, company, canEdit, canExport] = await Promise.all([getPurchaseOrder(id), listSuppliers(), listWarehouses(), procurementProductOptions(), getCachedCompanySettings(), hasPermission("procurement", "edit"), hasPermission("procurement", "export")]);
  if (!order) notFound();
  return (
    <PurchaseOrderView
      order={order}
      fromRequisition={null}
      suppliers={suppliers}
      warehouses={warehouses}
      products={products}
      company={{ currency: company.default_currency, vatEnabled: company.vat_enabled, vatPercentage: Number(company.vat_percentage), name: company.primary_language === "ar" ? company.company_name_ar : company.company_name_en }}
      rights={{ edit: canEdit, export: canExport, cancel: canEdit }}
    />
  );
}

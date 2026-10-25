import { requirePagePermission } from "../../../../../lib/auth";
import { getRequisition, listSuppliers, listWarehouses, procurementProductOptions, requireFeatureEnabled } from "@platform/database";
import { getCachedCompanySettings } from "../../../../../lib/cached-queries";
import { PurchaseOrderView } from "../../../../../components/procurement/PurchaseOrderView";

export const dynamic = "force-dynamic";

export default async function NewPurchaseOrderPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requirePagePermission("procurement", "create");
  await requireFeatureEnabled("procurement");
  const query = await searchParams;
  const requisitionId = typeof query.requisitionId === "string" ? query.requisitionId : "";
  const [suppliers, warehouses, products, company, requisition] = await Promise.all([listSuppliers(), listWarehouses(), procurementProductOptions(), getCachedCompanySettings(), requisitionId ? getRequisition(requisitionId) : null]);
  return (
    <PurchaseOrderView
      order={null}
      fromRequisition={requisition && requisition.status === "approved" ? { id: requisition.id, number: requisition.number, lines: requisition.lines } : null}
      suppliers={suppliers}
      warehouses={warehouses}
      products={products}
      company={{ currency: company.default_currency, vatEnabled: company.vat_enabled, vatPercentage: Number(company.vat_percentage), name: company.primary_language === "ar" ? company.company_name_ar : company.company_name_en }}
      rights={{ edit: true, export: false, cancel: false }}
    />
  );
}

import { requirePagePermission } from "../../../../../lib/auth";
import { billableOrderLines, listSuppliers, requireFeatureEnabled } from "@platform/database";
import { getCachedCompanySettings } from "../../../../../lib/cached-queries";
import { SupplierBillView } from "../../../../../components/procurement/SupplierBillView";
import { pageMetadata } from "../../../../../lib/company-metadata";

export const generateMetadata = () => pageMetadata("procurement/bills/new");

export const dynamic = "force-dynamic";

export default async function NewSupplierBillPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requirePagePermission("procurement", "create");
  await requireFeatureEnabled("procurement");
  const query = await searchParams;
  const orderId = typeof query.orderId === "string" ? query.orderId : "";
  const [suppliers, company, fromOrder] = await Promise.all([listSuppliers(), getCachedCompanySettings(), orderId ? billableOrderLines(orderId) : null]);
  return <SupplierBillView bill={null} fromOrder={fromOrder} suppliers={suppliers.map((s) => ({ id: s.id, name: s.name }))} currency={company.default_currency} rights={{ edit: true, approve: false, pay: false }} />;
}

import { notFound } from "next/navigation";
import { hasPermission, requirePagePermission } from "../../../../../lib/auth";
import { getSupplierBill, listSuppliers, requireFeatureEnabled } from "@platform/database";
import { getCachedCompanySettings } from "../../../../../lib/cached-queries";
import { SupplierBillView } from "../../../../../components/procurement/SupplierBillView";

export const dynamic = "force-dynamic";

export default async function SupplierBillPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePagePermission("procurement", "read");
  await requireFeatureEnabled("procurement");
  const { id } = await params;
  const [bill, suppliers, company, canEdit, canApprove] = await Promise.all([getSupplierBill(id), listSuppliers(), getCachedCompanySettings(), hasPermission("procurement", "edit"), hasPermission("procurement", "approve")]);
  if (!bill) notFound();
  return <SupplierBillView bill={bill} fromOrder={null} suppliers={suppliers.map((s) => ({ id: s.id, name: s.name }))} currency={company.default_currency} rights={{ edit: canEdit, approve: canApprove, pay: canEdit }} />;
}

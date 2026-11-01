import { notFound } from "next/navigation";
import { hasPermission, requirePagePermission } from "../../../../../lib/auth";
import { getRfq, listSuppliers, requireFeatureEnabled } from "@platform/database";
import { getCachedCompanySettings } from "../../../../../lib/cached-queries";
import { RfqView } from "../../../../../components/procurement/RfqView";
import { pageMetadata } from "../../../../../lib/company-metadata";

export const generateMetadata = () => pageMetadata("procurement/rfqs/[id]");

export const dynamic = "force-dynamic";

export default async function RfqPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePagePermission("procurement", "read");
  await requireFeatureEnabled("procurement");
  const { id } = await params;
  const [rfq, suppliers, company, canEdit, canOrder] = await Promise.all([getRfq(id), listSuppliers(), getCachedCompanySettings(), hasPermission("procurement", "edit"), hasPermission("procurement", "create")]);
  if (!rfq) notFound();
  return <RfqView rfq={rfq} suppliers={suppliers.map((s) => ({ id: s.id, name: s.name }))} currency={company.default_currency} canEdit={canEdit} canOrder={canOrder} />;
}

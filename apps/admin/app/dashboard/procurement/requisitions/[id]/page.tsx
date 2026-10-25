import { notFound } from "next/navigation";
import { getCurrentUser, hasPermission, requirePagePermission } from "../../../../../lib/auth";
import { getRequisition, procurementProductOptions, requireFeatureEnabled } from "@platform/database";
import { getCachedCompanySettings } from "../../../../../lib/cached-queries";
import { RequisitionView } from "../../../../../components/procurement/RequisitionView";

export const dynamic = "force-dynamic";

export default async function RequisitionPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePagePermission("procurement", "create");
  await requireFeatureEnabled("procurement");
  const { id } = await params;
  const [requisition, products, company, user, canReadAll, canEditAll] = await Promise.all([getRequisition(id), procurementProductOptions(), getCachedCompanySettings(), getCurrentUser(), hasPermission("procurement", "read"), hasPermission("procurement", "edit")]);
  if (!requisition || (!canReadAll && requisition.requested_by_id !== user!.id)) notFound();
  return <RequisitionView requisition={requisition} products={products} currency={company.default_currency} canEdit={canEditAll || requisition.requested_by_id === user!.id} canProcure={canEditAll} />;
}

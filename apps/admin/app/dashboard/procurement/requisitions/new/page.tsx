import { requirePagePermission } from "../../../../../lib/auth";
import { procurementProductOptions, requireFeatureEnabled } from "@platform/database";
import { getCachedCompanySettings } from "../../../../../lib/cached-queries";
import { RequisitionView } from "../../../../../components/procurement/RequisitionView";
import { pageMetadata } from "../../../../../lib/company-metadata";

export const generateMetadata = () => pageMetadata("procurement/requisitions/new");

export const dynamic = "force-dynamic";

export default async function NewRequisitionPage() {
  await requirePagePermission("procurement", "create");
  await requireFeatureEnabled("procurement");
  const [products, company] = await Promise.all([procurementProductOptions(), getCachedCompanySettings()]);
  return <RequisitionView requisition={null} products={products} currency={company.default_currency} canEdit canProcure={false} />;
}

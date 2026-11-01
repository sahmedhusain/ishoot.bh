import { hasPermission, requirePagePermission } from "../../../../lib/auth";
import { listRfqs, procurementProductOptions, requireFeatureEnabled } from "@platform/database";
import { RfqsListView } from "../../../../components/procurement/RfqsListView";
import { pageMetadata } from "../../../../lib/company-metadata";

export const generateMetadata = () => pageMetadata("procurement/rfqs");

export const dynamic = "force-dynamic";

export default async function RfqsPage() {
  await requirePagePermission("procurement", "read");
  await requireFeatureEnabled("procurement");
  const [rows, products, canEdit] = await Promise.all([listRfqs(), procurementProductOptions(), hasPermission("procurement", "edit")]);
  return <RfqsListView rows={rows} products={products} canEdit={canEdit} />;
}

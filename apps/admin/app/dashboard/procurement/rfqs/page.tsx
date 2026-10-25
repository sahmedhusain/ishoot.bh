import { hasPermission, requirePagePermission } from "../../../../lib/auth";
import { listRfqs, procurementProductOptions, requireFeatureEnabled } from "@platform/database";
import { RfqsListView } from "../../../../components/procurement/RfqsListView";

export const dynamic = "force-dynamic";

export default async function RfqsPage() {
  await requirePagePermission("procurement", "read");
  await requireFeatureEnabled("procurement");
  const [rows, products, canEdit] = await Promise.all([listRfqs(), procurementProductOptions(), hasPermission("procurement", "edit")]);
  return <RfqsListView rows={rows} products={products} canEdit={canEdit} />;
}

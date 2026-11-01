import { requirePagePermission } from "../../../../lib/auth";
import { requireFeatureEnabled } from "@platform/database";
import { getTransferWorkspace } from "@platform/database/queries/transfer-workspace";
import { StockTransfersView } from "../../../../components/inventory/StockTransfersView";
import { pageMetadata } from "../../../../lib/company-metadata";

export const generateMetadata = () => pageMetadata("inventory/transfers");

export const dynamic = "force-dynamic";
export default async function StockTransfersPage() {
  const actor = await requirePagePermission("inventory", "read");
  await requireFeatureEnabled("products");
  return <StockTransfersView data={await getTransferWorkspace(actor.id)} />;
}

import { listAssetCategories } from "@ishoot/database";
import { requirePagePermission } from "../../../../lib/auth";
import { NewAssetView } from "../../../../components/assets/NewAssetView";

export const dynamic = "force-dynamic";

export default async function NewAssetPage() {
  await requirePagePermission("assets", "create");
  return <NewAssetView categories={await listAssetCategories(false)} />;
}

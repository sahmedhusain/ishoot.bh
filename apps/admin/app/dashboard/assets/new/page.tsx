import { listAssetCategories } from "@platform/database";
import { requirePagePermission } from "../../../../lib/auth";
import { NewAssetView } from "../../../../components/assets/NewAssetView";
import { pageMetadata } from "../../../../lib/company-metadata";

export const generateMetadata = () => pageMetadata("assets/new");

export const dynamic = "force-dynamic";

export default async function NewAssetPage() {
  await requirePagePermission("assets", "create");
  return <NewAssetView categories={await listAssetCategories(false)} />;
}

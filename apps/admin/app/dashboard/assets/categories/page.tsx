import { listAssetCategories } from "@platform/database";
import { requirePagePermission } from "../../../../lib/auth";
import { AssetCategoriesView } from "../../../../components/assets/AssetCategoriesView";
import { pageMetadata } from "../../../../lib/company-metadata";

export const generateMetadata = () => pageMetadata("assets/categories");

export const dynamic = "force-dynamic";

export default async function AssetCategoriesPage() {
  await requirePagePermission("assets", "edit");
  return <AssetCategoriesView categories={await listAssetCategories()} />;
}

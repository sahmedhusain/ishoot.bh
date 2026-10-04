import { requirePermission } from "../../../../lib/auth";
import { getAllBanners } from "@ishoot/database";
import { BannersManagementView } from "../../../../components/cms/BannersManagementView";

export const dynamic = "force-dynamic";

export default async function BannersManagerPage() {
  await requirePermission("banners", "read");
  const banners = await getAllBanners();

  return <BannersManagementView initialBanners={banners} />;
}

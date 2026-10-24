import { requirePagePermission } from "../../../../lib/auth";
import { getAllBanners } from "@platform/database";
import { BannersManagementView } from "../../../../components/cms/BannersManagementView";
import { WebsitePublicationNotice } from "../../../../components/cms/WebsitePublicationNotice";

export const dynamic = "force-dynamic";

export default async function BannersManagerPage() {
  await requirePagePermission("banners", "read");
  const banners = await getAllBanners();

  return (
    <div className="space-y-4">
      <WebsitePublicationNotice section="banners" />
      <BannersManagementView initialBanners={banners} />
    </div>
  );
}

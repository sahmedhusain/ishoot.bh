import { requirePermission } from "../../../../lib/auth";
import { getAllBanners } from "@ishoot/database";
import { BannersManagementView } from "../../../../components/cms/BannersManagementView";
import { WebsitePublicationNotice } from "../../../../components/cms/WebsitePublicationNotice";

export const dynamic = "force-dynamic";

export default async function BannersManagerPage() {
  await requirePermission("banners", "read");
  const banners = await getAllBanners();

  return (
    <div className="space-y-4">
      <WebsitePublicationNotice section="banners" />
      <BannersManagementView initialBanners={banners} />
    </div>
  );
}

import { requirePagePermission } from "../../../../lib/auth";
import { getAllBanners, getCompanySettings } from "@platform/database";
import { BannersManagementView } from "../../../../components/cms/BannersManagementView";
import { WebsitePublicationNotice } from "../../../../components/cms/WebsitePublicationNotice";

export const dynamic = "force-dynamic";

export default async function BannersManagerPage() {
  await requirePagePermission("banners", "read");
  const [banners, company] = await Promise.all([getAllBanners(), getCompanySettings()]);

  return (
    <div className="space-y-4">
      <WebsitePublicationNotice section="banners" />
      <BannersManagementView initialBanners={banners} languages={company.content_languages} />
    </div>
  );
}

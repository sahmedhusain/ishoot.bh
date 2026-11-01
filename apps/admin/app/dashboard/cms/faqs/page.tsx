import { requirePagePermission } from "../../../../lib/auth";
import { getCompanySettings, getFaqs } from "@platform/database";
import { FaqsManagementView } from "../../../../components/cms/FaqsManagementView";
import { WebsitePublicationNotice } from "../../../../components/cms/WebsitePublicationNotice";
import { pageMetadata } from "../../../../lib/company-metadata";

export const generateMetadata = () => pageMetadata("cms/faqs");

export default async function FaqsSettingsPage() {
  await requirePagePermission("faqs", "read");

  const [faqs, company] = await Promise.all([getFaqs(true), getCompanySettings()]);

  return (
    <div className="space-y-4">
      <WebsitePublicationNotice section="faqs" />
      <FaqsManagementView initialFaqs={faqs} languages={company.content_languages} />
    </div>
  );
}

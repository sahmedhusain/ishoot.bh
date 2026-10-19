import { requirePagePermission } from "../../../../lib/auth";
import { getFaqs } from "@platform/database";
import { FaqsManagementView } from "../../../../components/cms/FaqsManagementView";
import { WebsitePublicationNotice } from "../../../../components/cms/WebsitePublicationNotice";

export default async function FaqsSettingsPage() {
  await requirePagePermission("faqs", "read");

  const faqs = await getFaqs(true);

  return (
    <div className="space-y-4">
      <WebsitePublicationNotice section="faqs" />
      <FaqsManagementView initialFaqs={faqs} />
    </div>
  );
}

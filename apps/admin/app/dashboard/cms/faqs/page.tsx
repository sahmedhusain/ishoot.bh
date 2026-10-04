import { requirePermission } from "../../../../lib/auth";
import { getFaqs } from "@ishoot/database";
import { FaqsManagementView } from "../../../../components/cms/FaqsManagementView";

export default async function FaqsSettingsPage() {
  await requirePermission("faqs", "read");

  const faqs = await getFaqs(true);

  return <FaqsManagementView initialFaqs={faqs} />;
}

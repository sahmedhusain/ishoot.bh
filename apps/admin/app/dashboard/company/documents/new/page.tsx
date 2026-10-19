import { requirePagePermission } from "../../../../../lib/auth";
import { getTranslations } from "@ishoot/locales";
import { NewCompanyDocumentFormView } from "../../../../../components/company/NewCompanyDocumentFormView";

export const metadata = { title: getTranslations("ar").admin.copy.newLegalDocument };

export default async function NewCompanyDocumentPage() {
  await requirePagePermission("settings", "write");
  return <NewCompanyDocumentFormView />;
}

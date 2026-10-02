import { requirePermission } from "../../../../../lib/auth";
import { Metadata } from "next";
import { NewCompanyDocumentFormView } from "../../../../../components/company/NewCompanyDocumentFormView";

export const metadata: Metadata = {
  title: "New Legal Document | Company Registry",
};

export default async function NewCompanyDocumentPage() {
  await requirePermission("settings", "write");
  return <NewCompanyDocumentFormView />;
}

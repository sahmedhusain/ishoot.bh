import { requirePagePermission } from "../../../../../lib/auth";
import { Metadata } from "next";
import { NewCompanyDocumentFormView } from "../../../../../components/company/NewCompanyDocumentFormView";

export const metadata: Metadata = {
  title: "New Legal Document | Company Registry",
};

export default async function NewCompanyDocumentPage() {
  await requirePagePermission("settings", "write");
  return <NewCompanyDocumentFormView />;
}

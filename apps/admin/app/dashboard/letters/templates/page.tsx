import { listLetterTemplates } from "@platform/database";
import { requirePagePermission, hasPermission } from "../../../../lib/auth";
import { LetterTemplatesView } from "../../../../components/communications/LetterWorkspace";
import { pageMetadata } from "../../../../lib/company-metadata";

export const generateMetadata = () => pageMetadata("letters/templates");

export const dynamic = "force-dynamic";
export default async function Page() {
  await requirePagePermission("letters", "read");
  return (
    <LetterTemplatesView
      templates={await listLetterTemplates()}
      canEdit={await hasPermission("letters", "edit")}
    />
  );
}

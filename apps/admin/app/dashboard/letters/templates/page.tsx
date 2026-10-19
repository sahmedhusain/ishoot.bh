import { listLetterTemplates } from "@ishoot/database";
import { requirePagePermission, hasPermission } from "../../../../lib/auth";
import { LetterTemplatesView } from "../../../../components/communications/LetterWorkspace";
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

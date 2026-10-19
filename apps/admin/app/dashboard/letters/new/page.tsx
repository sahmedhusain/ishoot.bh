import { listLetterTemplates } from "@ishoot/database";
import { requirePagePermission, hasPermission } from "../../../../lib/auth";
import { letterEmployees } from "../../../../lib/communication-options";
import { LetterWorkspace } from "../../../../components/communications/LetterWorkspace";
export const dynamic = "force-dynamic";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ templateId?: string }>;
}) {
  await requirePagePermission("letters", "create");
  return (
    <LetterWorkspace
      initialTemplateId={(await searchParams).templateId}
      templates={await listLetterTemplates(false)}
      employees={
        (await hasPermission("employees", "read"))
          ? await letterEmployees()
          : []
      }
      canEdit
      canDelete={false}
      canExport={false}
    />
  );
}

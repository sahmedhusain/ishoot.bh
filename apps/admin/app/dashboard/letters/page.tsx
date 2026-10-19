import { listOfficialLetters } from "@ishoot/database";
import { requirePagePermission, hasPermission } from "../../../lib/auth";
import { LettersListView } from "../../../components/communications/LettersListView";
export const dynamic = "force-dynamic";
export default async function Page() {
  await requirePagePermission("letters", "read");
  const [items, canCreate, canTemplates] = await Promise.all([
    listOfficialLetters(),
    hasPermission("letters", "create"),
    hasPermission("letters", "edit"),
  ]);
  return (
    <LettersListView
      items={items}
      canCreate={canCreate}
      canTemplates={canTemplates}
    />
  );
}

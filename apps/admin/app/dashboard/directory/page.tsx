import { requireAuth } from "../../../lib/auth";
import { getCompanyDirectory } from "@ishoot/database";
import { DirectoryView } from "../../../components/directory/DirectoryView";

export const dynamic = "force-dynamic";

/** Every signed-in staff member can reach colleagues: work contacts only. */
export default async function DirectoryPage() {
  await requireAuth();
  return <DirectoryView entries={await getCompanyDirectory()} />;
}

import { requirePermission } from "../../../../lib/auth";
import { getContactsPage, type ListParameters } from "@ishoot/database";
import { ContactsManagementView } from "../../../../components/crm/ContactsManagementView";
import { ListControls } from "../../../../components/shared/ListControls";
export const dynamic = "force-dynamic";
export default async function ContactsDirectoryPage({ searchParams }: { searchParams: Promise<ListParameters> }) {
  await requirePermission("contacts", "read");
  const result = await getContactsPage(await searchParams);
  return <><ListControls path="/dashboard/crm/contacts" {...result} exportDomain="contacts" /><ContactsManagementView key={JSON.stringify(result.filters) + result.page} initialContacts={result.items} /></>;
}

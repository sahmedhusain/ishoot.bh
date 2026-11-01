import { requirePagePermission } from "../../../../lib/auth";
import { getClientsPage, type ClientListParameters } from "@platform/database";
import { ClientsListView } from "../../../../components/crm/ClientsListView";
import { pageMetadata } from "../../../../lib/company-metadata";

export const generateMetadata = () => pageMetadata("crm/contacts");

export const dynamic = "force-dynamic";
export default async function ContactsDirectoryPage({ searchParams }: { searchParams: Promise<ClientListParameters> }) {
  await requirePagePermission("contacts", "read");
  const result = await getClientsPage(await searchParams);
  return (
    <ClientsListView
      key={JSON.stringify(result.filters) + result.page}
      rows={result.items}
      total={result.total}
      page={result.page}
      filters={result.filters}
      summary={result.summary!}
      currency={result.currency}
    />
  );
}

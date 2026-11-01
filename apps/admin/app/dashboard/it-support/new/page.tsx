import { requirePagePermission } from "../../../../lib/auth";
import { pageMetadata } from "../../../../lib/company-metadata";
import { NewItTicketFormView } from "../../../../components/it-support/NewItTicketFormView";

export const generateMetadata = () => pageMetadata("it-support/new");

export const dynamic = "force-dynamic";

export default async function NewItTicketPage() {
  await requirePagePermission("it_support", "create");
  return <NewItTicketFormView />;
}

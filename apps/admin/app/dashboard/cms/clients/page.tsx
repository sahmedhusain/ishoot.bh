import { requirePagePermission } from "../../../../lib/auth";
import { getAllClientLogos } from "@ishoot/database";
import { ClientsManagementView } from "../../../../components/cms/ClientsManagementView";
import { WebsitePublicationNotice } from "../../../../components/cms/WebsitePublicationNotice";

export const dynamic = "force-dynamic";

export default async function ClientLogosManagerPage() {
  await requirePagePermission("clients", "read");
  const logos = await getAllClientLogos();

  return (
    <div className="space-y-4">
      <WebsitePublicationNotice section="clients" />
      <ClientsManagementView initialLogos={logos} />
    </div>
  );
}

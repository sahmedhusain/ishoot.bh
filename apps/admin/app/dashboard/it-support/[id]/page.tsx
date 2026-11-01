import { getMyTicket } from "@platform/api-client";
import { notFound } from "next/navigation";
import { hasPermission, requirePagePermission } from "../../../../lib/auth";
import { pageMetadata } from "../../../../lib/company-metadata";
import { ItTicketDetailView } from "../../../../components/it-support/ItTicketDetailView";

export const generateMetadata = () => pageMetadata("it-support/[id]");

export const dynamic = "force-dynamic";

export default async function ItTicketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requirePagePermission("it_support", "read");
  const { id } = await params;
  // Another employee's ticket is "not found" in the itsm service, never "forbidden".
  const detail = await getMyTicket(id, user.id);
  if (!detail) notFound();
  return (
    <ItTicketDetailView
      detail={detail}
      canEdit={await hasPermission("it_support", "edit")}
    />
  );
}

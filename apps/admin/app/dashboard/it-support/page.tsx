import { listMyTickets } from "@platform/api-client";
import { TICKET_STATUSES } from "@platform/contracts";
import { hasPermission, requirePagePermission } from "../../../lib/auth";
import { pageMetadata } from "../../../lib/company-metadata";
import { ItSupportView } from "../../../components/it-support/ItSupportView";
import { LiveRefresh } from "../../../components/live/LiveRefresh";

export const generateMetadata = () => pageMetadata("it-support");

export const dynamic = "force-dynamic";

export default async function ItSupportPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; cursor?: string }>;
}) {
  const user = await requirePagePermission("it_support", "read");
  const params = await searchParams;
  const status = TICKET_STATUSES.includes(params.status ?? "")
    ? params.status!
    : "";
  const page = await listMyTickets(user.id, {
    status: status || undefined,
    cursor: params.cursor || undefined,
  }).catch(() => null);
  return (
    <>
      <LiveRefresh resources={["it_support"]} notificationCategories={["service_desk"]} />
      <ItSupportView
        status={status}
        page={page}
        canCreate={await hasPermission("it_support", "create")}
      />
    </>
  );
}

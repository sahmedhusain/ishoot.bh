import { notFound } from "next/navigation";
import { getQueueTicket } from "@platform/api-client";
import { itAllowed } from "@platform/contracts";
import { asUser, requireAllowed } from "../../../../lib/session";
import { TicketView } from "../../../../components/TicketView";

export default async function TicketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireAllowed("tickets", "read");
  const { id } = await params;
  const detail = await asUser(() => getQueueTicket(user.token, id));
  if (!detail) notFound();
  return (
    <TicketView
      detail={detail}
      canEdit={itAllowed(user.roles, "tickets", "edit")}
      canAssign={itAllowed(user.roles, "tickets", "assign")}
      isAssignee={detail.ticket.assigneeId === user.subject}
    />
  );
}

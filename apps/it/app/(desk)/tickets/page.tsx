import { listQueue } from "@platform/api-client";
import { TICKET_PRIORITIES, TICKET_STATUSES } from "@platform/contracts";
import { asUser, requireAllowed } from "../../../lib/session";
import { QueueView, type QueueQuery } from "../../../components/QueueView";

export default async function QueuePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await requireAllowed("tickets", "read");
  const params = await searchParams;
  const query: QueueQuery = {
    status: TICKET_STATUSES.includes(params.status ?? "") ? params.status! : "",
    priority: TICKET_PRIORITIES.includes(params.priority ?? "")
      ? params.priority!
      : "",
    open: params.open !== "false",
    mine: params.mine === "true",
    cursor: params.cursor ?? "",
  };
  const page = await asUser(() =>
    listQueue(user.token, {
      status: query.status || undefined,
      priority: query.priority || undefined,
      open: query.open && !query.status,
      assigneeId: query.mine ? user.subject : undefined,
      cursor: query.cursor || undefined,
    }),
  ).catch(() => null);
  return <QueueView query={query} page={page} />;
}

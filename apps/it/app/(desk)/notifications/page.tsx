import {
  listMessagesForIT,
  messageSummaryForIT,
  type NotifyListQuery,
} from "@platform/api-client";
import { itAllowed } from "@platform/contracts";
import { asUser, requireAllowed } from "../../../lib/session";
import {
  NotificationsView,
  type NotificationFilter,
} from "../../../components/NotificationsView";

const STATUSES = ["queued", "sent", "failed"];
const CHANNELS = ["email", "whatsapp"];

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await requireAllowed("notifications", "read");
  const params = await searchParams;
  const filter: NotificationFilter = {
    status: STATUSES.includes(params.status ?? "") ? params.status! : "",
    channel: CHANNELS.includes(params.channel ?? "") ? params.channel! : "",
    cursor: (params.cursor ?? "").slice(0, 200),
  };
  const [page, summary] = await Promise.all([
    asUser(() =>
      listMessagesForIT(user.token, {
        status: (filter.status || undefined) as NotifyListQuery["status"],
        channel: (filter.channel || undefined) as NotifyListQuery["channel"],
        cursor: filter.cursor || undefined,
      }),
    ).catch(() => null),
    asUser(() => messageSummaryForIT(user.token)).catch(() => []),
  ]);
  return (
    <NotificationsView
      filter={filter}
      page={page}
      summary={summary}
      canExecute={itAllowed(user.roles, "notifications", "execute")}
    />
  );
}

import { notFound } from "next/navigation";
import { getMessageForIT, isApiError } from "@platform/api-client";
import { itAllowed } from "@platform/contracts";
import { asUser, requireAllowed } from "../../../../lib/session";
import { NotificationDetail } from "../../../../components/NotificationsView";

export default async function NotificationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireAllowed("notifications", "read");
  const { id } = await params;
  const message = await asUser(() => getMessageForIT(user.token, id)).catch(
    (error) => {
      if (isApiError(error) && error.status === 404) notFound();
      throw error;
    },
  );
  return (
    <NotificationDetail
      message={message}
      canExecute={itAllowed(user.roles, "notifications", "execute")}
    />
  );
}

import { listITAccountsForIT } from "@platform/api-client";
import { itAllowed } from "@platform/contracts";
import { asUser, requireAllowed } from "../../../lib/session";
import { ITAccountsView } from "../../../components/ITAccountsView";

export default async function ITAccountsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await requireAllowed("it_accounts", "read");
  const params = await searchParams;
  const page = await asUser(() =>
    listITAccountsForIT(user.token, params.cursor),
  );
  return (
    <ITAccountsView
      page={page}
      cursor={params.cursor || ""}
      canCreate={itAllowed(user.roles, "it_accounts", "create")}
      canEdit={itAllowed(user.roles, "it_accounts", "edit")}
    />
  );
}

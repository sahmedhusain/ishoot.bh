import { listITAccountsForIT, listITRolesForIT } from "@platform/api-client";
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
  const [page, rolesPage] = await Promise.all([
    asUser(() => listITAccountsForIT(user.token, params.cursor)),
    asUser(() => listITRolesForIT(user.token).catch(() => ({ items: [] }))),
  ]);
  return (
    <ITAccountsView
      page={page}
      cursor={params.cursor || ""}
      userRoles={user.roles}
      userEmail={user.email}
      canCreate={itAllowed(user.roles, "it_accounts", "create")}
      canEdit={itAllowed(user.roles, "it_accounts", "edit")}
      dbRoles={rolesPage.items}
    />
  );
}

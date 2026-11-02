import {
  listStaffAccountsForIT,
  listStaffRolesForIT,
  getStaffAccountForIT,
  type StaffRoleDraft,
} from "@platform/api-client";
import { itAllowed } from "@platform/contracts";
import { asUser, requireAllowed } from "../../../lib/session";
import { StaffAccountsView } from "../../../components/StaffAccountsView";
export default async function StaffAccountsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await requireAllowed("staff_accounts", "read");
  const params = await searchParams;
  const result = await asUser(async () => {
    const page = await listStaffAccountsForIT(user.token, params.cursor);
    const roles: StaffRoleDraft[] = [];
    let cursor: string | undefined;
    do {
      const next = await listStaffRolesForIT(user.token, cursor);
      roles.push(...next.items);
      cursor = next.nextCursor || undefined;
    } while (cursor);
    const initial = params.edit
      ? await getStaffAccountForIT(user.token, params.edit)
      : undefined;
    return { page, roles, initial };
  });
  return (
    <StaffAccountsView
      key={params.edit ?? "new"}
      {...result}
      editId={params.edit}
      cursor={params.cursor ?? ""}
      canCreate={itAllowed(user.roles, "staff_accounts", "create")}
      canEdit={itAllowed(user.roles, "staff_accounts", "edit")}
      canExecute={itAllowed(user.roles, "staff_accounts", "execute")}
    />
  );
}

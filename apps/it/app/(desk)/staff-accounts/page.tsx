import {
  listStaffAccountsForIT,
  listStaffRolesForIT,
  getStaffAccountForIT,
  copyStaffAccessForIT,
  type StaffAccountDraft,
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

    let initial: StaffAccountDraft | undefined;
    if (params.edit) {
      initial = await getStaffAccountForIT(user.token, params.edit);
    } else if (params.prefillName || params.prefillEmail || params.prefillUsername || params.copyFrom) {
      const copied = params.copyFrom
        ? await copyStaffAccessForIT(user.token, params.copyFrom).catch(() => null)
        : null;
      initial = {
        displayName: params.prefillName ?? "",
        email: params.prefillEmail ?? "",
        username: params.prefillUsername ?? "",
        role: copied?.role ?? roles[0]?.id ?? "",
        active: true,
        overrides: copied?.overrides ?? {},
        dataScopes: copied?.dataScopes ?? {},
        copiedFrom: copied ? params.copyFrom : undefined,
      };
    }

    return { page, roles, initial };
  });

  const fromOnboardingTicket = Boolean(
    !params.edit && (params.ticketId || params.prefillUsername || params.copyFrom),
  );

  return (
    <StaffAccountsView
      key={params.edit ?? params.ticketId ?? "new"}
      {...result}
      editId={params.edit}
      cursor={params.cursor ?? ""}
      fromOnboardingTicket={fromOnboardingTicket}
      canCreate={itAllowed(user.roles, "staff_accounts", "create")}
      canEdit={itAllowed(user.roles, "staff_accounts", "edit")}
      canExecute={itAllowed(user.roles, "staff_accounts", "execute")}
    />
  );
}

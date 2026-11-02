import { notFound } from "next/navigation";
import { listStaffRolesForIT } from "@platform/api-client";
import { itAllowed } from "@platform/contracts";
import { asUser, requireAllowed } from "../../../lib/session";
import { StaffRolesView } from "../../../components/StaffRolesView";
export default async function StaffRolesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await requireAllowed("staff_roles", "read");
  const params = await searchParams;
  const page = await asUser(() =>
    listStaffRolesForIT(user.token, params.cursor),
  );
  const initial = params.edit
    ? page.items.find((role) => role.id === params.edit)
    : undefined;
  if (params.edit && !initial) notFound();
  return (
    <StaffRolesView
      key={params.edit ?? "new"}
      page={page}
      initial={initial}
      cursor={params.cursor ?? ""}
      canCreate={itAllowed(user.roles, "staff_roles", "create")}
      canEdit={itAllowed(user.roles, "staff_roles", "edit")}
      canDelete={itAllowed(user.roles, "staff_roles", "delete")}
    />
  );
}

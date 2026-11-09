import { listITRolesForIT } from "@platform/api-client";
import { asUser, requireUser } from "../../../lib/session";
import { SettingsView } from "../../../components/SettingsView";

export default async function SettingsPage() {
  const user = await requireUser();
  const rolesPage = await asUser(() =>
    listITRolesForIT(user.token).catch(() => ({ items: [] })),
  );
  return (
    <SettingsView
      email={user.email}
      roles={user.roles}
      dbRoles={rolesPage.items}
    />
  );
}

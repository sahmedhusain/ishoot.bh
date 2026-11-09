import { listITRolesForIT } from "@platform/api-client";
import { asUser, requireUser } from "../../lib/session";
import { Shell } from "../../components/Shell";

export const dynamic = "force-dynamic";

export default async function DeskLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const rolesPage = await asUser(() =>
    listITRolesForIT(user.token).catch(() => ({ items: [] })),
  );
  return (
    <Shell email={user.email} roles={user.roles} dbRoles={rolesPage.items}>
      {children}
    </Shell>
  );
}

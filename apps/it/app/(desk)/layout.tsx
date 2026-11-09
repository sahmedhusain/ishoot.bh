import { listITRolesForIT } from "@platform/api-client";
import { asUser, requireUser } from "../../lib/session";
import { Shell } from "../../components/Shell";
import { getCompanyBranding } from "../../lib/company-branding";

export const dynamic = "force-dynamic";

export default async function DeskLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const [rolesPage, branding] = await Promise.all([
    asUser(() => listITRolesForIT(user.token)).catch(() => ({ items: [] })),
    getCompanyBranding(user.token),
  ]);
  return (
    <Shell
      email={user.email}
      roles={user.roles}
      dbRoles={rolesPage.items}
      branding={branding}
    >
      {children}
    </Shell>
  );
}

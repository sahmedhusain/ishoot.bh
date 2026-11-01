import { requireUser } from "../../lib/session";
import { Shell } from "../../components/Shell";

export const dynamic = "force-dynamic";

export default async function DeskLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  return (
    <Shell email={user.email} roles={user.roles}>
      {children}
    </Shell>
  );
}

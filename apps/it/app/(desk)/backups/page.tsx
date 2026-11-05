import { listBackupsForIT } from "@platform/api-client";
import { itAllowed } from "@platform/contracts";
import { asUser, requireAllowed } from "../../../lib/session";
import { BackupsView } from "../../../components/BackupsView";

export default async function BackupsPage() {
  const user = await requireAllowed("backups", "read");
  const backups = await asUser(() => listBackupsForIT(user.token)).catch(
    () => null,
  );

  return (
    <BackupsView
      backups={backups}
      canExecute={itAllowed(user.roles, "backups", "execute")}
    />
  );
}

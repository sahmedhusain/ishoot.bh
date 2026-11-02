import { getRuntimeConfigForIT } from "@platform/api-client";
import { itAllowed } from "@platform/contracts";
import { asUser, requireAllowed } from "../../../lib/session";
import { LogsView } from "../../../components/LogsView";

export default async function LogsPage() {
  const user = await requireAllowed("logs", "read");
  const config = await asUser(() => getRuntimeConfigForIT(user.token)).catch(
    () => null
  );

  return (
    <LogsView
      config={config}
      canEdit={itAllowed(user.roles, "runtime_config", "edit")}
    />
  );
}

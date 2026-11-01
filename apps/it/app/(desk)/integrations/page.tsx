import { listIntegrationsForIT } from "@platform/api-client";
import { itAllowed } from "@platform/contracts";
import { asUser, requireAllowed } from "../../../lib/session";
import { IntegrationsView } from "../../../components/IntegrationsView";

export default async function IntegrationsPage() {
  const user = await requireAllowed("integrations", "read");
  const integrations = await asUser(() =>
    listIntegrationsForIT(user.token),
  ).catch(() => null);

  return (
    <IntegrationsView
      integrations={integrations}
      canEdit={itAllowed(user.roles, "integrations", "edit")}
      canExecute={itAllowed(user.roles, "integrations", "execute")}
      canDelete={itAllowed(user.roles, "integrations", "delete")}
    />
  );
}

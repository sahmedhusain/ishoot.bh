import { listAPIKeysForIT } from "@platform/api-client";
import { itAllowed } from "@platform/contracts";
import { asUser, requireAllowed } from "../../../lib/session";
import { ApiKeysView } from "../../../components/ApiKeysView";

export default async function ApiKeysPage() {
  const user = await requireAllowed("api_keys", "read");
  const keys =
    (await asUser(() => listAPIKeysForIT(user.token)).catch(() => [])) || [];

  return (
    <ApiKeysView
      keys={keys}
      canCreate={itAllowed(user.roles, "api_keys", "create")}
      canDelete={itAllowed(user.roles, "api_keys", "delete")}
    />
  );
}

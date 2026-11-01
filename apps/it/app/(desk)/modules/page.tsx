import { listModulesForIT } from "@platform/api-client";
import { itAllowed } from "@platform/contracts";
import { asUser, requireAllowed } from "../../../lib/session";
import { ModulesView } from "../../../components/ModulesView";

export default async function ModulesPage() {
  const user = await requireAllowed("modules", "read");
  const modules = await asUser(() => listModulesForIT(user.token)).catch(
    () => null,
  );
  return (
    <ModulesView
      modules={modules}
      canEdit={itAllowed(user.roles, "modules", "edit")}
    />
  );
}

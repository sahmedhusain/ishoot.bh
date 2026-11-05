import {
  getCompanyConfigurationForIT,
  getCompanySetupStatusForIT,
  listModulesForIT,
  getSiteDomainsForIT,
} from "@platform/api-client";
import { itAllowed } from "@platform/contracts";
import { asUser, requireAllowed } from "../../../lib/session";
import { SetupView } from "../../../components/SetupView";

export default async function SetupPage() {
  const user = await requireAllowed("setup", "read");
  const [company, setupStatus, modules, domains] = await Promise.all([
    asUser(() => getCompanyConfigurationForIT(user.token)).catch(() => null),
    asUser(() => getCompanySetupStatusForIT(user.token)).catch(() => null),
    asUser(() => listModulesForIT(user.token)).catch(() => []),
    asUser(() => getSiteDomainsForIT(user.token)).catch(() => null),
  ]);

  return (
    <SetupView
      company={company}
      setupStatus={setupStatus}
      modules={modules}
      domains={domains}
      canEdit={itAllowed(user.roles, "setup", "edit")}
      canExecute={itAllowed(user.roles, "setup", "execute")}
      roles={user.roles}
    />
  );
}

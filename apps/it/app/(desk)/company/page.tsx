import {
  getCompanyConfigurationForIT,
  listCompanyAssetsForIT,
  getCompanySetupStatusForIT,
} from "@platform/api-client";
import { itAllowed } from "@platform/contracts";
import { asUser, requireAllowed } from "../../../lib/session";
import { CompanyView } from "../../../components/CompanyView";

export default async function CompanyPage() {
  const user = await requireAllowed("setup", "read");
  const [company, assets, setupStatus] = await Promise.all([
    asUser(() => getCompanyConfigurationForIT(user.token)).catch(() => null),
    asUser(() => listCompanyAssetsForIT(user.token)).catch(() => []),
    asUser(() => getCompanySetupStatusForIT(user.token)).catch(() => null),
  ]);

  return (
    <CompanyView
      company={company}
      assets={assets}
      setupStatus={setupStatus}
      canEdit={itAllowed(user.roles, "setup", "edit")}
      canComplete={itAllowed(user.roles, "setup", "execute")}
    />
  );
}

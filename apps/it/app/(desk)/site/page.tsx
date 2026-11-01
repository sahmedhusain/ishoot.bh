import { getSiteCodeForIT, getSiteDomainsForIT } from "@platform/api-client";
import { itAllowed } from "@platform/contracts";
import { asUser, requireAllowed } from "../../../lib/session";
import { SiteView } from "../../../components/SiteView";

export default async function SitePage() {
  const user = await requireAllowed("domains", "read");
  const canReadCode = itAllowed(user.roles, "site_code", "read");
  const [domains, code] = await Promise.all([
    asUser(() => getSiteDomainsForIT(user.token)).catch(() => null),
    canReadCode
      ? asUser(() => getSiteCodeForIT(user.token)).catch(() => null)
      : Promise.resolve(undefined),
  ]);

  return (
    <SiteView
      domains={domains}
      code={code}
      canEditDomains={itAllowed(user.roles, "domains", "edit")}
      canCheckDomains={itAllowed(user.roles, "domains", "execute")}
      canEditCode={itAllowed(user.roles, "site_code", "edit")}
    />
  );
}

import { getSystemHealthForIT } from "@platform/api-client";
import { asUser, requireAllowed } from "../../../lib/session";
import { probePlatformTopology } from "../../../lib/infra-probes";
import { SystemHealthView } from "../../../components/SystemHealthView";

export const dynamic = "force-dynamic";

export default async function SystemHealthPage() {
  const user = await requireAllowed("system_health", "read");
  const [items, topology] = await Promise.all([
    asUser(() => getSystemHealthForIT(user.token)).catch(() => []),
    probePlatformTopology().catch(() => []),
  ]);

  return <SystemHealthView items={items} topology={topology} />;
}

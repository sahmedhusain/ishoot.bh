import { getSystemHealthForIT } from "@platform/api-client";
import { asUser, requireAllowed } from "../../../lib/session";
import { SystemHealthView } from "../../../components/SystemHealthView";

export default async function SystemHealthPage() {
  const user = await requireAllowed("system_health", "read");
  const items = await asUser(() => getSystemHealthForIT(user.token)).catch(
    () => []
  );

  return <SystemHealthView items={items} />;
}

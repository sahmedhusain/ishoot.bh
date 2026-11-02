import { getDatabaseStatsForIT } from "@platform/api-client";
import { asUser, requireAllowed } from "../../../lib/session";
import { DatabaseView } from "../../../components/DatabaseView";

export default async function DatabasePage() {
  const user = await requireAllowed("database", "read");
  const stats = await asUser(() => getDatabaseStatsForIT(user.token)).catch(
    () => null
  );

  return <DatabaseView stats={stats} />;
}

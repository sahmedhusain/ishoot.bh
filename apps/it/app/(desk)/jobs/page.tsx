import { getDatabaseStatsForIT } from "@platform/api-client";
import { itAllowed } from "@platform/contracts";
import { asUser, requireAllowed } from "../../../lib/session";
import { JobsView } from "../../../components/JobsView";

export default async function JobsPage() {
  const user = await requireAllowed("jobs", "read");
  const stats = await asUser(() => getDatabaseStatsForIT(user.token)).catch(
    () => null
  );

  return (
    <JobsView
      stats={stats}
      canExecute={itAllowed(user.roles, "jobs", "execute")}
    />
  );
}

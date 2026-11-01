import { listQueue, queueStats } from "@platform/api-client";
import { asUser, requireAllowed } from "../../lib/session";
import { OverviewView } from "../../components/OverviewView";

export default async function OverviewPage() {
  const user = await requireAllowed("tickets", "read");
  // The ticket service can be down while the dashboard works; the page says so instead of failing.
  const [stats, latest] = await Promise.all([
    asUser(() => queueStats(user.token)).catch(() => null),
    asUser(() => listQueue(user.token, { open: true, limit: 5 })).catch(
      () => null,
    ),
  ]);
  return <OverviewView stats={stats} latest={latest?.items ?? null} />;
}

import {
  listQueue,
  queueStats,
  getCompanySetupStatusForIT,
} from "@platform/api-client";
import { redirect } from "next/navigation";
import { asUser, requireAllowed } from "../../lib/session";
import { OverviewView } from "../../components/OverviewView";

export default async function OverviewPage({
  searchParams,
}: {
  searchParams?: Promise<{ skip?: string }>;
}) {
  const user = await requireAllowed("tickets", "read");
  const params = await searchParams;
  if (params?.skip !== "1") {
    const status = await asUser(() =>
      getCompanySetupStatusForIT(user.token),
    ).catch(() => null);
    if (status && !status.finished && !status.complete) {
      redirect("/setup");
    }
  }

  const [stats, latest] = await Promise.all([
    asUser(() => queueStats(user.token)).catch(() => null),
    asUser(() => listQueue(user.token, { open: true, limit: 5 })).catch(
      () => null,
    ),
  ]);
  return <OverviewView stats={stats} latest={latest?.items ?? null} />;
}

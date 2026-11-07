import { redirect } from "next/navigation";
import { requireAuth } from "../../../lib/auth";
import { getMemberHistory, getTeamMembers, getTeamPerformance } from "@platform/database";
import { listEmployees } from "@platform/api-client";
import { ROUTES } from "../../../constants/routes";
import { TeamPerformanceView } from "../../../components/team/TeamPerformanceView";
import { pageMetadata } from "../../../lib/company-metadata";

export const generateMetadata = () => pageMetadata("team");

export const dynamic = "force-dynamic";

function periodRange(period: string) {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const from =
    period === "year" ? new Date(Date.UTC(y, 0, 1)) : period === "quarter" ? new Date(Date.UTC(y, m - (m % 3), 1)) : new Date(Date.UTC(y, m, 1));
  return { from, to: now };
}

/** Managers see their team's results; Super Admin and admins can look at any manager's team or everyone. */
export default async function TeamPage({ searchParams }: { searchParams: Promise<{ period?: string; manager?: string }> }) {
  const user = await requireAuth();
  const params = await searchParams;
  const seesAll = user.role === "super_admin" || user.role === "admin";
  const managerId = seesAll ? params.manager || undefined : user.id;
  const members = await getTeamMembers(managerId ?? user.id, seesAll && !managerId);
  if (!seesAll && members.length === 0) redirect(ROUTES.home);

  const period = params.period === "quarter" || params.period === "year" ? params.period : "month";
  const { from, to } = periodRange(period);
  const ids = members.map((m) => m.id);
  const [kpis, histories, rawEmployees] = await Promise.all([
    getTeamPerformance(ids, from, to),
    Promise.all(ids.map(async (id) => [id, await getMemberHistory(id, 8)] as const)),
    seesAll ? listEmployees().catch(() => []) : Promise.resolve([]),
  ]);
  const managers = rawEmployees.map((e) => ({
    id: e.id,
    fullName: `${e.first_name_en || ""} ${e.last_name_en || ""}`.trim() || e.id,
  }));
  return (
    <TeamPerformanceView
      period={period}
      from={from.toISOString().slice(0, 10)}
      to={to.toISOString().slice(0, 10)}
      members={kpis}
      history={Object.fromEntries(histories)}
      managers={seesAll ? managers.map((m) => ({ id: m.id, name: m.fullName })) : undefined}
      managerId={managerId}
    />
  );
}

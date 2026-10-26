"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DateDisplay, Select } from "@platform/ui";
import { ArrowUpRight } from "lucide-react";
import type { DepartmentDashboard } from "@platform/database";
import { ROUTES } from "../../constants/routes";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { widgetCard } from "./DashboardWidgets";

interface DepartmentDashboardViewProps {
  departments: { id: string; name_en: string; name_ar: string }[];
  chosenId: string;
  summary: DepartmentDashboard;
  canSeeLeave: boolean;
}

export function DepartmentDashboardView({ departments, chosenId, summary, canSeeLeave }: DepartmentDashboardViewProps) {
  const { t, locale } = useAdminLocale();
  const c = t.dashboardBoard.department;
  const router = useRouter();
  const name = (en: string, ar: string) => (locale === "ar" ? ar || en : en || ar);
  const tiles: { label: string; value: number; tone?: string; href?: string }[] = [
    { label: c.headcount, value: summary.headcount, href: ROUTES.orgChart },
    { label: c.awayToday, value: summary.away_today },
    { label: c.pendingLeave, value: summary.pending_leave, tone: summary.pending_leave ? "text-amber-600 dark:text-amber-400" : undefined, href: canSeeLeave ? ROUTES.hr.leave() : undefined },
    { label: c.openTasks, value: summary.open_tasks, href: ROUTES.tasks.list },
    { label: c.overdueTasks, value: summary.overdue_tasks, tone: summary.overdue_tasks ? "text-rose-500" : undefined },
    { label: c.openRequests, value: summary.open_requests, href: ROUTES.requests.list },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <Link href={ROUTES.home} className="text-xs text-ink-muted hover:text-accent">{c.back}</Link>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{c.title}</h1>
          <p className="text-sm text-ink-muted mt-1">{c.subtitle}</p>
        </div>
        {departments.length > 1 ? (
          <label className="flex flex-col gap-1 text-xs font-semibold text-ink">
            {c.choose}
            <Select value={chosenId} onChange={(e) => router.push(ROUTES.departmentDashboard(e.target.value))} className="rounded-lg h-9 min-w-56" data-testid="department-choose">
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{name(d.name_en, d.name_ar)}</option>
              ))}
            </Select>
            <span className="font-normal text-ink-muted">{c.includesSub}</span>
          </label>
        ) : (
          <p className="text-sm font-semibold text-ink">{name(departments[0].name_en, departments[0].name_ar)}</p>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {tiles.map((tile) => {
          const body = (
            <div className={`${widgetCard} p-4 space-y-1`}>
              <div className="text-[11px] font-medium text-ink-muted">{tile.label}</div>
              <div className={`text-xl font-bold tabular-nums ${tile.tone ?? "text-ink"}`}>{tile.value}</div>
            </div>
          );
          return tile.href ? <Link key={tile.label} href={tile.href} className="block rounded-xl hover:opacity-90">{body}</Link> : <div key={tile.label}>{body}</div>;
        })}
      </div>

      <section className={`${widgetCard} overflow-hidden`}>
        <div className="flex items-center justify-between gap-2 px-5 py-3 border-b border-ink/10">
          <h2 className="text-xs font-bold uppercase tracking-wider text-ink">{c.people}</h2>
          <Link href={ROUTES.orgChart} className="text-xs text-primary dark:text-mint hover:underline font-semibold inline-flex items-center gap-1">
            {c.orgChart}
            <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
          </Link>
        </div>
        {summary.people.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-ink/5 text-ink-muted">
                <tr>
                  <th className="px-5 py-2 text-start font-semibold">{c.person}</th>
                  <th className="px-3 py-2 text-start font-semibold">{c.status}</th>
                  <th className="px-3 py-2 text-end font-semibold">{c.tasks}</th>
                  <th className="px-3 py-2 text-end font-semibold">{c.overdue}</th>
                  <th className="px-5 py-2 text-end font-semibold">{c.requests}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/10">
                {summary.people.map((p) => (
                  <tr key={p.id}>
                    <td className="px-5 py-2.5">
                      <span className="block font-semibold text-ink">{name(p.name_en, p.name_ar)}</span>
                      <span className="block text-[11px] text-ink-muted">{name(p.title_en, p.title_ar)}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      {p.away_until ? (
                        <span className="rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 px-2 py-0.5 text-[11px] font-semibold">
                          {c.awayUntil} <DateDisplay date={p.away_until} locale={locale} />
                        </span>
                      ) : (
                        <span className="rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 text-[11px] font-semibold">{c.in}</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-end tabular-nums">{p.open_tasks}</td>
                    <td className={`px-3 py-2.5 text-end tabular-nums ${p.overdue_tasks ? "text-rose-500 font-semibold" : ""}`}>{p.overdue_tasks}</td>
                    <td className="px-5 py-2.5 text-end tabular-nums">{p.open_requests}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="p-8 text-center text-xs text-ink-muted">{c.noPeople}</p>
        )}
      </section>
    </div>
  );
}

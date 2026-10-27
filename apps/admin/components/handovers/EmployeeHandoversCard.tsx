"use client";

import Link from "next/link";
import { ArrowRightLeft, Plus } from "lucide-react";
import { formatDate } from "@platform/ui";
import type { listEmployeeHandovers } from "@platform/database";
import { ROUTES } from "../../constants/routes";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { HANDOVER_STATUS_STYLE } from "./HandoversListView";

type Row = Awaited<ReturnType<typeof listEmployeeHandovers>>[number];

/** The employee's exit and leave handovers, with a shortcut to start the exit handover. */
export function EmployeeHandoversCard({ employeeId, items, canStart }: { employeeId: string; items: Row[]; canStart: boolean }) {
  const { t, locale } = useAdminLocale();
  const e = t.employeeHandovers;
  if (!items.length && !canStart) return null;
  return (
    <section className="rounded-3xl border border-outline-variant bg-surface-raised dark:bg-surface-raised p-5 sm:p-6 shadow-xs space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 text-base font-bold text-ink"><ArrowRightLeft className="h-4 w-4 text-accent" /><bdi dir="auto">{e.title}</bdi></h2>
          <p className="text-xs text-ink-muted mt-0.5">{e.employeeCardHint}</p>
        </div>
        {canStart ? (
          <Link href={ROUTES.hr.handovers({ employeeId })} className="inline-flex items-center gap-1.5 h-9 rounded-full border border-outline-variant px-4 text-xs font-semibold text-ink hover:bg-ink/5">
            <Plus className="h-3.5 w-3.5" />{e.start}
          </Link>
        ) : null}
      </div>
      {items.length ? (
        <ul className="space-y-2">
          {items.map((h) => (
            <li key={h.id}>
              <Link href={ROUTES.hr.handover(h.id)} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-outline-variant px-3 py-2 text-sm hover:bg-ink/[0.03]">
                <span className="text-ink">
                  <span className="font-mono text-xs text-ink-muted me-2">{h.reference}</span>
                  {e.kinds[h.kind as "exit" | "leave"]} · {formatDate(h.effective_date, locale)}
                </span>
                <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${HANDOVER_STATUS_STYLE[h.status] ?? ""}`}>{e.statuses[h.status as keyof typeof e.statuses]}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

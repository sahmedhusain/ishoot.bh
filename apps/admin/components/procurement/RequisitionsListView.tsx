"use client";

import Link from "next/link";
import { ClipboardList, Plus } from "lucide-react";
import { Card, CurrencyDisplay, formatDate } from "@platform/ui";
import { formatMessage } from "@platform/locales";
import { ROUTES } from "../../constants/routes";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { StatusPill } from "./StatusPill";

interface Row {
  id: string;
  number: string;
  status: string;
  requested_by: string;
  needed_by: string | null;
  estimated_total: number;
  lines: number;
  created_at: string;
}

/** Purchasing → requisitions. */
export function RequisitionsListView({ rows, currency }: { rows: Row[]; currency: string }) {
  const { t, locale } = useAdminLocale();
  const copy = t.procurement.requisitions;
  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4" data-page-header>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ink dark:text-ink">{copy.title}</h1>
          <p className="text-xs text-ink-muted dark:text-ink-muted mt-1 max-w-2xl leading-relaxed">{copy.subtitle}</p>
        </div>
        <Link href={ROUTES.procurement.newRequisition} className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 h-9 text-sm font-semibold text-primary-foreground hover:opacity-90">
          <Plus className="w-4 h-4" />
          {copy.new}
        </Link>
      </div>
      <Card className="overflow-hidden">
        {rows.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <ClipboardList className="w-8 h-8 text-ink-muted" aria-hidden="true" />
            <p className="text-sm text-ink-muted">{copy.empty}</p>
          </div>
        ) : (
          <ul className="divide-y divide-outline-variant">
            {rows.map((r) => (
              <li key={r.id}>
                <Link href={ROUTES.procurement.requisition(r.id)} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 hover:bg-ink/[0.02]">
                  <span className="font-mono text-xs font-semibold text-ink" dir="ltr">{r.number}</span>
                  <StatusPill status={r.status} />
                  <span className="text-sm text-ink">{r.requested_by}</span>
                  <span className="text-xs text-ink-muted">{formatMessage(copy.lineCount, { count: r.lines })}</span>
                  {r.needed_by && <span className="text-xs text-ink-muted">{`${copy.neededBy}: ${formatDate(r.needed_by, locale)}`}</span>}
                  <span className="ms-auto text-sm font-semibold"><CurrencyDisplay amount={r.estimated_total} currency={currency} /></span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

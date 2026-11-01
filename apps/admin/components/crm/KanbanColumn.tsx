"use client";
import { useCompanyCurrency } from "@platform/ui";

import { useDroppable } from "@dnd-kit/core";
import type { CRMDeal, DealStage } from "@platform/database/types";
import { DealCard } from "./DealCard";
import { CurrencyDisplay } from "@platform/ui";
import { useAdminLocale } from "../../hooks/useAdminLocale";

interface KanbanColumnProps {
  stage: DealStage;
  label: string;
  deals: CRMDeal[];
  accentColor?: string;
}

export function KanbanColumn({
  stage,
  label,
  deals,
  accentColor = "rgb(var(--brand-accent))",
}: KanbanColumnProps) {
  const companyCurrency = useCompanyCurrency();
  const { t } = useAdminLocale();
  const { setNodeRef, isOver } = useDroppable({
    id: stage,
  });

  const totalValue = deals.reduce((acc, d) => acc + Number(d.value), 0);

  return (
    <div
      ref={setNodeRef}
      className={`w-72 shrink-0 bg-surface-sunken/70 dark:bg-tone-5 rounded-2xl border flex flex-col max-h-[calc(100vh-210px)] transition-colors shadow-sm ${isOver
        ? "border-accent bg-accent/5"
        : "border-outline-variant/80 dark:border-white/10"
        }`}
    >
      <div className="p-4 border-b border-outline-variant/80 dark:border-white/10 space-y-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: accentColor }}
            />
            <h3 className="text-xs font-bold text-ink uppercase tracking-wider">
              {label}
            </h3>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-surface-sunken dark:bg-white/10 text-[11px] text-ink font-semibold">
            {deals.length}
          </span>
        </div>

        <div className="text-[11px] text-ink-muted flex justify-between items-center pt-1">
          <span>{t.deals.stageSum}</span>
          <span className="text-ink font-bold">
            <CurrencyDisplay amount={totalValue} currency={companyCurrency} />
          </span>
        </div>
      </div>

      <div className="p-3 space-y-3 overflow-y-auto flex-1">
        {deals.map((deal) => (
          <DealCard key={deal.id} deal={deal} />
        ))}

        {deals.length === 0 && (
          <div className="h-24 border border-dashed border-outline-variant dark:border-white/10 rounded-xl flex items-center justify-center text-[11px] text-ink-muted">
            {t.deals.noDealsHere}
          </div>
        )}
      </div>
    </div>
  );
}

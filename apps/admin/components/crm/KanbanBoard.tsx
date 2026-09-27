"use client";

import * as React from "react";
import Link from "next/link";
import { DndContext, DragEndEvent } from "@dnd-kit/core";
import type { CRMDeal, CRMContact, DealStage } from "@ishoot/database/types";
import { updateDealStageAction } from "../../app/actions/crm";
import { KanbanColumn } from "./KanbanColumn";
import { Button } from "@ishoot/ui";
import { Plus } from "lucide-react";
import { useAdminLocale } from "../../hooks/useAdminLocale";

interface KanbanBoardProps {
  initialDeals: CRMDeal[];
  contacts?: CRMContact[];
}

export function KanbanBoard({ initialDeals, contacts = [] }: KanbanBoardProps) {
  const { t } = useAdminLocale();
  const [deals, setDeals] = React.useState<CRMDeal[]>(initialDeals);

  const columns: Array<{ stage: DealStage; label: string; color: string }> = [
    { stage: "lead", label: t.stages.lead, color: "#3B82F6" },
    { stage: "proposal_sent", label: t.stages.proposal_sent, color: "#F59E0B" },
    {
      stage: "contract_signed",
      label: t.stages.contract_signed,
      color: "#8B5CF6",
    },
    { stage: "production", label: t.stages.production, color: "#09937F" },
    {
      stage: "post_production",
      label: t.stages.post_production,
      color: "#A855F7",
    },
    { stage: "delivered", label: t.stages.delivered, color: "#10B981" },
    { stage: "closed_won", label: t.stages.closed_won, color: "#059669" },
    { stage: "closed_lost", label: t.stages.closed_lost, color: "#E11D48" },
  ];

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const dealId = active.id as string;
    const targetStage = over.id as DealStage;

    setDeals((prev) =>
      prev.map((d) => (d.id === dealId ? { ...d, stage: targetStage } : d)),
    );

    try {
      await updateDealStageAction(dealId, targetStage);
    } catch (err) {
      console.error("Failed to update deal stage in DB:", err);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white font-display">
            {t.nav.deals}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t.deals.subtitle}</p>
        </div>

        <Link href="/dashboard/crm/deals/new">
          <Button
            variant="primary"
            size="sm"
            className="gap-1.5 shrink-0 bg-[#014842] hover:bg-[#014842]/90 text-white"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t.actions.newDeal}</span>
          </Button>
        </Link>
      </div>

      <DndContext onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-6 select-none">
          {columns.map((col) => (
            <KanbanColumn
              key={col.stage}
              stage={col.stage}
              label={col.label}
              deals={deals.filter((d) => d.stage === col.stage)}
              accentColor={col.color}
            />
          ))}
        </div>
      </DndContext>
    </div>
  );
}

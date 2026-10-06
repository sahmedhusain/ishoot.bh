"use client";

import { ROUTES } from "../../constants/routes";
import * as React from "react";
import Link from "next/link";
import { DndContext, DragEndEvent, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
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
    { stage: "invoiced", label: t.stages.invoiced, color: "#0D9488" },
    { stage: "delivered", label: t.stages.delivered, color: "#10B981" },
    { stage: "closed_won", label: t.stages.closed_won, color: "#059669" },
    { stage: "closed_lost", label: t.stages.closed_lost, color: "#E11D48" },
  ];

  // A click is not a drag: require a short move before dragging starts, so cards stay clickable.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const dealId = active.id as string;
    const targetStage = over.id as DealStage;
    if (deals.find((d) => d.id === dealId)?.stage === targetStage) return;

    setDeals((prev) =>
      prev.map((d) => (d.id === dealId ? { ...d, stage: targetStage } : d)),
    );

    try {
      await updateDealStageAction(dealId, targetStage);
    } catch (err) {
      setDeals(initialDeals);
      console.error("Failed to update deal stage in DB:", err);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {t.nav.deals}
          </h1>
        </div>

        <Link href={ROUTES.crm.newDeal()}>
          <Button
            variant="primary"
            size="sm"
            className="gap-1.5 shrink-0 bg-primary hover:bg-primary/90 text-white rounded-full px-4 h-8 text-xs font-semibold shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t.actions.newDeal}</span>
          </Button>
        </Link>
      </div>

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
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

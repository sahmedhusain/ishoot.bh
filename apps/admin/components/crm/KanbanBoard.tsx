"use client";

import { ROUTES } from "../../constants/routes";
import * as React from "react";
import Link from "next/link";
import { DndContext, DragEndEvent, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import type { CRMDeal, CRMContact, DealStage } from "@platform/database/types";
import type { DealPipelineStage } from "@platform/database";
import { dealStageColor, dealStageLabel } from "../../lib/deal-stages";
import { updateDealStageAction } from "../../app/actions/crm";
import { KanbanColumn } from "./KanbanColumn";
import { Button } from "@platform/ui";
import { Plus, SlidersHorizontal } from "lucide-react";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { PageHeader } from "../layout/PageHeader";

interface KanbanBoardProps {
  initialDeals: CRMDeal[];
  contacts?: CRMContact[];
  /** The company's pipeline, in order. */
  stages: DealPipelineStage[];
  /** Shows the link to Settings → Sales pipeline. */
  canCustomize?: boolean;
  /** Search, filters and paging, shown under the header. */
  controls?: React.ReactNode;
}

export function KanbanBoard({ initialDeals, contacts = [], stages, canCustomize, controls }: KanbanBoardProps) {
  const { t, locale } = useAdminLocale();
  const [deals, setDeals] = React.useState<CRMDeal[]>(initialDeals);

  const columns = stages.map((stage) => ({ stage: stage.id, label: dealStageLabel(stage, t, locale), color: dealStageColor(stage) }));

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
      <PageHeader
        actions={<div className="flex items-center gap-2">
          {canCustomize && (
            <Link href={ROUTES.settings.pipeline} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-semibold text-ink-muted hover:text-ink hover:bg-ink/5 transition-colors">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              {t.pipelineSettings.customize}
            </Link>
          )}
          <Link href={ROUTES.crm.newDeal()}>
            <Button
              variant="primary"
              size="sm"
              className="gap-1.5 shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full px-4 h-8 text-xs font-semibold shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t.actions.newDeal}</span>
            </Button>
          </Link>
        </div>}
      />
      {controls && <div className="[&>div]:mb-0">{controls}</div>}

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

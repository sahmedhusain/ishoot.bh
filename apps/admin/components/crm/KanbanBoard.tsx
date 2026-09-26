'use client';

import * as React from 'react';
import { DndContext, DragEndEvent } from '@dnd-kit/core';
import { CRMDeal, DealStage } from '@ishoot/database';
import { KanbanColumn } from './KanbanColumn';

interface KanbanBoardProps {
  initialDeals: CRMDeal[];
}

export function KanbanBoard({ initialDeals }: KanbanBoardProps) {
  const [deals, setDeals] = React.useState<CRMDeal[]>(initialDeals);

  const columns: Array<{ stage: DealStage; label: string; color: string }> = [
    { stage: 'lead', label: 'New Lead', color: '#3B82F6' },
    { stage: 'proposal_sent', label: 'Proposal Sent', color: '#F59E0B' },
    { stage: 'contract_signed', label: 'Contract Signed', color: '#8B5CF6' },
    { stage: 'production', label: 'In Production', color: '#09937F' },
    { stage: 'post_production', label: 'Post-Production', color: '#A855F7' },
    { stage: 'delivered', label: 'Delivered', color: '#10B981' },
    { stage: 'closed_won', label: 'Closed Won', color: '#059669' },
    { stage: 'closed_lost', label: 'Closed Lost', color: '#E11D48' },
  ];

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const dealId = active.id as string;
    const targetStage = over.id as DealStage;

    setDeals((prev) =>
      prev.map((d) => (d.id === dealId ? { ...d, stage: targetStage } : d))
    );
  };

  return (
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
  );
}

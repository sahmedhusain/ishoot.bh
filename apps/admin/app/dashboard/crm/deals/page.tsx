import * as React from 'react';
import { getCRMDeals } from '@ishoot/database';
import { KanbanBoard } from '../../../../components/crm/KanbanBoard';
import { Button } from '@ishoot/ui';
import { Plus } from 'lucide-react';

export default async function DealsPipelinePage() {
  const deals = await getCRMDeals();

  return (
    <div className="space-y-6 max-w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-display">
            Production Deals Pipeline
          </h1>
          <p className="text-xs text-[#9EADA9] mt-1">
            Drag-and-drop Kanban workspace with real-time stage currency aggregations.
          </p>
        </div>

        <Button variant="primary" size="sm" className="gap-1.5 shrink-0">
          <Plus className="w-3.5 h-3.5" />
          <span>New Deal</span>
        </Button>
      </div>

      {/* Interactive Kanban Board */}
      <KanbanBoard initialDeals={deals} />
    </div>
  );
}

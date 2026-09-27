'use client';

import * as React from 'react';
import { useDroppable } from '@dnd-kit/core';
import type { CRMDeal, DealStage } from '@ishoot/database/types';
import { DealCard } from './DealCard';
import { CurrencyDisplay } from '@ishoot/ui';
import { useAdminLocale } from '../../hooks/useAdminLocale';

interface KanbanColumnProps {
  stage: DealStage;
  label: string;
  deals: CRMDeal[];
  accentColor?: string;
}

export function KanbanColumn({ stage, label, deals, accentColor = '#09937F' }: KanbanColumnProps) {
  const { t } = useAdminLocale();
  const { setNodeRef, isOver } = useDroppable({
    id: stage,
  });

  const totalValue = deals.reduce((acc, d) => acc + Number(d.value), 0);

  return (
    <div
      ref={setNodeRef}
      className={`w-72 shrink-0 bg-[#070C0A] rounded-2xl border flex flex-col max-h-[calc(100vh-210px)] transition-colors ${
        isOver ? 'border-[#09937F] bg-[#09937F]/5' : 'border-white/10'
      }`}
    >
      {/* Column Header */}
      <div className="p-4 border-b border-white/10 space-y-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: accentColor }}
            />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              {label}
            </h3>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-white/5 text-[11px] font-mono text-[#9EADA9]">
            {deals.length}
          </span>
        </div>

        <div className="text-[11px] font-mono text-[#9EADA9] flex justify-between items-center pt-1">
          <span>{t.deals.stageSum}</span>
          <span className="text-white font-bold">
            <CurrencyDisplay amount={totalValue} currency="BHD" />
          </span>
        </div>
      </div>

      {/* Cards List */}
      <div className="p-3 space-y-3 overflow-y-auto flex-1">
        {deals.map((deal) => (
          <DealCard key={deal.id} deal={deal} />
        ))}

        {deals.length === 0 && (
          <div className="h-24 border border-dashed border-white/10 rounded-xl flex items-center justify-center text-[11px] text-[#9EADA9]/40">
            {t.deals.noDealsHere}
          </div>
        )}
      </div>
    </div>
  );
}

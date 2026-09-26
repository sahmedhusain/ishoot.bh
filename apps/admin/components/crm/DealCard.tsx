'use client';

import * as React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CRMDeal } from '@ishoot/database';
import { Card, CurrencyDisplay } from '@ishoot/ui';
import { Calendar, User } from 'lucide-react';

interface DealCardProps {
  deal: CRMDeal;
}

export function DealCard({ deal }: DealCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: deal.id,
    data: { deal },
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`cursor-grab active:cursor-grabbing transition-shadow ${
        isDragging ? 'opacity-50 z-50 shadow-2xl scale-105' : ''
      }`}
    >
      <Card className="p-4 bg-[#0B1210] border border-white/10 hover:border-[#09937F]/50 transition-all rounded-xl space-y-3">
        {/* Title */}
        <h4 className="text-sm font-bold text-white leading-snug line-clamp-2">
          {deal.title}
        </h4>

        {/* Client Tag */}
        <div className="flex items-center gap-1.5 text-xs text-[#9EADA9]">
          <User className="w-3.5 h-3.5 text-[#09937F]" />
          <span className="truncate">{deal.contact?.company || deal.contact?.full_name || 'Direct Client'}</span>
        </div>

        {/* Date if any */}
        {deal.shoot_date && (
          <div className="flex items-center gap-1.5 text-[11px] text-[#9EADA9]/70 font-mono">
            <Calendar className="w-3 h-3 text-[#9EADA9]" />
            <span>Shoot: {deal.shoot_date}</span>
          </div>
        )}

        {/* Value Footer */}
        <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs">
          <span className="text-[#9EADA9]/60 font-mono">Deal Value</span>
          <span className="font-mono font-bold text-[#09937F]">
            <CurrencyDisplay amount={deal.value} currency={deal.currency} />
          </span>
        </div>
      </Card>
    </div>
  );
}

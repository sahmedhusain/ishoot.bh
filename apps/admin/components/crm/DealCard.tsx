"use client";

import { ROUTES } from "../../constants/routes";
import { useDraggable } from "@dnd-kit/core";
import type { CRMDeal } from "@ishoot/database/types";
import { Card,CurrencyDisplay } from "@ishoot/ui";
import Link from "next/link";
import { Calendar,User } from "lucide-react";
import { useAdminLocale } from "../../hooks/useAdminLocale";

interface DealCardProps {
  deal: CRMDeal;
}

export function DealCard({ deal }: DealCardProps) {
  const { t } = useAdminLocale();
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
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
        isDragging ? "opacity-50 z-50 shadow-2xl scale-105" : ""
      }`}
    >
      <Card className="p-4 bg-white dark:bg-[#121B19] border border-slate-200/80 dark:border-white/10 hover:border-[#09937F]/50 transition-all rounded-xl shadow-sm space-y-3">
        <Link
          href={ROUTES.crm.deal(deal.id)}
          className="text-sm font-bold text-slate-900 dark:text-white hover:text-[#014842] dark:hover:text-[#09937F] leading-snug line-clamp-2 block transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          {deal.title}
        </Link>

        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 truncate">
            <User className="w-3.5 h-3.5 text-[#09937F] shrink-0" />
            {deal.contact ? (
              <Link
                href={ROUTES.crm.customer(deal.contact.id)}
                className="hover:text-[#014842] dark:hover:text-[#09937F] hover:underline truncate font-medium"
                onClick={(e) => e.stopPropagation()}
                title="View Client Dossier"
              >
                {deal.contact.company || deal.contact.full_name}
              </Link>
            ) : (
              <span className="truncate">{t.deals.directClient}</span>
            )}
          </div>
        </div>

        {deal.shoot_date && (
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 ">
            <Calendar className="w-3 h-3 text-slate-400" />
            <span>
              {t.deals.shootPrefix}
              {deal.shoot_date}
            </span>
          </div>
        )}

        <div className="pt-2 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs">
          <span className="text-slate-500 dark:text-slate-400 ">
            {t.deals.dealValue}
          </span>
          <span className=" font-bold text-[#014842] dark:text-[#09937F]">
            <CurrencyDisplay amount={deal.value} currency={deal.currency} />
          </span>
        </div>
      </Card>
    </div>
  );
}

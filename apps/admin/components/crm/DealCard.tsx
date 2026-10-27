"use client";

import { ROUTES } from "../../constants/routes";
import { useDraggable } from "@dnd-kit/core";
import type { CRMDeal } from "@platform/database/types";
import { Card, CurrencyDisplay } from "@platform/ui";
import Link from "next/link";
import { Calendar, User } from "lucide-react";
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
      className={`cursor-grab active:cursor-grabbing transition-shadow ${isDragging ? "opacity-50 z-50 shadow-2xl scale-105" : ""
        }`}
    >
      <Card className="p-4 bg-surface-raised dark:bg-surface-raised border border-outline-variant/80 dark:border-white/10 hover:border-accent/50 transition-all rounded-xl shadow-sm space-y-3">
        <Link
          href={ROUTES.crm.deal(deal.id)}
          className="text-sm font-bold text-ink dark:text-ink hover:text-primary dark:hover:text-accent leading-snug line-clamp-2 block transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          {deal.title}
        </Link>

        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-ink-muted dark:text-ink-muted truncate">
            <User className="w-3.5 h-3.5 text-accent shrink-0" />
            {deal.contact ? (
              <Link
                href={ROUTES.crm.customer(deal.contact.id)}
                className="hover:text-primary dark:hover:text-accent hover:underline truncate font-medium"
                onClick={(e) => e.stopPropagation()}
                title={t.dealCard.viewClientDossier}
              >
                {deal.contact.company || deal.contact.full_name}
              </Link>
            ) : (
              <span className="truncate">{t.deals.directClient}</span>
            )}
          </div>
        </div>

        {deal.shoot_date && (
          <div className="flex items-center gap-1.5 text-[11px] text-ink-muted dark:text-ink-muted ">
            <Calendar className="w-3 h-3 text-ink-muted" />
            <span>
              {t.deals.shootPrefix}
              {deal.shoot_date}
            </span>
          </div>
        )}

        <div className="pt-2 border-t border-outline-variant dark:border-white/5 flex items-center justify-between text-xs">
          <span className="text-ink-muted dark:text-ink-muted ">
            {t.deals.dealValue}
          </span>
          <span className=" font-bold text-primary dark:text-accent">
            <CurrencyDisplay amount={deal.value} currency={deal.currency} />
          </span>
        </div>
      </Card>
    </div>
  );
}

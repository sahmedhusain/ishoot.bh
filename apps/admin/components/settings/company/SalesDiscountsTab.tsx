"use client";

import * as React from "react";
import Link from "next/link";
import type { CompanySettings } from "@platform/database/types";
import { Card, Input } from "@platform/ui";
import { BadgePercent } from "lucide-react";
import { ROUTES } from "../../../constants/routes";
import type { Translations } from "../../../lib/translations";

interface SalesDiscountsTabProps {
  settings: CompanySettings;
  setSettings: React.Dispatch<React.SetStateAction<CompanySettings>>;
  t: Translations;
}

export function SalesDiscountsTab({ settings, setSettings, t }: SalesDiscountsTabProps) {
  const s = t.salesDiscounts;
  return (
    <div className="space-y-6 animate-fade-in">
      <Card className="p-6 bg-surface-raised dark:bg-surface-container-low border border-outline-variant shadow-xs rounded-2xl space-y-6">
        <div className="flex items-center gap-3 pb-3 border-b border-outline-variant">
          <div className="p-2 rounded-xl bg-primary/10 text-primary dark:text-mint">
            <BadgePercent className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-ink">{s.title}</h2>
            <p className="text-xs text-ink-muted">{s.subtitle}</p>
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <label className="block space-y-1.5 block">
            <span className="text-xs font-medium text-ink">{s.defaultLimit}</span>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={0}
                max={100}
                step="0.5"
                value={settings.default_discount_limit_percent ?? 0}
                onChange={(e) => setSettings({ ...settings, default_discount_limit_percent: Math.min(100, Math.max(0, Number(e.target.value) || 0)) })}
                className="w-28 rounded-lg"
              />
              <span className="text-sm text-ink-muted">%</span>
            </div>
            <span className="block text-[11px] text-ink-muted">{s.defaultLimitHint}</span>
          </label>

          <label className="flex items-start gap-3 p-4 rounded-xl border border-outline-variant cursor-pointer">
            <input
              type="checkbox"
              className="mt-0.5 accent-accent"
              checked={Boolean(settings.quotations_always_need_approval)}
              onChange={(e) => setSettings({ ...settings, quotations_always_need_approval: e.target.checked })}
            />
            <span>
              <span className="block text-xs font-semibold text-ink">{s.alwaysApprove}</span>
              <span className="block text-[11px] text-ink-muted mt-0.5">{s.alwaysApproveHint}</span>
            </span>
          </label>
        </div>

        <p className="text-xs text-ink-muted">
          {s.perUserHint}{" "}
          <Link href={ROUTES.users.list} className="text-accent font-semibold hover:underline">{s.openUsers}</Link>
        </p>
      </Card>
    </div>
  );
}

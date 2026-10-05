"use client";

import * as React from "react";
import Link from "next/link";
import type { CompanySettings } from "@ishoot/database/types";
import { Card, Input } from "@ishoot/ui";
import { BadgePercent } from "lucide-react";
import { ROUTES } from "../../../constants/routes";
import type { Translations } from "../../../lib/translations";

interface SalesDiscountsTabProps {
  settings: CompanySettings;
  setSettings: React.Dispatch<React.SetStateAction<CompanySettings>>;
  t: Translations;
}

/** Discount approval margins: the company default here, per-user overrides on the Users page. */
export function SalesDiscountsTab({ settings, setSettings, t }: SalesDiscountsTabProps) {
  const s = t.salesDiscounts;
  return (
    <div className="space-y-6 animate-fade-in">
      <Card className="p-6 bg-white dark:bg-[#202124] border border-ink/15 shadow-xs rounded-2xl space-y-6">
        <div className="flex items-center gap-3 pb-3 border-b border-ink/15">
          <div className="p-2 rounded-xl bg-primary/10 text-primary dark:text-mint">
            <BadgePercent className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">{s.title}</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">{s.subtitle}</p>
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <label className="space-y-1.5 block">
            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{s.defaultLimit}</span>
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
              <span className="text-sm text-slate-500">%</span>
            </div>
            <span className="block text-[11px] text-slate-500">{s.defaultLimitHint}</span>
          </label>

          <label className="flex items-start gap-3 p-4 rounded-xl border border-ink/10 cursor-pointer">
            <input
              type="checkbox"
              className="mt-0.5 accent-accent"
              checked={Boolean(settings.quotations_always_need_approval)}
              onChange={(e) => setSettings({ ...settings, quotations_always_need_approval: e.target.checked })}
            />
            <span>
              <span className="block text-xs font-semibold text-slate-800 dark:text-slate-200">{s.alwaysApprove}</span>
              <span className="block text-[11px] text-slate-500 mt-0.5">{s.alwaysApproveHint}</span>
            </span>
          </label>
        </div>

        <p className="text-xs text-slate-500">
          {s.perUserHint}{" "}
          <Link href={ROUTES.users.list} className="text-accent font-semibold hover:underline">{s.openUsers}</Link>
        </p>
      </Card>
    </div>
  );
}

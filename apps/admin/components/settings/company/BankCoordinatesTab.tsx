"use client";

import * as React from "react";
import type { CompanySettings } from "@ishoot/database/types";
import { Card, Input } from "@ishoot/ui";
import { Landmark, ShieldCheck } from "lucide-react";
import type { Translations } from "../../../lib/translations";

interface BankCoordinatesTabProps {
  settings: CompanySettings;
  setSettings: React.Dispatch<React.SetStateAction<CompanySettings>>;
  t: Translations;
  locale: string;
  isRTL: boolean;
}

export function BankCoordinatesTab({
  settings,
  setSettings,
  t,
  locale,
  isRTL,
}: BankCoordinatesTabProps) {
  return (
    <div className="space-y-6 animate-fade-in">
      <Card className="p-6 bg-white dark:bg-[#202124] border border-[#dadce0] dark:border-[#3c4043] shadow-xs rounded-2xl space-y-5">
        <div className="flex items-center gap-3 pb-3 border-b border-[#dadce0] dark:border-[#3c4043]">
          <div className="p-2 rounded-xl bg-[#09937F]/10 text-[#09937F]">
            <Landmark className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              {t.settings.bankTitle}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t.companySettingsView.bankSubtitle}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              {t.settings.bankName}
            </label>
            <Input
              value={settings.bank_name || ""}
              onChange={(e) =>
                setSettings({ ...settings, bank_name: e.target.value })
              }
              placeholder="e.g. National Bank of Bahrain (NBB)"
              className="rounded-lg"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              {t.settings.bankIban}
            </label>
            <Input
              value={settings.bank_iban || ""}
              onChange={(e) =>
                setSettings({ ...settings, bank_iban: e.target.value })
              }
              placeholder="BH29NBOB00000012345678"
              className="font-mono rounded-lg"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              {t.settings.bankAccount}
            </label>
            <Input
              value={settings.bank_account_number || ""}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  bank_account_number: e.target.value,
                })
              }
              placeholder="0012345678"
              className="font-mono rounded-lg"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              {t.settings.bankSwift}
            </label>
            <Input
              value={settings.bank_swift || ""}
              onChange={(e) =>
                setSettings({ ...settings, bank_swift: e.target.value })
              }
              placeholder="NBOBBHBM"
              className="font-mono rounded-lg"
            />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 dark:bg-neutral-800/40 border border-slate-200 dark:border-neutral-700/60 flex items-start gap-3">
          <ShieldCheck className="w-4 h-4 text-[#09937F] shrink-0 mt-0.5" />
          <p className="text-xs text-slate-600 dark:text-neutral-400 leading-relaxed">
            {t.companySettingsTabs.bankingSubtitle}
          </p>
        </div>
      </Card>
    </div>
  );
}

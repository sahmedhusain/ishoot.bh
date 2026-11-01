"use client";

import * as React from "react";
import type { CompanySettings } from "@platform/database/types";
import { Card, Input } from "@platform/ui";
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
      <Card className="p-6 bg-surface-raised dark:bg-surface-container-low border border-outline-variant shadow-xs rounded-2xl space-y-5">
        <div className="flex items-center gap-3 pb-3 border-b border-outline-variant">
          <div className="p-2 rounded-xl bg-accent/10 text-accent">
            <Landmark className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-ink">
              {t.settings.bankTitle}
            </h2>
            <p className="text-xs text-ink-muted">
              {t.companySettingsView.bankSubtitle}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-ink">
              {t.settings.bankName}
            </span>
            <Input
              value={settings.bank_name || ""}
              onChange={(e) =>
                setSettings({ ...settings, bank_name: e.target.value })
              }
              placeholder={t.companySettingsTabs.bankNamePlaceholder}
              className="rounded-lg"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-ink">
              {t.settings.bankIban}
            </span>
            <Input
              value={settings.bank_iban || ""}
              onChange={(e) =>
                setSettings({ ...settings, bank_iban: e.target.value })
              }
              placeholder={t.companySettingsTabs.ibanPlaceholder}
              className=" rounded-lg"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-ink">
              {t.settings.bankAccount}
            </span>
            <Input
              value={settings.bank_account_number || ""}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  bank_account_number: e.target.value,
                })
              }
              placeholder={t.companySettingsTabs.accountPlaceholder}
              className=" rounded-lg"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-ink">
              {t.settings.bankSwift}
            </span>
            <Input
              value={settings.bank_swift || ""}
              onChange={(e) =>
                setSettings({ ...settings, bank_swift: e.target.value })
              }
              placeholder={t.companySettingsTabs.swiftPlaceholder}
              className=" rounded-lg"
            />
          </label>
        </div>

        <div className="p-4 rounded-xl bg-surface-raised dark:bg-surface-raised/40 border border-outline-variant dark:border-outline-variant/60 flex items-start gap-3">
          <ShieldCheck className="w-4 h-4 text-accent shrink-0 mt-0.5" />
          <p className="text-xs text-ink-muted leading-relaxed">
            {t.companySettingsTabs.bankingSubtitle}
          </p>
        </div>
      </Card>
    </div>
  );
}

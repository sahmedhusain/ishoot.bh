"use client";

import * as React from "react";
import type { CompanySettings } from "@ishoot/database/types";
import { Card,Input } from "@ishoot/ui";
import {
Building2,
Phone,
} from "lucide-react";
import type { Translations } from "../../../lib/translations";

interface GeneralInfoTabProps {
  settings: CompanySettings;
  setSettings: React.Dispatch<React.SetStateAction<CompanySettings>>;
  t: Translations;
  locale: string;
  isRTL: boolean;
}

export function GeneralInfoTab({
  settings,
  setSettings,
  t,
  locale,
  isRTL,
}: GeneralInfoTabProps) {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Legal & Corporate Registration Card */}
      <Card className="p-6 bg-white dark:bg-[#202124] border border-ink/15 dark:border-ink/15 shadow-xs rounded-2xl space-y-5">
        <div className="flex items-center gap-3 pb-3 border-b border-ink/15 dark:border-ink/15">
          <div className="p-2 rounded-xl bg-accent/10 text-accent">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              {t.settings.companyTitle}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t.companySettingsView.crSubtitle}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              {t.companySettingsView.nameEnLabel}
            </label>
            <Input
              value={settings.company_name_en}
              onChange={(e) =>
                setSettings({ ...settings, company_name_en: e.target.value })
              }
              className="rounded-lg"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              {t.companySettingsView.nameArLabel}
            </label>
            <Input
              value={settings.company_name_ar}
              onChange={(e) =>
                setSettings({ ...settings, company_name_ar: e.target.value })
              }
              className="text-end font-arabic rounded-lg"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              {t.companySettingsView.crNumber}
            </label>
            <Input
              value={settings.cr_number}
              onChange={(e) =>
                setSettings({ ...settings, cr_number: e.target.value })
              }
              className=" rounded-lg"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              {t.companySettingsView.defaultCurrency}
            </label>
            <Input
              disabled
              value={`${settings.default_currency} (${settings.currency_decimals} ${t.companySettingsView.decimalsWord})`}
              className=" bg-slate-50 dark:bg-slate-800/50 opacity-80 rounded-lg"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              {t.companySettingsTabs.addressEn}
            </label>
            <Input
              value={settings.address_en || ""}
              onChange={(e) =>
                setSettings({ ...settings, address_en: e.target.value })
              }
              className="rounded-lg"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              {t.companySettingsTabs.addressAr}
            </label>
            <Input
              value={settings.address_ar || ""}
              onChange={(e) =>
                setSettings({ ...settings, address_ar: e.target.value })
              }
              className="text-end font-arabic rounded-lg"
            />
          </div>
        </div>
      </Card>

      {/* Communications & Platforms Card */}
      <Card className="p-6 bg-white dark:bg-[#202124] border border-ink/15 dark:border-ink/15 shadow-xs rounded-2xl space-y-5">
        <div className="flex items-center gap-3 pb-3 border-b border-ink/15 dark:border-ink/15">
          <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <Phone className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              {t.companySettingsTabs.contactInfo}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t.companySettingsTabs.socialSubtitle}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              {t.companySettingsTabs.phone}
            </label>
            <Input
              value={settings.phone || ""}
              onChange={(e) =>
                setSettings({ ...settings, phone: e.target.value })
              }
              className=" rounded-lg"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              {t.companySettingsTabs.whatsapp}
            </label>
            <Input
              value={settings.whatsapp_phone || ""}
              onChange={(e) =>
                setSettings({ ...settings, whatsapp_phone: e.target.value })
              }
              className=" rounded-lg"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              {t.companySettingsTabs.email}
            </label>
            <Input
              type="email"
              value={settings.email || ""}
              onChange={(e) =>
                setSettings({ ...settings, email: e.target.value })
              }
              className=" rounded-lg"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              {t.companySettingsTabs.website}
            </label>
            <Input
              type="url"
              value={settings.website || ""}
              onChange={(e) =>
                setSettings({ ...settings, website: e.target.value })
              }
              className=" rounded-lg"
            />
          </div>
        </div>
      </Card>
    </div>
  );
}

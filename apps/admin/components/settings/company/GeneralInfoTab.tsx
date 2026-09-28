"use client";

import * as React from "react";
import type { CompanySettings } from "@ishoot/database/types";
import { Card, Input, Button } from "@ishoot/ui";
import {
  Building2,
  Phone,
  Globe,
  Share2,
  Calendar,
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
  const [googleConnected, setGoogleConnected] = React.useState(true);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Legal & Corporate Registration Card */}
      <Card className="p-6 bg-white dark:bg-[#202124] border border-[#dadce0] dark:border-[#3c4043] shadow-xs rounded-2xl space-y-5">
        <div className="flex items-center gap-3 pb-3 border-b border-[#dadce0] dark:border-[#3c4043]">
          <div className="p-2 rounded-xl bg-[#09937F]/10 text-[#09937F]">
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
              className="font-mono rounded-lg"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              {t.companySettingsView.defaultCurrency}
            </label>
            <Input
              disabled
              value={`${settings.default_currency} (${settings.currency_decimals} ${t.companySettingsView.decimalsWord})`}
              className="font-mono bg-slate-50 dark:bg-slate-800/50 opacity-80 rounded-lg"
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
      <Card className="p-6 bg-white dark:bg-[#202124] border border-[#dadce0] dark:border-[#3c4043] shadow-xs rounded-2xl space-y-5">
        <div className="flex items-center gap-3 pb-3 border-b border-[#dadce0] dark:border-[#3c4043]">
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
              className="font-mono rounded-lg"
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
              className="font-mono rounded-lg"
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
              className="font-mono rounded-lg"
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
              className="font-mono rounded-lg"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              {t.companySettingsTabs.instagram}
            </label>
            <Input
              value={settings.instagram_url || ""}
              onChange={(e) =>
                setSettings({ ...settings, instagram_url: e.target.value })
              }
              className="font-mono rounded-lg"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              {t.companySettingsTabs.linkedin}
            </label>
            <Input
              value={settings.linkedin_url || ""}
              onChange={(e) =>
                setSettings({ ...settings, linkedin_url: e.target.value })
              }
              className="font-mono rounded-lg"
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              {t.companySettingsTabs.youtube}
            </label>
            <Input
              value={settings.youtube_url || ""}
              onChange={(e) =>
                setSettings({ ...settings, youtube_url: e.target.value })
              }
              className="font-mono rounded-lg"
            />
          </div>
        </div>
      </Card>

      {/* Google Workspace & Production Calendar Sync */}
      <Card className="p-6 bg-white dark:bg-[#202124] border border-[#dadce0] dark:border-[#3c4043] shadow-xs rounded-2xl space-y-5">
        <div className="flex items-center gap-3 pb-3 border-b border-[#dadce0] dark:border-[#3c4043]">
          <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              {t.companySettingsView.googleTitle}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t.companySettingsView.googleSubtitle}
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#f8f9fa] dark:bg-[#282a2d] border border-[#dadce0] dark:border-[#3c4043] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#09937F] animate-pulse" />
              <span className="text-sm font-bold text-slate-900 dark:text-white">
                {t.companySettingsView.googleConnected}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
              {settings.email || "admin"} • {t.companySettingsView.googleSyncActive}
            </p>
          </div>

          <Button
            type="button"
            variant={googleConnected ? "secondary" : "primary"}
            size="sm"
            onClick={() => setGoogleConnected(!googleConnected)}
            className="rounded-full text-xs"
          >
            {googleConnected
              ? t.companySettingsView.disconnect
              : t.companySettingsView.connect}
          </Button>
        </div>
      </Card>
    </div>
  );
}

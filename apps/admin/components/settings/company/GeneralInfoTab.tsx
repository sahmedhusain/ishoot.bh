"use client";

import * as React from "react";
import type { CompanySettings } from "@ishoot/database/types";
import { Card,Input,Button } from "@ishoot/ui";
import {
Building2,
Phone,Calendar,
Copy,
ExternalLink,
Check
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
  React.useState(true);
  const [feedCopied, setFeedCopied] = React.useState(false);

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

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              {t.companySettingsTabs.instagram}
            </label>
            <Input
              value={settings.instagram_url || ""}
              onChange={(e) =>
                setSettings({ ...settings, instagram_url: e.target.value })
              }
              className=" rounded-lg"
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
              className=" rounded-lg"
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
              className=" rounded-lg"
            />
          </div>
        </div>
      </Card>

      {/* Google Workspace & Production Calendar Live Sync */}
      <Card className="p-6 bg-white dark:bg-[#202124] border border-ink/15 dark:border-ink/15 shadow-xs rounded-2xl space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-ink/15 dark:border-ink/15">
          <div className="flex items-center gap-3">
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
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-primary dark:text-mint border border-emerald-200 dark:border-emerald-800">
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            <span>{t.generalInfoTab.liveProductionSyncActive}</span>
          </span>
        </div>

        <div className="p-4 rounded-xl bg-[#f8f9fa] dark:bg-[#282a2d] border border-ink/15 dark:border-ink/15 space-y-4">
          <div className="space-y-1">
            <div className="text-xs font-bold text-slate-900 dark:text-white">
              {t.generalInfoTab.productionAndShootLiveFeed}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t.generalInfoTab.allScheduledShootsClientMeetings}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <div className="flex-1 bg-white dark:bg-surface-raised border border-ink/15 dark:border-ink/15 px-3 py-2 rounded-xl text-xs font-mono text-slate-700 dark:text-slate-300 truncate select-all">
              {typeof window !== "undefined" ? `${window.location.origin}/api/calendar/feed` : "/api/calendar/feed"}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const url = `${window.location.origin}/api/calendar/feed`;
                navigator.clipboard.writeText(url);
                setFeedCopied(true);
                setTimeout(() => setFeedCopied(false), 2500);
              }}
              className="gap-1.5 text-xs rounded-xl shrink-0"
            >
              {feedCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{feedCopied ? (t.generalInfoTab.copied) : (t.generalInfoTab.copyFeedUrl)}</span>
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => {
                const feedUrl = `${window.location.origin}/api/calendar/feed`;
                const gcalUrl = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(feedUrl)}`;
                window.open(gcalUrl, "_blank");
              }}
              className="gap-1.5 text-xs rounded-xl shrink-0 bg-accent text-white"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>{t.generalInfoTab.addToGoogleCalendar}</span>
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

"use client";

import * as React from "react";
import type { CompanySettings } from "@platform/database/types";
import { Card, Input } from "@platform/ui";
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
      <Card className="p-6 bg-surface-raised dark:bg-surface-container-low border border-outline-variant dark:border-outline-variant shadow-xs rounded-2xl space-y-5">
        <div className="flex items-center gap-3 pb-3 border-b border-outline-variant dark:border-outline-variant">
          <div className="p-2 rounded-xl bg-accent/10 text-accent">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-ink dark:text-ink">
              {t.settings.companyTitle}
            </h2>
            <p className="text-xs text-ink-muted dark:text-ink-muted">
              {t.companySettingsView.crSubtitle}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-ink dark:text-ink">
              {t.companySettingsView.nameEnLabel}
            </span>
            <Input
              value={settings.company_name_en}
              onChange={(e) =>
                setSettings({ ...settings, company_name_en: e.target.value })
              }
              className="rounded-lg"
             dir="ltr"/>
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-ink dark:text-ink">
              {t.companySettingsView.nameArLabel}
            </span>
            <Input
              value={settings.company_name_ar}
              onChange={(e) =>
                setSettings({ ...settings, company_name_ar: e.target.value })
              }
              className="text-end font-arabic rounded-lg"
             dir="rtl"/>
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-ink dark:text-ink">
              {t.companySettingsView.crNumber}
            </span>
            <Input
              value={settings.cr_number}
              onChange={(e) =>
                setSettings({ ...settings, cr_number: e.target.value })
              }
              className=" rounded-lg"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-ink dark:text-ink">
              {t.companySettingsView.defaultCurrency}
            </span>
            <Input
              disabled
              value={`${settings.default_currency} (${settings.currency_decimals} ${t.companySettingsView.decimalsWord})`}
              className=" bg-surface-raised dark:bg-surface-raised/50 opacity-80 rounded-lg"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-ink dark:text-ink">
              {t.companySettingsTabs.addressEn}
            </span>
            <Input
              value={settings.address_en || ""}
              onChange={(e) =>
                setSettings({ ...settings, address_en: e.target.value })
              }
              className="rounded-lg"
             dir="ltr"/>
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-ink dark:text-ink">
              {t.companySettingsTabs.addressAr}
            </span>
            <Input
              value={settings.address_ar || ""}
              onChange={(e) =>
                setSettings({ ...settings, address_ar: e.target.value })
              }
              className="text-end font-arabic rounded-lg"
             dir="rtl"/>
          </label>
        </div>
      </Card>

      {/* Communications & Platforms Card */}
      <Card className="p-6 bg-surface-raised dark:bg-surface-container-low border border-outline-variant dark:border-outline-variant shadow-xs rounded-2xl space-y-5">
        <div className="flex items-center gap-3 pb-3 border-b border-outline-variant dark:border-outline-variant">
          <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <Phone className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-ink dark:text-ink">
              {t.companySettingsTabs.contactInfo}
            </h2>
            <p className="text-xs text-ink-muted dark:text-ink-muted">
              {t.companySettingsTabs.socialSubtitle}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-ink dark:text-ink">
              <bdi dir="ltr">{t.companySettingsTabs.phone}</bdi>
            </span>
            <Input
              value={settings.phone || ""}
              onChange={(e) =>
                setSettings({ ...settings, phone: e.target.value })
              }
              className=" rounded-lg"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-ink dark:text-ink">
              {t.companySettingsTabs.whatsapp}
            </span>
            <Input
              value={settings.whatsapp_phone || ""}
              onChange={(e) =>
                setSettings({ ...settings, whatsapp_phone: e.target.value })
              }
              className=" rounded-lg"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-ink dark:text-ink">
              <bdi dir="ltr">{t.companySettingsTabs.email}</bdi>
            </span>
            <Input
              type="email"
              value={settings.email || ""}
              onChange={(e) =>
                setSettings({ ...settings, email: e.target.value })
              }
              className=" rounded-lg"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-ink dark:text-ink">
              {t.companySettingsTabs.website}
            </span>
            <Input
              type="url"
              value={settings.website || ""}
              onChange={(e) =>
                setSettings({ ...settings, website: e.target.value })
              }
              className=" rounded-lg"
            />
          </label>
        </div>
      </Card>
    </div>
  );
}

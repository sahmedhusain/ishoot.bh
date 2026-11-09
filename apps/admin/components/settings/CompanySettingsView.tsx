"use client";
import { useUnsavedChanges } from "../../hooks/useUnsavedChanges";
import { errorMessage } from "../../lib/error-text";
import type { AdminTranslations } from "../../lib/translations";

import * as React from "react";
import type { CompanySettings } from "@platform/database/types";
import type { TaxRateRecord } from "@platform/database";
import type { CompanyAssetItem } from "@platform/database";
import { Button, ConfirmDialog } from "@platform/ui";
import {
  Building2,
  Percent,
  Landmark,
  CheckCircle2,
  Hash,
  Sparkles,
  BadgePercent,
  Palette,
} from "lucide-react";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { updateCompanySettingsAction } from "../../app/actions/settings";
import { SettingsNavTabs } from "./SettingsNavTabs";
import { GeneralInfoTab } from "./company/GeneralInfoTab";
import { BankCoordinatesTab } from "./company/BankCoordinatesTab";
import { InvoiceReceiptSequencesTab } from "./company/InvoiceReceiptSequencesTab";
import { BrandAssetsTab } from "./company/BrandAssetsTab";
import { ThemeSettingsTab } from "./company/ThemeSettingsTab";
import { SalesDiscountsTab } from "./company/SalesDiscountsTab";
import { PageHeader } from "../layout/PageHeader";

interface CompanySettingsViewProps {
  initialSettings: CompanySettings;
  initialAssets?: CompanyAssetItem[];
  taxes?: TaxRateRecord[];
  canEditTaxes?: boolean;
}

interface ChangeDiff {
  key: string;
  oldValue: string;
  newValue: string;
  isVat?: boolean;
}

type TabKey = "general" | "banking" | "sequences" | "sales" | "brandAssets" | "theme";

function calculateDiff(
  oldSettings: CompanySettings,
  newSettings: CompanySettings,
  t: AdminTranslations,
): ChangeDiff[] {
  const diffs: ChangeDiff[] = [];

  if (oldSettings.vat_enabled !== newSettings.vat_enabled) {
    diffs.push({
      key: "vat_enabled",
      oldValue: oldSettings.vat_enabled
        ? `Active (${oldSettings.vat_percentage}%)`
        : t.companySettings.inactiveNonVat,
      newValue: newSettings.vat_enabled
        ? `Active (${newSettings.vat_percentage}%)`
        : t.companySettings.inactiveNonVat,
      isVat: true,
    });
  }

  if (
    newSettings.vat_enabled &&
    Number(oldSettings.vat_percentage) !== Number(newSettings.vat_percentage)
  ) {
    diffs.push({
      key: "vat_percentage",
      oldValue: `${oldSettings.vat_percentage}%`,
      newValue: `${newSettings.vat_percentage}%`,
      isVat: true,
    });
  }

  if ((oldSettings.vat_id || "") !== (newSettings.vat_id || "")) {
    diffs.push({
      key: "vat_id",
      oldValue: oldSettings.vat_id || t.shared.none,
      newValue: newSettings.vat_id || t.shared.none,
      isVat: true,
    });
  }

  if (oldSettings.company_name_en !== newSettings.company_name_en) {
    diffs.push({
      key: "company_name_en",
      oldValue: oldSettings.company_name_en || "—",
      newValue: newSettings.company_name_en || "—",
    });
  }

  if (oldSettings.company_name_ar !== newSettings.company_name_ar) {
    diffs.push({
      key: "company_name_ar",
      oldValue: oldSettings.company_name_ar || "—",
      newValue: newSettings.company_name_ar || "—",
    });
  }

  if (oldSettings.cr_number !== newSettings.cr_number) {
    diffs.push({
      key: "cr_number",
      oldValue: oldSettings.cr_number || "—",
      newValue: newSettings.cr_number || "—",
    });
  }

  if (oldSettings.phone !== newSettings.phone) {
    diffs.push({
      key: "phone",
      oldValue: oldSettings.phone || "—",
      newValue: newSettings.phone || "—",
    });
  }

  if (oldSettings.email !== newSettings.email) {
    diffs.push({
      key: "email",
      oldValue: oldSettings.email || "—",
      newValue: newSettings.email || "—",
    });
  }

  if (oldSettings.website !== newSettings.website) {
    diffs.push({
      key: "website",
      oldValue: oldSettings.website || "—",
      newValue: newSettings.website || "—",
    });
  }

  if (oldSettings.bank_name !== newSettings.bank_name) {
    diffs.push({
      key: "bank_name",
      oldValue: oldSettings.bank_name || "—",
      newValue: newSettings.bank_name || "—",
    });
  }

  if (oldSettings.bank_iban !== newSettings.bank_iban) {
    diffs.push({
      key: "bank_iban",
      oldValue: oldSettings.bank_iban || "—",
      newValue: newSettings.bank_iban || "—",
    });
  }

  if (oldSettings.invoice_prefix !== newSettings.invoice_prefix) {
    diffs.push({
      key: "invoice_prefix",
      oldValue: oldSettings.invoice_prefix || "INV",
      newValue: newSettings.invoice_prefix || "INV",
    });
  }

  if (oldSettings.invoice_next_number !== newSettings.invoice_next_number) {
    diffs.push({
      key: "invoice_next_number",
      oldValue: String(oldSettings.invoice_next_number),
      newValue: String(newSettings.invoice_next_number),
    });
  }

  return diffs;
}

export function CompanySettingsView({
  initialSettings,
  initialAssets = [],
  taxes = [],
  canEditTaxes = false,
}: CompanySettingsViewProps) {
  const { t, locale, isRTL } = useAdminLocale();

  const [activeTab, setActiveTab] = React.useState<TabKey>("general");
  const [themeVisited, setThemeVisited] = React.useState(false);
  const [originalSettings, setOriginalSettings] =
    React.useState<CompanySettings>(initialSettings);
  const [settings, setSettings] =
    React.useState<CompanySettings>(initialSettings);
  const markSaved = useUnsavedChanges(settings);
  const [assets, setAssets] =
    React.useState<CompanyAssetItem[]>(initialAssets);
  const [saved, setSaved] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  const [isSaveConfirmOpen, setIsSaveConfirmOpen] = React.useState(false);
  const [saveError, setSaveError] = React.useState("");
  const [saveDiffs, setSaveDiffs] = React.useState<ChangeDiff[]>([]);

  const isDirty = React.useMemo(() => {
    return JSON.stringify(originalSettings) !== JSON.stringify(settings);
  }, [originalSettings, settings]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaveError("");
    const diffs = calculateDiff(originalSettings, settings, t);
    if (diffs.length > 0) {
      setSaveDiffs(diffs);
      setIsSaveConfirmOpen(true);
    } else {
      void executeSave().catch(() => { });
    }
  };

  const executeSave = async () => {
    setSaving(true);
    setSaveError("");
    try {
      const res = await updateCompanySettingsAction(settings);
      if (res.success && res.settings) {
        markSaved(res.settings);
        setOriginalSettings(res.settings);
        setSettings(res.settings);
        setSaved(true);
        setTimeout(() => setSaved(false), 4000);
      } else throw new Error(t.companySettingsView.saveFailed);
    } catch (e) {
      setSaveError(errorMessage(e, t, t.companySettingsView.saveFailed));
      throw e;
    } finally {
      setSaving(false);
    }
  };

  const tabs: { key: TabKey; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    {
      key: "general",
      label: t.companySettingsTabs.general,
      icon: Building2,
    },
    {
      key: "banking",
      label: t.companySettingsTabs.banking,
      icon: Landmark,
    },
    {
      key: "sequences",
      label: t.companySettingsTabs.sequences,
      icon: Hash,
    },
    {
      key: "sales",
      label: t.salesDiscounts.tab,
      icon: BadgePercent,
    },
    {
      key: "brandAssets",
      label: t.companySettingsTabs.brandAssets,
      icon: Sparkles,
    },
    {
      key: "theme",
      label: t.setupWizard.steps.brand,
      icon: Palette,
    },
  ];

  return (
    <div inert={saving} aria-busy={saving} className="space-y-6 max-w-6xl mx-auto pb-16">
      <PageHeader
        actions={<div className="flex items-center gap-3">
          {saved && (
            <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 px-3.5 py-1.5 rounded-full animate-fade-in shadow-2xs">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{t.companySettingsView.saved}</span>
            </div>
          )}

          {isDirty && (
            <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 px-3 py-1 rounded-full">
              {t.companySettingsView.unsavedChanges}
            </span>
          )}

          <Button
            type="button"
            variant="primary"
            size="sm"
            disabled={saving || !isDirty}
            onClick={handleSubmit}
            className="shadow-2xs rounded-full px-5 py-2 text-xs font-semibold"
          >
            {saving ? t.companySettingsView.saving : t.actions.save}
          </Button>
        </div>}
      />

      <SettingsNavTabs />

      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-surface-container dark:bg-surface-raised border border-outline-variant overflow-x-auto" role="tablist">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => { if (tab.key === "theme") setThemeVisited(true); setActiveTab(tab.key); }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-150 ${isActive
                ? "bg-surface-raised dark:bg-surface-container text-primary dark:text-mint shadow-xs border border-outline-variant/80 dark:border-outline-variant"
                : "text-ink-muted dark:text-ink-muted hover:text-ink dark:hover:text-white"
                }`}
             tabIndex={activeTab === tab.key ? 0 : -1} role="tab" aria-selected={activeTab === tab.key}>
              <Icon
                className={`w-3.5 h-3.5 ${isActive ? "text-accent" : "text-ink-muted dark:text-ink-muted"
                  }`}
              />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {activeTab === "general" && (
          <GeneralInfoTab
            settings={settings}
            setSettings={setSettings}
            t={t}
            locale={locale}
            isRTL={isRTL}
          />
        )}

        {activeTab === "banking" && (
          <BankCoordinatesTab
            settings={settings}
            setSettings={setSettings}
            t={t}
            locale={locale}
            isRTL={isRTL}
          />
        )}

        {activeTab === "sequences" && (
          <InvoiceReceiptSequencesTab
            settings={settings}
            setSettings={setSettings}
            t={t}
            locale={locale}
            isRTL={isRTL}
          />
        )}

        {activeTab === "sales" && <SalesDiscountsTab settings={settings} setSettings={setSettings} t={t} />}

        {activeTab === "brandAssets" && (
          <BrandAssetsTab
            settings={settings}
            setSettings={setSettings}
            assets={assets}
            setAssets={setAssets}
            t={t}
            locale={locale}
            isRTL={isRTL}
          />
        )}

        {themeVisited && <div hidden={activeTab !== "theme"}><ThemeSettingsTab initialTheme={initialSettings.theme} /></div>}

        {activeTab !== "brandAssets" && activeTab !== "theme" && (
          <div className="flex items-center justify-end gap-4 pt-2">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={saving || !isDirty}
              className="shadow-2xs rounded-full px-6 py-2.5 text-xs font-semibold"
            >
              {saving ? (t.companySettings.saving) : t.actions.save}
            </Button>
          </div>
        )}
      </form>

      {saveError && !isSaveConfirmOpen && <p role="alert" className="text-sm text-rose-700 dark:text-rose-300">{saveError}</p>}
      <ConfirmDialog isOpen={isSaveConfirmOpen} onClose={() => setIsSaveConfirmOpen(false)} title={t.companySettingsView.diffModalTitle} variant="warning" loading={saving} confirmLabel={t.companySettingsView.confirmChanges} cancelLabel={t.companySettingsView.cancel} errorLabel={saveError || t.companySettingsView.saveFailed} onConfirm={executeSave} description={<div className="space-y-4"><p>{saveDiffs.length} {t.companySettingsView.diffDetected}</p>
        <p className="text-xs text-ink-muted dark:text-ink">
          {t.companySettingsView.diffNotice}
        </p>

        <div className="space-y-2">
          {saveDiffs.map((diff) => {
            const fieldKey = diff.key as keyof typeof t.companySettingsView.fields;
            const label = t.companySettingsView.fields[fieldKey] ?? diff.key;

            return (
              <div
                key={diff.key}
                className={`p-3 rounded-xl border text-xs space-y-1.5 ${diff.isVat
                  ? "bg-amber-50/60 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800"
                  : "bg-surface-raised dark:bg-surface-raised/40 border-outline-variant dark:border-outline-variant"
                  }`}
              >
                <div className="flex items-center justify-between font-bold text-[11px] text-ink">
                  <span>{label}</span>
                  {diff.isVat ? (
                    <span className="px-1.5 py-0.5 rounded text-[9px] bg-amber-200 text-amber-900 ">
                      {t.companySettingsView.vatActiveBadge}
                    </span>
                  ) : null}
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] items-center">
                  <div className="p-2 rounded-lg bg-white/70 dark:bg-surface-raised/60 border border-outline-variant/80 dark:border-outline-variant/60 text-ink-muted">
                    <span className="block text-[9px] uppercase  tracking-wider text-ink-muted">
                      {t.companySettingsView.currentVal}
                    </span>
                    <span className="truncate block font-medium mt-0.5">
                      {diff.oldValue}
                    </span>
                  </div>

                  <div className="p-2 rounded-lg bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200">
                    <span className="block text-[9px] uppercase  tracking-wider text-emerald-600 dark:text-emerald-400">
                      {t.companySettingsView.newVal}
                    </span>
                    <span className="truncate block font-bold mt-0.5">
                      {diff.newValue}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>} />
    </div>
  );
}

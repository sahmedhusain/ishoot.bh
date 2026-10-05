"use client";
import type { AdminTranslations } from "../../lib/translations";

import * as React from "react";
import type { CompanySettings } from "@ishoot/database/types";
import type { CompanyAssetItem } from "@ishoot/database";
import { Button, useDialog } from "@ishoot/ui";
import {
Building2,
Percent,
Landmark,
CheckCircle2,
Hash,
Sparkles,
AlertTriangle,
X,Check,
  BadgePercent,
} from "lucide-react";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { updateCompanySettingsAction } from "../../app/actions/settings";
import { SettingsNavTabs } from "./SettingsNavTabs";
import { GeneralInfoTab } from "./company/GeneralInfoTab";
import { TaxVatSettingsTab } from "./company/TaxVatSettingsTab";
import { BankCoordinatesTab } from "./company/BankCoordinatesTab";
import { InvoiceReceiptSequencesTab } from "./company/InvoiceReceiptSequencesTab";
import { BrandAssetsTab } from "./company/BrandAssetsTab";
import { SalesDiscountsTab } from "./company/SalesDiscountsTab";

interface CompanySettingsViewProps {
  initialSettings: CompanySettings;
  initialAssets?: CompanyAssetItem[];
}

interface ChangeDiff {
  key: string;
  labelEn: string;
  labelAr: string;
  oldValue: string;
  newValue: string;
  isVat?: boolean;
}

type TabKey = "general" | "taxVat" | "banking" | "sequences" | "sales" | "brandAssets";

function calculateDiff(
  oldSettings: CompanySettings,
  newSettings: CompanySettings,
  t: AdminTranslations,
): ChangeDiff[] {
  const diffs: ChangeDiff[] = [];

  if (oldSettings.vat_enabled !== newSettings.vat_enabled) {
    diffs.push({
      key: "vat_enabled",
      labelEn: "VAT Status",
      labelAr: "حالة تفعيل ضريبة القيمة المضافة",
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
      labelEn: "VAT Percentage Rate",
      labelAr: "نسبة ضريبة القيمة المضافة",
      oldValue: `${oldSettings.vat_percentage}%`,
      newValue: `${newSettings.vat_percentage}%`,
      isVat: true,
    });
  }

  if ((oldSettings.vat_id || "") !== (newSettings.vat_id || "")) {
    diffs.push({
      key: "vat_id",
      labelEn: "VAT Account Number (TRN)",
      labelAr: "الرقم التعريفي الضريبي",
      oldValue: oldSettings.vat_id || "None",
      newValue: newSettings.vat_id || "None",
      isVat: true,
    });
  }

  if (oldSettings.company_name_en !== newSettings.company_name_en) {
    diffs.push({
      key: "company_name_en",
      labelEn: "Company Name (English)",
      labelAr: "اسم المنشأة بالإنجليزية",
      oldValue: oldSettings.company_name_en || "—",
      newValue: newSettings.company_name_en || "—",
    });
  }

  if (oldSettings.company_name_ar !== newSettings.company_name_ar) {
    diffs.push({
      key: "company_name_ar",
      labelEn: "Company Name (Arabic)",
      labelAr: "اسم المنشأة بالعربية",
      oldValue: oldSettings.company_name_ar || "—",
      newValue: newSettings.company_name_ar || "—",
    });
  }

  if (oldSettings.cr_number !== newSettings.cr_number) {
    diffs.push({
      key: "cr_number",
      labelEn: "Commercial Registration (CR)",
      labelAr: "رقم السجل التجاري",
      oldValue: oldSettings.cr_number || "—",
      newValue: newSettings.cr_number || "—",
    });
  }

  if (oldSettings.phone !== newSettings.phone) {
    diffs.push({
      key: "phone",
      labelEn: "Phone Number",
      labelAr: "رقم الهاتف",
      oldValue: oldSettings.phone || "—",
      newValue: newSettings.phone || "—",
    });
  }

  if (oldSettings.email !== newSettings.email) {
    diffs.push({
      key: "email",
      labelEn: "Official Email",
      labelAr: "البريد الإلكتروني",
      oldValue: oldSettings.email || "—",
      newValue: newSettings.email || "—",
    });
  }

  if (oldSettings.website !== newSettings.website) {
    diffs.push({
      key: "website",
      labelEn: "Website",
      labelAr: "الموقع الإلكتروني",
      oldValue: oldSettings.website || "—",
      newValue: newSettings.website || "—",
    });
  }

  if (oldSettings.bank_name !== newSettings.bank_name) {
    diffs.push({
      key: "bank_name",
      labelEn: "Beneficiary Bank Name",
      labelAr: "اسم البنك المستفيد",
      oldValue: oldSettings.bank_name || "—",
      newValue: newSettings.bank_name || "—",
    });
  }

  if (oldSettings.bank_iban !== newSettings.bank_iban) {
    diffs.push({
      key: "bank_iban",
      labelEn: "Bank IBAN Number",
      labelAr: "رقم الآيبان الدولي",
      oldValue: oldSettings.bank_iban || "—",
      newValue: newSettings.bank_iban || "—",
    });
  }

  if (oldSettings.invoice_prefix !== newSettings.invoice_prefix) {
    diffs.push({
      key: "invoice_prefix",
      labelEn: "Invoice Prefix",
      labelAr: "بادئة الفاتورة",
      oldValue: oldSettings.invoice_prefix || "INV",
      newValue: newSettings.invoice_prefix || "INV",
    });
  }

  if (oldSettings.invoice_next_number !== newSettings.invoice_next_number) {
    diffs.push({
      key: "invoice_next_number",
      labelEn: "Next Invoice Number",
      labelAr: "رقم الفاتورة القادمة",
      oldValue: String(oldSettings.invoice_next_number),
      newValue: String(newSettings.invoice_next_number),
    });
  }

  return diffs;
}

export function CompanySettingsView({
  initialSettings,
  initialAssets = [],
}: CompanySettingsViewProps) {
  const { t, locale, isRTL } = useAdminLocale();

  const [activeTab, setActiveTab] = React.useState<TabKey>("general");
  const [originalSettings, setOriginalSettings] =
    React.useState<CompanySettings>(initialSettings);
  const [settings, setSettings] =
    React.useState<CompanySettings>(initialSettings);
  const [assets, setAssets] =
    React.useState<CompanyAssetItem[]>(initialAssets);
  const [saved, setSaved] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  const [isSaveConfirmOpen, setIsSaveConfirmOpen] = React.useState(false);
  const saveDialog = useDialog(isSaveConfirmOpen, () => setIsSaveConfirmOpen(false));
  const [saveDiffs, setSaveDiffs] = React.useState<ChangeDiff[]>([]);

  const isDirty = React.useMemo(() => {
    return JSON.stringify(originalSettings) !== JSON.stringify(settings);
  }, [originalSettings, settings]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const diffs = calculateDiff(originalSettings, settings, t);
    if (diffs.length > 0) {
      setSaveDiffs(diffs);
      setIsSaveConfirmOpen(true);
    } else {
      executeSave();
    }
  };

  const executeSave = async () => {
    setSaving(true);
    setIsSaveConfirmOpen(false);
    try {
      const res = await updateCompanySettingsAction(settings);
      if (res.success && res.settings) {
        setOriginalSettings(res.settings);
        setSettings(res.settings);
        setSaved(true);
        setTimeout(() => setSaved(false), 4000);
      }
    } catch (e) {
      console.error("Failed to update company settings", e);
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
      key: "taxVat",
      label: t.companySettingsTabs.taxVat,
      icon: Percent,
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
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            {t.settings.companyTitle}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {t.companySettingsView.subtitle}
          </p>
        </div>

        <div className="flex items-center gap-3">
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
        </div>
      </div>

      {/* Top Navigation Tabs */}
      <SettingsNavTabs />

      {/* Sub-Tabs for Company Settings */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-[#f1f3f4] dark:bg-surface-raised border border-slate-200 dark:border-neutral-800 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-150 ${
                isActive
                  ? "bg-white dark:bg-[#282a2d] text-primary dark:text-mint shadow-xs border border-slate-200/80 dark:border-neutral-700"
                  : "text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Icon
                className={`w-3.5 h-3.5 ${
                  isActive ? "text-accent" : "text-slate-400 dark:text-neutral-500"
                }`}
              />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Active Tab Panel */}
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

        {activeTab === "taxVat" && (
          <TaxVatSettingsTab
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

        {activeTab !== "brandAssets" && (
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

      {/* Save Confirmation Modal with Diff Summary */}
      {isSaveConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div {...saveDialog} className="relative w-full max-w-xl bg-white dark:bg-surface-raised border border-ink/15 dark:border-ink/15 rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-ink/15 dark:border-ink/15 flex items-center justify-between bg-slate-50/70 dark:bg-neutral-900/40">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-primary/10 dark:bg-mint/10 text-primary dark:text-mint">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {t.companySettingsView.diffModalTitle}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-neutral-400">
                    {saveDiffs.length} {t.companySettingsView.diffDetected}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSaveConfirmOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
              <p className="text-xs text-slate-600 dark:text-neutral-300">
                {t.companySettingsView.diffNotice}
              </p>

              <div className="space-y-2">
                {saveDiffs.map((diff) => {
                  const fieldKey = diff.key as keyof typeof t.companySettingsView.fields;
                  const label = t.companySettingsView.fields[fieldKey] || (isRTL ? diff.labelAr : diff.labelEn);

                  return (
                    <div
                      key={diff.key}
                      className={`p-3 rounded-xl border text-xs space-y-1.5 ${
                        diff.isVat
                          ? "bg-amber-50/60 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800"
                          : "bg-slate-50 dark:bg-neutral-800/40 border-slate-200 dark:border-neutral-700"
                      }`}
                    >
                      <div className="flex items-center justify-between font-bold text-[11px] text-slate-700 dark:text-neutral-300">
                        <span>{label}</span>
                        {diff.isVat ? (
                          <span className="px-1.5 py-0.5 rounded text-[9px] bg-amber-200 text-amber-900 ">
                            {t.companySettingsView.vatActiveBadge}
                          </span>
                        ) : null}
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px] items-center">
                        <div className="p-2 rounded-lg bg-white/70 dark:bg-neutral-900/60 border border-slate-200/80 dark:border-neutral-700/60 text-slate-500 dark:text-neutral-400">
                          <span className="block text-[9px] uppercase  tracking-wider text-slate-400">
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
            </div>

            <div className="p-4 border-t border-ink/15 dark:border-ink/15 bg-slate-50/50 dark:bg-neutral-900/30 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsSaveConfirmOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-neutral-300 hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors"
              >
                {t.companySettingsView.cancel}
              </button>

              <button
                type="button"
                disabled={saving}
                onClick={executeSave}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-primary hover:bg-primary/90 text-white shadow-2xs inline-flex items-center gap-1.5 transition-colors disabled:opacity-60"
              >
                <Check className="w-4 h-4" />
                <span>{t.companySettingsView.confirmChanges}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

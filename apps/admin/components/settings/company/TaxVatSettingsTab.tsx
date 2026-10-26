"use client";
import { errorMessage } from "../../../lib/error-text";
import { ROUTES } from "../../../constants/routes";
import { uploadFileDirectly } from "../../../lib/upload-client";
import { LinkOrUploadField } from "../../shared/LinkOrUploadField";

import * as React from "react";
import type { CompanySettings } from "@platform/database/types";
import { Card, Input, ConfirmDialog } from "@platform/ui";
import {
  Percent,
  CheckCircle2,
  ExternalLink,
  FileCheck,
  FolderArchive,
} from "lucide-react";
import type { Translations } from "../../../lib/translations";
import { updateCompanySettingsAction } from "../../../app/actions/settings";

interface TaxVatSettingsTabProps {
  settings: CompanySettings;
  setSettings: React.Dispatch<React.SetStateAction<CompanySettings>>;
  t: Translations;
  locale: string;
  isRTL: boolean;
}

export function TaxVatSettingsTab({
  settings,
  setSettings,
  t,
  locale,
  isRTL,
}: TaxVatSettingsTabProps) {
  const [vatUploadError, setVatUploadError] = React.useState<string | null>(
    null,
  );
  const [pendingVatToggle, setPendingVatToggle] = React.useState<
    boolean | null
  >(null);


  return (
    <div className="space-y-6 animate-fade-in">
      <Card className="p-6 bg-white dark:bg-[#202124] border border-ink/15 dark:border-ink/15 shadow-xs rounded-2xl space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-ink/15 dark:border-ink/15">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-xl transition-colors ${settings.vat_enabled
                ? "bg-primary/10 text-primary dark:text-mint"
                : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                }`}
            >
              <Percent className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                {t.settings.vatTitle}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t.companySettingsView.vatToggleSubtitle}
              </p>
            </div>
          </div>

          {settings.vat_enabled ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-primary dark:text-mint border border-emerald-200 dark:border-emerald-800 animate-fade-in">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{t.companySettingsView.vatActiveBadge}</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 animate-fade-in">
              <span>{t.companySettingsView.vatInactiveBadge}</span>
            </span>
          )}
        </div>

        {/* State Toggle Controller Banner */}
        <div
          className={`p-4 rounded-xl border transition-colors flex items-center justify-between gap-4 ${settings.vat_enabled
            ? "bg-primary/5 border-primary/30 dark:bg-primary/10 dark:border-tone-25/40"
            : "bg-slate-50 border-slate-200 dark:bg-slate-800/40 dark:border-slate-700"
            }`}
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-900 dark:text-white">
                {settings.vat_enabled
                  ? `${t.companySettingsView.vatActiveBadge} (${settings.vat_percentage}%)`
                  : t.companySettingsView.vatInactiveBadge}
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px]  font-bold ${settings.vat_enabled
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700"
                  : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                  }`}
              >
                {settings.vat_enabled
                  ? `${settings.vat_percentage}% ${t.companySettingsView.vatActiveBadge}`
                  : t.companySettingsView.vatInactiveBadge}
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-xl">
              {settings.vat_enabled
                ? t.companySettingsView.vatActiveDesc
                : t.companySettingsView.vatInactiveDesc}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setPendingVatToggle(!settings.vat_enabled)}
            role="switch"
            aria-checked={settings.vat_enabled}
            aria-label={t.companySettingsTabs.vatStateLabel}
            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors shrink-0 ${settings.vat_enabled
              ? "bg-primary dark:bg-tone-25"
              : "bg-slate-300 dark:bg-slate-700"
              }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-xs transition-transform ${settings.vat_enabled
                ? isRTL
                  ? "-translate-x-6"
                  : "translate-x-6"
                : isRTL
                  ? "-translate-x-1"
                  : "translate-x-1"
                }`}
            />
          </button>
        </div>

        {settings.vat_enabled && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2 animate-fade-in">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                {t.settings.vatId}
              </label>
              <Input
                value={settings.vat_id || ""}
                onChange={(e) =>
                  setSettings({ ...settings, vat_id: e.target.value })
                }
                placeholder={t.companySettingsTabs.trnPlaceholder}
                className=" text-sm rounded-lg"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                {t.companySettingsView.vatRatePercent}
              </label>
              <Input
                type="number"
                step="0.01"
                value={settings.vat_percentage}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    vat_percentage: parseFloat(e.target.value) || 10,
                  })
                }
                className=" text-sm rounded-lg"
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-800 dark:text-neutral-200 flex items-center gap-1.5">
                  <FileCheck className="w-4 h-4 text-primary dark:text-mint" />
                  <span>{t.companySettingsTabs.certificateTitle}</span>
                </label>
                <span className="text-[10px]  text-slate-500 dark:text-neutral-400">
                  {t.taxVatSettingsTab.nbrOfficialCertificatePdfImage}
                </span>
              </div>

              {/* Upload the certificate, or link to it where it is published (e.g. the NBR portal). */}
              <LinkOrUploadField
                value={settings.vat_certificate_url ?? ""}
                hint={t.taxVatSettingsTab.pdfPngOrJpgUp}
                upload={(file) =>
                  uploadFileDirectly(file, {
                    entityType: "company_setting",
                    entityId: "company-settings",
                    documentType: "vat_certificate",
                  })
                }
                onChange={async (url) => {
                  const updated = { ...settings, vat_certificate_url: url };
                  setSettings(updated);
                  try {
                    await updateCompanySettingsAction(updated);
                  } catch (err) {
                    setVatUploadError(
                      errorMessage(
                        err,
                        t,
                        t.taxVatSettingsTab.failedToUploadCertificate,
                      ),
                    );
                  }
                }}
              />
              {settings.vat_certificate_url ? (
                <a
                  href={settings.vat_certificate_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary dark:text-mint hover:underline"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>{t.taxVatSettingsTab.vatCertificateDocument}</span>
                </a>
              ) : null}
              {vatUploadError && (
                <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">
                  {vatUploadError}
                </p>
              )}

              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-neutral-400 pt-1">
                <span>{t.companySettingsTabs.certificateRequirement}</span>
                <a
                  href={ROUTES.archive}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary dark:text-mint hover:underline font-semibold"
                >
                  <FolderArchive className="w-3.5 h-3.5" />
                  <span>{t.companySettingsTabs.viewInVault}</span>
                </a>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* VAT Status Confirmation Modal */}
      <ConfirmDialog isOpen={pendingVatToggle !== null} onClose={() => setPendingVatToggle(null)} title={pendingVatToggle ? t.companySettingsTabs.vatModalTitleEnable : t.companySettingsTabs.vatModalTitleDisable} description={<div className="space-y-4"><p>{t.companySettingsTabs.vatModalDesc}</p>
        {pendingVatToggle ? (
          <div className="space-y-3">
            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 space-y-2">
              <div className="flex items-center justify-between font-bold text-xs">
                <span>
                  {t.companySettingsTabs.vatModalNewStatusEnabled}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-200 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 ">
                  {settings.vat_percentage}{t.copy.vatPercent}</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-emerald-800/90 dark:text-emerald-300/90 leading-relaxed">
                <li>{t.companySettingsTabs.vatModalNotice1}</li>
                <li>{t.companySettingsTabs.vatModalNotice2}</li>
                <li>{t.companySettingsTabs.vatModalNotice3}</li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 space-y-2">
              <div className="font-bold text-xs">
                {t.companySettingsTabs.vatModalNewStatusDisabled}
              </div>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-amber-800/90 dark:text-amber-300/90 leading-relaxed">
                <li>{t.companySettingsTabs.vatModalDisabledNotice1}</li>
                <li>{t.companySettingsTabs.vatModalDisabledNotice2}</li>
              </ul>
            </div>
          </div>
        )}

      </div>} variant={pendingVatToggle ? "warning" : "danger"} confirmLabel={t.companySettingsTabs.applyTaxChange} cancelLabel={t.companySettingsTabs.cancelTaxChange} onConfirm={() => { if (pendingVatToggle !== null) setSettings({ ...settings, vat_enabled: pendingVatToggle }); }} />
    </div>
  );
}

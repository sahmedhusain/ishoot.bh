"use client";
import { ROUTES } from "../../../constants/routes";
import { uploadFileDirectly } from "../../../lib/upload-client";

import * as React from "react";
import type { CompanySettings } from "@ishoot/database/types";
import { Card, Input } from "@ishoot/ui";
import {
  Percent,
  CheckCircle2,
  ExternalLink,
  FileCheck,
  ShieldCheck,
  UploadCloud,
  FileText,
  Loader2,
  Trash2,
  FolderArchive,
  AlertTriangle,
  X,
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
  const [vatUploading, setVatUploading] = React.useState(false);
  const [vatUploadError, setVatUploadError] = React.useState<string | null>(null);
  const vatFileInputRef = React.useRef<HTMLInputElement>(null);
  const [pendingVatToggle, setPendingVatToggle] = React.useState<boolean | null>(null);

  const handleVatFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setVatUploading(true);
    setVatUploadError(null);

    try {
      const data = await uploadFileDirectly(file, { entityType: "company_setting", entityId: "company-settings", documentType: "vat_certificate" });
        const res = { ok: true }; // polyfill for following code
      if (!res.ok || !data.success) {
        throw new Error(data.error || t.taxVatSettingsTab.uploadFailed);
      }

      const updated = {
        ...settings,
        vat_certificate_url: data.fileUrl,
      };
      setSettings(updated);
      await updateCompanySettingsAction(updated);
    } catch (err: any) {
      setVatUploadError(err.message || t.taxVatSettingsTab.failedToUploadCertificate);
    } finally {
      setVatUploading(false);
      if (vatFileInputRef.current) vatFileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <Card className="p-6 bg-white dark:bg-[#202124] border border-[#dadce0] dark:border-[#3c4043] shadow-xs rounded-2xl space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-[#dadce0] dark:border-[#3c4043]">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-xl transition-colors ${
                settings.vat_enabled
                  ? "bg-[#014842]/10 text-[#014842] dark:text-[#7de0d1]"
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
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-[#014842] dark:text-[#7de0d1] border border-emerald-200 dark:border-emerald-800 animate-fade-in">
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
          className={`p-4 rounded-xl border transition-colors flex items-center justify-between gap-4 ${
            settings.vat_enabled
              ? "bg-[#014842]/5 border-[#014842]/30 dark:bg-[#014842]/10 dark:border-[#00897b]/40"
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
                className={`px-2.5 py-0.5 rounded-full text-[10px]  font-bold ${
                  settings.vat_enabled
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
            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors shrink-0 ${
              settings.vat_enabled
                ? "bg-[#014842] dark:bg-[#00897b]"
                : "bg-slate-300 dark:bg-slate-700"
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-xs transition-transform ${
                settings.vat_enabled
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
                  <FileCheck className="w-4 h-4 text-[#014842] dark:text-[#7de0d1]" />
                  <span>
                    {t.companySettingsTabs.certificateTitle}
                  </span>
                </label>
                <span className="text-[10px]  text-slate-500 dark:text-neutral-400">
                  {t.taxVatSettingsTab.nbrOfficialCertificatePdfImage}
                </span>
              </div>

              <input
                ref={vatFileInputRef}
                type="file"
                accept="application/pdf,image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={handleVatFileUpload}
              />

              {settings.vat_certificate_url ? (
                <div className="p-3.5 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {t.taxVatSettingsTab.vatCertificateDocument}
                        </p>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-200 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
                          {t.companySettingsTabs.archivedInVault}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-neutral-400  truncate">
                        {settings.vat_certificate_url}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={settings.vat_certificate_url}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-white dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 text-slate-800 dark:text-neutral-200 hover:text-[#014842] dark:hover:text-[#7de0d1] text-xs font-semibold inline-flex items-center gap-1.5 transition-colors shadow-xs"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>{t.actions.view}</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => vatFileInputRef.current?.click()}
                      disabled={vatUploading}
                      className="px-3 py-1.5 rounded-lg bg-[#014842] hover:bg-[#014842]/90 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors shadow-xs"
                    >
                      {vatUploading ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>{t.companySettingsTabs.uploading}</span>
                        </>
                      ) : (
                        <>
                          <UploadCloud className="w-3.5 h-3.5" />
                          <span>{t.companySettingsTabs.replaceCert}</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        const updated = { ...settings, vat_certificate_url: "" };
                        setSettings(updated);
                        await updateCompanySettingsAction(updated);
                      }}
                      className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-100/50 dark:hover:bg-rose-950/40 transition-colors"
                      title={t.companySettingsTabs.assetRemove}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => !vatUploading && vatFileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all duration-200 ${
                    vatUploading
                      ? "border-[#014842] bg-[#014842]/5"
                      : "border-slate-300 dark:border-neutral-700 hover:border-[#014842] dark:hover:border-[#7de0d1] bg-slate-50/70 hover:bg-slate-50 dark:bg-neutral-800/40 dark:hover:bg-neutral-800/70"
                  }`}
                >
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <div className="w-10 h-10 rounded-full bg-[#014842]/10 text-[#014842] dark:text-[#7de0d1] flex items-center justify-center">
                      {vatUploading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <UploadCloud className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-900 dark:text-white">
                        {vatUploading ? (
                          t.companySettingsTabs.uploading
                        ) : (
                          <>
                            <span className="text-[#014842] dark:text-[#7de0d1] underline font-bold">
                              {t.companySettingsTabs.clickToUpload}
                            </span>{" "}
                            {t.taxVatSettingsTab.orDragAndDropVat}
                          </>
                        )}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-neutral-400 mt-0.5">
                        {t.taxVatSettingsTab.pdfPngOrJpgUp}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {vatUploadError && (
                <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">
                  {vatUploadError}
                </p>
              )}

              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-neutral-400 pt-1">
                <span>
                  {t.companySettingsTabs.certificateRequirement}
                </span>
                <a
                  href={ROUTES.archive}
                  target="_blank"
                  className="inline-flex items-center gap-1 text-[#014842] dark:text-[#7de0d1] hover:underline font-semibold"
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
      {pendingVatToggle !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg bg-white dark:bg-[#1a1a1a] border border-[#dadce0] dark:border-[#3c4043] rounded-2xl shadow-2xl overflow-hidden">
            <div
              className={`p-4 border-b border-[#dadce0] dark:border-[#3c4043] flex items-center justify-between ${
                pendingVatToggle
                  ? "bg-emerald-50/60 dark:bg-emerald-950/20"
                  : "bg-amber-50/60 dark:bg-amber-950/20"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={`p-2 rounded-xl ${
                    pendingVatToggle
                      ? "bg-emerald-100 dark:bg-emerald-900/60 text-[#014842] dark:text-[#7de0d1]"
                      : "bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300"
                  }`}
                >
                  {pendingVatToggle ? (
                    <ShieldCheck className="w-5 h-5" />
                  ) : (
                    <AlertTriangle className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {pendingVatToggle
                      ? t.companySettingsTabs.vatModalTitleEnable
                      : t.companySettingsTabs.vatModalTitleDisable}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-neutral-400">
                    {t.companySettingsTabs.vatModalDesc}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPendingVatToggle(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              {pendingVatToggle ? (
                <div className="space-y-3">
                  <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 space-y-2">
                    <div className="flex items-center justify-between font-bold text-xs">
                      <span>{t.companySettingsTabs.vatModalNewStatusEnabled}</span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-200 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 ">
                        {settings.vat_percentage}% VAT
                      </span>
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

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#dadce0] dark:border-[#3c4043]">
                <button
                  type="button"
                  onClick={() => setPendingVatToggle(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-neutral-300 hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors"
                >
                  {t.companySettingsTabs.cancelTaxChange}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const nextVal = pendingVatToggle;
                    setPendingVatToggle(null);
                    setSettings({ ...settings, vat_enabled: nextVal });
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold text-white shadow-xs transition-colors ${
                    pendingVatToggle
                      ? "bg-[#014842] hover:bg-[#014842]/90"
                      : "bg-amber-600 hover:bg-amber-700"
                  }`}
                >
                  {t.companySettingsTabs.applyTaxChange}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

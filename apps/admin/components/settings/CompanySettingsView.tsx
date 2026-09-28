"use client";

import * as React from "react";
import type { CompanySettings } from "@ishoot/database/types";
import { Card, Input, Button } from "@ishoot/ui";
import {
  Building2,
  Percent,
  Landmark,
  CheckCircle2,
  Calendar,
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
  ArrowRight,
  ArrowLeft,
  Check,
} from "lucide-react";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { updateCompanySettingsAction } from "../../app/actions/settings";
import { SettingsNavTabs } from "./SettingsNavTabs";

interface CompanySettingsViewProps {
  initialSettings: CompanySettings;
}

interface ChangeDiff {
  key: string;
  labelEn: string;
  labelAr: string;
  oldValue: string;
  newValue: string;
  isVat?: boolean;
}

function calculateDiff(
  oldSettings: CompanySettings,
  newSettings: CompanySettings,
): ChangeDiff[] {
  const diffs: ChangeDiff[] = [];

  if (oldSettings.vat_enabled !== newSettings.vat_enabled) {
    diffs.push({
      key: "vat_enabled",
      labelEn: "VAT Status",
      labelAr: "حالة تفعيل ضريبة القيمة المضافة",
      oldValue: oldSettings.vat_enabled
        ? `Active (${oldSettings.vat_percentage}%)`
        : "Inactive (Non-VAT)",
      newValue: newSettings.vat_enabled
        ? `Active (${newSettings.vat_percentage}%)`
        : "Inactive (Non-VAT)",
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

  if (
    (oldSettings.vat_certificate_url || "") !==
    (newSettings.vat_certificate_url || "")
  ) {
    diffs.push({
      key: "vat_certificate_url",
      labelEn: "VAT Registration Certificate",
      labelAr: "شهادة تسجيل القيمة المضافة (NBR)",
      oldValue: oldSettings.vat_certificate_url ? "Document Attached" : "None",
      newValue: newSettings.vat_certificate_url ? "Document Attached" : "None",
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

  if (oldSettings.address_en !== newSettings.address_en) {
    diffs.push({
      key: "address_en",
      labelEn: "Address (English)",
      labelAr: "العنوان بالإنجليزية",
      oldValue: oldSettings.address_en || "—",
      newValue: newSettings.address_en || "—",
    });
  }

  if (oldSettings.address_ar !== newSettings.address_ar) {
    diffs.push({
      key: "address_ar",
      labelEn: "Address (Arabic)",
      labelAr: "العنوان بالعربية",
      oldValue: oldSettings.address_ar || "—",
      newValue: newSettings.address_ar || "—",
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

  if (oldSettings.bank_account_number !== newSettings.bank_account_number) {
    diffs.push({
      key: "bank_account_number",
      labelEn: "Bank Account Number",
      labelAr: "رقم الحساب البنكي",
      oldValue: oldSettings.bank_account_number || "—",
      newValue: newSettings.bank_account_number || "—",
    });
  }

  if (oldSettings.bank_swift !== newSettings.bank_swift) {
    diffs.push({
      key: "bank_swift",
      labelEn: "SWIFT / BIC Code",
      labelAr: "رمز السويفت الدولي",
      oldValue: oldSettings.bank_swift || "—",
      newValue: newSettings.bank_swift || "—",
    });
  }

  return diffs;
}

export function CompanySettingsView({
  initialSettings,
}: CompanySettingsViewProps) {
  const { t, locale, isRTL } = useAdminLocale();

  const [originalSettings, setOriginalSettings] =
    React.useState<CompanySettings>(initialSettings);
  const [settings, setSettings] =
    React.useState<CompanySettings>(initialSettings);
  const [saved, setSaved] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [googleConnected, setGoogleConnected] = React.useState(true);
  const [vatUploading, setVatUploading] = React.useState(false);
  const [vatUploadError, setVatUploadError] = React.useState<string | null>(null);
  const vatFileInputRef = React.useRef<HTMLInputElement>(null);

  // Confirmation Modals State
  const [pendingVatToggle, setPendingVatToggle] = React.useState<boolean | null>(
    null,
  );
  const [isSaveConfirmOpen, setIsSaveConfirmOpen] = React.useState(false);
  const [saveDiffs, setSaveDiffs] = React.useState<ChangeDiff[]>([]);

  const handleVatFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setVatUploading(true);
    setVatUploadError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("entityType", "company_setting");
      formData.append("entityId", "company-settings");
      formData.append(
        "customName",
        `NBR VAT Registration Certificate - ${file.name}`,
      );
      formData.append("documentType", "vat_certificate");

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Upload failed");
      }

      const updated = {
        ...settings,
        vat_certificate_url: data.fileUrl,
      };
      setSettings(updated);
      await updateCompanySettingsAction(updated);
      setOriginalSettings((prev) => ({
        ...prev,
        vat_certificate_url: data.fileUrl,
      }));
    } catch (err: any) {
      console.error("VAT upload error:", err);
      setVatUploadError(err.message || "Failed to upload VAT certificate");
    } finally {
      setVatUploading(false);
      if (vatFileInputRef.current) vatFileInputRef.current.value = "";
    }
  };

  const handleOpenSaveConfirm = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const diffs = calculateDiff(originalSettings, settings);
    setSaveDiffs(diffs);
    setIsSaveConfirmOpen(true);
  };

  const handleConfirmSave = async () => {
    setSaving(true);
    setSaved(false);

    try {
      await updateCompanySettingsAction(settings);
      setOriginalSettings(settings);
      setIsSaveConfirmOpen(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3500);
    } catch (err) {
      console.error("Failed to update company settings:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      <SettingsNavTabs />

      {/* Google M3 Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#dadce0] dark:border-[#3c4043]">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white font-display">
            {t.nav.companySettings}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {t.companySettingsView.subtitle}
          </p>
        </div>

        <Button
          type="button"
          variant="primary"
          onClick={handleOpenSaveConfirm}
          disabled={saving}
          className="gap-2 shadow-sm rounded-full px-5 py-2 text-xs font-semibold"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>{saving ? (isRTL ? "جاري الحفظ..." : "Saving...") : t.actions.save}</span>
        </Button>
      </div>

      {saved && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 flex items-center gap-3 text-emerald-800 dark:text-emerald-300 text-xs font-medium animate-fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>{t.companySettingsView.saved}</span>
        </div>
      )}

      <form onSubmit={handleOpenSaveConfirm} className="space-y-6">
        {/* VAT (Value Added Tax) Governance Card */}
        <Card className="p-6 bg-white dark:bg-[#202124] border border-[#dadce0] dark:border-[#3c4043] shadow-sm rounded-2xl space-y-5">
          <div className="flex items-center gap-3 pb-3 border-b border-[#dadce0] dark:border-[#3c4043]">
            <div className="p-2 rounded-xl bg-[#09937F]/10 text-[#09937F]">
              <Percent className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                {t.settings.vatTitle}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isRTL
                  ? `التحويل بين نظام المنشأة غير الخاضعة للضريبة ونظام ضريبة القيمة المضافة (${settings.vat_percentage}%).`
                  : `Toggle between Non-VAT entity and active Value Added Tax (${settings.vat_percentage}%).`}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-[#f8f9fa] dark:bg-[#282a2d] border border-[#dadce0] dark:border-[#3c4043]">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  {settings.vat_enabled
                    ? isRTL
                      ? `المنشأة خاضعة لضريبة القيمة المضافة (${settings.vat_percentage}%)`
                      : `VAT Registered Entity (${settings.vat_percentage}%)`
                    : isRTL
                      ? "المنشأة غير خاضعة للضريبة (فاتورة اعتيادية)"
                      : "Non-VAT Registered Entity (Standard Invoice)"}
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                    settings.vat_enabled
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700"
                      : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                  }`}
                >
                  {settings.vat_enabled
                    ? isRTL
                      ? `ضريبة ${settings.vat_percentage}% مفعلة`
                      : `${settings.vat_percentage}% VAT Active`
                    : isRTL
                      ? "غير خاضعة للضريبة"
                      : "VAT Inactive"}
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-xl">
                {settings.vat_enabled
                  ? isRTL
                    ? `سيتم احتساب ضريبة القيمة المضافة بنسبة ${settings.vat_percentage}% وإصدار الفواتير كـ "فاتورة ضريبية" رسمية معتمدة من الجهاز الوطني للإيرادات.`
                    : `All new invoices will compute ${settings.vat_percentage}% VAT and render official tax registration.`
                  : isRTL
                    ? "الضريبة غير مفعلة حالياً. تصدر الفواتير كفواتير اعتيادية دون أي تفصيل ضريبي أو مسميات ضريبية حتى يتم تفعيل الضريبة رسمياً."
                    : "VAT is currently inactive. Invoices will be issued as standard invoices (without tax breakdown or tax titles) until VAT is explicitly enabled."}
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
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${
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
                  placeholder="200019283700002"
                  className="font-mono text-sm rounded-lg"
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
                  className="font-mono text-sm rounded-lg"
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-800 dark:text-neutral-200 flex items-center gap-1.5">
                    <FileCheck className="w-4 h-4 text-[#014842] dark:text-[#7de0d1]" />
                    <span>VAT Registration Certificate / شهادة تسجيل ضريبة القيمة المضافة *</span>
                  </label>
                  <span className="text-[10px] font-mono text-slate-500 dark:text-neutral-400">
                    NBR Official Certificate (PDF / Image)
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
                            VAT Certificate Document
                          </p>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-200 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
                            Archived in Vault
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-neutral-400 font-mono truncate">
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
                        <span>View Document</span>
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
                            <span>Uploading...</span>
                          </>
                        ) : (
                          <>
                            <UploadCloud className="w-3.5 h-3.5" />
                            <span>Replace</span>
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
                        title="Remove Document"
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
                            "Uploading to Archive Vault..."
                          ) : (
                            <>
                              <span className="text-[#014842] dark:text-[#7de0d1] underline font-bold">
                                Click to upload
                              </span>{" "}
                              or drag and drop VAT Certificate
                            </>
                          )}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-neutral-400 mt-0.5">
                          PDF, PNG, or JPG up to 25MB. File is instantly stored and indexed in the Archive tab.
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
                  <span>Required when activating VAT. Verifies compliance with National Bureau for Revenue (NBR).</span>
                  <a
                    href="/dashboard/archive"
                    target="_blank"
                    className="inline-flex items-center gap-1 text-[#014842] dark:text-[#7de0d1] hover:underline font-semibold"
                  >
                    <FolderArchive className="w-3.5 h-3.5" />
                    <span>View in Archive Vault</span>
                  </a>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Google Workspace & Production Calendar Card */}
        <Card className="p-6 bg-white dark:bg-[#202124] border border-[#dadce0] dark:border-[#3c4043] shadow-sm rounded-2xl space-y-5">
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
                production@ishoot.bh • {t.companySettingsView.googleSyncActive}
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

        {/* Company Legal Profile Card */}
        <Card className="p-6 bg-white dark:bg-[#202124] border border-[#dadce0] dark:border-[#3c4043] shadow-sm rounded-2xl space-y-5">
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

            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                {t.companySettingsView.addressLabel}
              </label>
              <Input
                value={
                  locale === "ar"
                    ? settings.address_ar
                    : settings.address_en || settings.address_ar
                }
                onChange={(e) =>
                  setSettings({ ...settings, address_ar: e.target.value })
                }
                className="rounded-lg"
              />
            </div>
          </div>
        </Card>

        {/* Official Banking & Settlement Coordinates */}
        <Card className="p-6 bg-white dark:bg-[#202124] border border-[#dadce0] dark:border-[#3c4043] shadow-sm rounded-2xl space-y-5">
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
                value={settings.bank_name}
                onChange={(e) =>
                  setSettings({ ...settings, bank_name: e.target.value })
                }
                className="rounded-lg"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                {t.settings.bankIban}
              </label>
              <Input
                value={settings.bank_iban}
                onChange={(e) =>
                  setSettings({ ...settings, bank_iban: e.target.value })
                }
                className="font-mono rounded-lg"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                {t.settings.bankAccount}
              </label>
              <Input
                value={settings.bank_account_number}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    bank_account_number: e.target.value,
                  })
                }
                className="font-mono rounded-lg"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                {t.settings.bankSwift}
              </label>
              <Input
                value={settings.bank_swift}
                onChange={(e) =>
                  setSettings({ ...settings, bank_swift: e.target.value })
                }
                className="font-mono rounded-lg"
              />
            </div>
          </div>
        </Card>

        <div className="flex items-center justify-end gap-4 pt-2">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            disabled={saving}
            className="shadow-sm rounded-full px-6 py-2.5 text-xs font-semibold"
          >
            {saving ? (isRTL ? "جاري الحفظ..." : "Saving...") : t.actions.save}
          </Button>
        </div>
      </form>

      {/* 1. VAT Status Confirmation Modal */}
      {pendingVatToggle !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg bg-white dark:bg-[#1a1a1a] border border-[#dadce0] dark:border-[#3c4043] rounded-2xl shadow-2xl overflow-hidden">
            {/* Header */}
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
                      ? isRTL
                        ? "تأكيد تفعيل ضريبة القيمة المضافة (VAT)"
                        : "Confirm Enabling Value Added Tax (VAT)"
                      : isRTL
                        ? "تأكيد إيقاف ضريبة القيمة المضافة"
                        : "Confirm Disabling Value Added Tax (VAT)"}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-neutral-400">
                    {isRTL
                      ? "تغيير في الوضع الضريبي الرسمي للمنشأة"
                      : "Official company tax status transition"}
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

            {/* Body */}
            <div className="p-5 space-y-4 text-xs">
              {pendingVatToggle ? (
                <div className="space-y-3">
                  <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 space-y-2">
                    <div className="flex items-center justify-between font-bold text-xs">
                      <span>
                        {isRTL
                          ? "الوضع الجديد: منشأة خاضعة للضريبة"
                          : "New Status: VAT Registered Entity"}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-200 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 font-mono">
                        {settings.vat_percentage}% VAT
                      </span>
                    </div>
                    <ul className="list-disc list-inside space-y-1 text-[11px] text-emerald-800/90 dark:text-emerald-300/90 leading-relaxed">
                      <li>
                        {isRTL
                          ? `سيتم احتساب ضريبة القيمة المضافة بنسبة (${settings.vat_percentage}%) على جميع الفواتير الصادرة الجديدة.`
                          : `All new invoices will compute ${settings.vat_percentage}% VAT.`}
                      </li>
                      <li>
                        {isRTL
                          ? "ستصدر الفواتير كـ \"فاتورة ضريبية\" رسمية معتمدة من الجهاز الوطني للإيرادات (NBR)."
                          : "Invoices will be titled \"TAX INVOICE\" with full tax breakdown."}
                      </li>
                      <li>
                        {isRTL
                          ? "يرجى التأكد من إدخال الرقم الضريبي وإرفاق شهادة تسجيل الضريبة (NBR)."
                          : "Ensure official VAT ID (TRN) and NBR certificate are provided."}
                      </li>
                    </ul>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-neutral-400">
                    {isRTL
                      ? "هل أنت متأكد من رغبتك في تفعيل ضريبة القيمة المضافة للمنشأة الآن؟"
                      : "Are you sure you want to activate VAT compliance for this entity?"}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 space-y-2">
                    <div className="font-bold text-xs">
                      {isRTL
                        ? "الوضع الجديد: منشأة غير خاضعة للضريبة (فاتورة اعتيادية)"
                        : "New Status: Non-VAT Entity (Standard Invoices)"}
                    </div>
                    <ul className="list-disc list-inside space-y-1 text-[11px] text-amber-800/90 dark:text-amber-300/90 leading-relaxed">
                      <li>
                        {isRTL
                          ? "ستصدر الفواتير كفواتير اعتيادية دون أي بنود ضريبية أو نسب مئوية (لن تظهر 0% أو إعفاء)."
                          : "Invoices will be standard without tax lines or 0% tax rows."}
                      </li>
                      <li>
                        {isRTL
                          ? "سيتم تعديل مسمى الوثيقة إلى \"فاتورة\" بدلاً من \"فاتورة ضريبية\"."
                          : "Document title will revert to \"INVOICE\" instead of \"TAX INVOICE\"."}
                      </li>
                    </ul>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-neutral-400">
                    {isRTL
                      ? "هل أنت متأكد من رغبتك في إلغاء تفعيل الضريبة وتحويل المنشأة إلى غير خاضعة للضريبة؟"
                      : "Are you sure you want to deactivate VAT compliance?"}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#dadce0] dark:border-[#3c4043]">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setPendingVatToggle(null)}
                >
                  {isRTL ? "إلغاء" : "Cancel"}
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    setSettings((prev) => ({
                      ...prev,
                      vat_enabled: pendingVatToggle,
                    }));
                    setPendingVatToggle(null);
                  }}
                  className={`rounded-full px-5 text-xs font-semibold text-white ${
                    pendingVatToggle
                      ? "bg-[#014842] hover:bg-[#014842]/90"
                      : "bg-amber-600 hover:bg-amber-700"
                  }`}
                >
                  {pendingVatToggle
                    ? isRTL
                      ? "تأكيد وتفعيل الضريبة"
                      : "Confirm & Enable VAT"
                    : isRTL
                      ? "تأكيد وإيقاف الضريبة"
                      : "Confirm & Disable VAT"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Save Settings Confirmation Modal with Full Changes Diff */}
      {isSaveConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-2xl bg-white dark:bg-[#1a1a1a] border border-[#dadce0] dark:border-[#3c4043] rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-[#dadce0] dark:border-[#3c4043] flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-[#202124]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-[#014842]/10 text-[#014842] dark:text-[#7de0d1]">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {isRTL
                      ? "مراجعة وتأكيد حفظ إعدادات الشركة"
                      : "Review & Confirm Settings Changes"}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-neutral-400">
                    {saveDiffs.length > 0
                      ? isRTL
                        ? `تم رصد (${saveDiffs.length}) تعديل على بيانات الشركة الرسمية`
                        : `${saveDiffs.length} change(s) detected in official configuration`
                      : isRTL
                        ? "لا توجد تعديلات جديدة"
                        : "No modifications detected"}
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

            {/* Scrollable Changes List */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs flex-1">
              {saveDiffs.length === 0 ? (
                <div className="p-8 rounded-xl border border-dashed border-slate-300 dark:border-neutral-700 bg-slate-50/50 dark:bg-neutral-800/30 text-center space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-[#014842] dark:text-[#7de0d1] mx-auto" />
                  <p className="font-semibold text-slate-800 dark:text-neutral-200 text-sm">
                    {isRTL
                      ? "البيانات متطابقة تماماً ولا توجد تغييرات"
                      : "Settings are completely up to date"}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-neutral-400 max-w-sm mx-auto">
                    {isRTL
                      ? "لم يتم تعديل أي من الحقول. جميع القيم الحالية مطابقة للبيانات المسجلة في النظام."
                      : "No fields were modified. All current values match the registered records."}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Warning banner if VAT fields were altered */}
                  {saveDiffs.some((d) => d.isVat) && (
                    <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 flex items-start gap-2.5 text-amber-900 dark:text-amber-200">
                      <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <div className="text-[11px] leading-relaxed">
                        <span className="font-bold">
                          {isRTL ? "تنبيه ضريبي هام: " : "Important Tax Notice: "}
                        </span>
                        {isRTL
                          ? "التعديلات تتضمن تغييرات في الوضع الضريبي للمنشأة أو نسبة الضريبة أو الشهادة المعتمدة."
                          : "These changes include alterations to company VAT status, tax rates, or certificate attachments."}
                      </div>
                    </div>
                  )}

                  <div className="border border-[#dadce0] dark:border-[#3c4043] rounded-xl overflow-hidden divide-y divide-[#dadce0] dark:divide-[#3c4043]">
                    {saveDiffs.map((diff) => (
                      <div
                        key={diff.key}
                        className="p-3 bg-white dark:bg-[#1f1f1f] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                      >
                        <div className="font-semibold text-slate-800 dark:text-neutral-200 min-w-[180px]">
                          <div>{isRTL ? diff.labelAr : diff.labelEn}</div>
                          <div className="text-[10px] text-slate-400 font-normal">
                            {isRTL ? diff.labelEn : diff.labelAr}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 min-w-0 flex-1 justify-end">
                          <span
                            className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-900 font-mono text-[11px] line-through max-w-[180px] truncate"
                            title={diff.oldValue}
                          >
                            {diff.oldValue}
                          </span>
                          <span className="text-slate-400">→</span>
                          <span
                            className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 font-mono text-[11px] font-bold max-w-[200px] truncate"
                            title={diff.newValue}
                          >
                            {diff.newValue}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-[#dadce0] dark:border-[#3c4043] flex items-center justify-between shrink-0 bg-slate-50 dark:bg-[#202124]">
              <span className="text-[11px] text-slate-500 dark:text-neutral-400">
                {saveDiffs.length > 0
                  ? isRTL
                    ? "بالنقر على تأكيد سيتم تطبيق التعديلات فوراً على كافة الوثائق الرسمية."
                    : "Confirming will apply these updates across all official documents immediately."
                  : isRTL
                    ? "لا توجد تعديلات للحفظ"
                    : "No pending updates"}
              </span>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsSaveConfirmOpen(false)}
                >
                  {isRTL ? "إلغاء" : "Cancel"}
                </Button>
                {saveDiffs.length > 0 ? (
                  <Button
                    type="button"
                    variant="primary"
                    disabled={saving}
                    onClick={handleConfirmSave}
                    className="bg-[#014842] hover:bg-[#014842]/90 text-white rounded-full px-5 text-xs font-semibold gap-1.5 shadow-sm"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      {saving
                        ? isRTL
                          ? "جاري الحفظ..."
                          : "Applying..."
                        : isRTL
                          ? "تأكيد وحفظ التغييرات"
                          : "Confirm & Save"}
                    </span>
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="primary"
                    onClick={() => setIsSaveConfirmOpen(false)}
                    className="rounded-full px-5 text-xs font-semibold"
                  >
                    {isRTL ? "إغلاق" : "Close"}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

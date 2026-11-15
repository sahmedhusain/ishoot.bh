"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Building2,
  Receipt,
  FileText,
  Palette,
  CheckCircle2,
  AlertCircle,
  Upload,
  Trash2,
  Save,
  Loader2,
  Lock,
  ShieldCheck,
  RotateCcw,
} from "lucide-react";
import { Select } from "@platform/ui";
import { CURRENCY_CODES, getCurrencyLabel } from "@platform/config/currency";
import type {
  CompanyConfiguration,
  CompanyConfigurationPatch,
  CompanyAsset,
} from "@platform/api-client";
import {
  saveCompanyAction,
  finishCompanySetupAction,
  uploadCompanyAssetAction,
  removeCompanyAssetAction,
} from "../app/(desk)/company/actions";
import { useCopy } from "./CopyProvider";
import { PageTitle } from "./ticket-ui";
import { CompanyThemeTab } from "./CompanyThemeTab";

type Tab =
  | "profile"
  | "finance"
  | "sequences"
  | "branding"
  | "appearance"
  | "governance"
  | "setup";

type AdminAllowedSettings = NonNullable<CompanyConfiguration["adminAllowedSettings"]>;

const DEFAULT_ADMIN_ALLOWED: AdminAllowedSettings = {
  company: false,
  web: false,
  tax: false,
  appearance: false,
  domains: false,
  deployments: false,
  roles: false,
  audit: false,
  privacy: true,
  approvals: true,
  departments: true,
  pipeline: true,
  storeSettings: true,
  deliverySettings: true,
  requestsSettings: true,
  hrSettings: true,
};

const GOVERNANCE_IT_KEYS: (keyof AdminAllowedSettings)[] = [
  "company",
  "web",
  "tax",
  "appearance",
  "domains",
  "deployments",
  "roles",
  "audit",
];

const GOVERNANCE_OPERATIONAL_KEYS: (keyof AdminAllowedSettings)[] = [
  "approvals",
  "departments",
  "pipeline",
  "privacy",
  "storeSettings",
  "deliverySettings",
  "requestsSettings",
  "hrSettings",
];

export function CompanyView({
  company,
  assets,
  setupStatus,
  canEdit,
  canComplete,
}: {
  company: CompanyConfiguration | null;
  assets: CompanyAsset[];
  setupStatus: { complete: boolean; missing: string[] } | null;
  canEdit: boolean;
  canComplete: boolean;
  canCompleteAction?: boolean;
}) {
  const { copy, date, locale } = useCopy();
  const c = copy.company;
  const router = useRouter();

  const [tab, setTab] = React.useState<Tab>("profile");
  const [busy, setBusy] = React.useState(false);

  const [formData, setFormData] = React.useState<CompanyConfigurationPatch>(() => {
    if (!company) return {};
    return {
      companyNameEn: company.companyNameEn,
      companyNameAr: company.companyNameAr,
      crNumber: company.crNumber ?? "",
      vatId: company.vatId ?? "",
      vatEnabled: company.vatEnabled,
      vatPercentage: company.vatPercentage,
      vatCertificateUrl: company.vatCertificateUrl ?? "",
      defaultCurrency: company.defaultCurrency,
      addressEn: company.addressEn ?? "",
      addressAr: company.addressAr ?? "",
      phone: company.phone ?? "",
      whatsappPhone: company.whatsappPhone ?? "",
      email: company.email ?? "",
      website: company.website ?? "",
      instagramUrl: company.instagramUrl ?? "",
      linkedinUrl: company.linkedinUrl ?? "",
      youtubeUrl: company.youtubeUrl ?? "",
      bankName: company.bankName ?? "",
      bankIban: company.bankIban ?? "",
      bankAccountNumber: company.bankAccountNumber ?? "",
      bankSwift: company.bankSwift ?? "",
      timeZone: company.timeZone ?? "UTC",
      paymentTermsDays: company.paymentTermsDays,
      defaultDiscountLimitPercent: company.defaultDiscountLimitPercent ?? "5.00",
      quotationsAlwaysNeedApproval: company.quotationsAlwaysNeedApproval ?? false,
      invoicePrefix: company.invoicePrefix,
      invoiceNextNumber: company.invoiceNextNumber,
      receiptPrefix: company.receiptPrefix,
      receiptNextNumber: company.receiptNextNumber,
      primaryLanguage: company.primaryLanguage,
      contentLanguages: company.contentLanguages,
      businessActivity: company.businessActivity ?? "services",
      taglineEn: company.taglineEn ?? "",
      taglineAr: company.taglineAr ?? "",
      foundedYear: company.foundedYear ?? undefined,
      city: company.city ?? "",
      country: company.country ?? "BH",
      mapUrl: company.mapUrl ?? "",
      adminAllowedSettings: {
        ...DEFAULT_ADMIN_ALLOWED,
        ...(company.adminAllowedSettings ?? {}),
      },
    };
  });

  const update = (patch: Partial<CompanyConfigurationPatch>) => {
    setFormData((prev) => ({ ...prev, ...patch }));
  };

  const toggleLanguage = (lang: "ar" | "en") => {
    const current = (formData.contentLanguages ?? ["ar", "en"]) as ("ar" | "en")[];
    const has = current.includes(lang);
    if (has && current.length === 1) return;
    const next = has ? current.filter((l) => l !== lang) : [...current, lang];
    const primary = next.includes((formData.primaryLanguage as "ar" | "en") ?? "ar")
      ? formData.primaryLanguage
      : next[0];
    update({ contentLanguages: next, primaryLanguage: primary });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;
    setBusy(true);
    try {
      const result = await saveCompanyAction(formData);
      if (!result.ok) {
        toast.error(c[result.reason] || c.failed);
        return;
      }
      toast.success(c.saved);
      router.refresh();
    } catch {
      toast.error(c.failed);
    } finally {
      setBusy(false);
    }
  };

  const handleCompleteSetup = async () => {
    if (!canComplete) return;
    setBusy(true);
    try {
      const result = await finishCompanySetupAction();
      if (!result.ok) {
        toast.error(c[result.reason] || c.failed);
        return;
      }
      toast.success(c.setupFinished);
      router.refresh();
    } catch {
      toast.error(c.failed);
    } finally {
      setBusy(false);
    }
  };

  const handleAssetUpload = async (key: string, title: string, file: File) => {
    const data = new FormData();
    data.set("key", key);
    data.set("title", title);
    data.set("file", file);

    setBusy(true);
    try {
      const res = await uploadCompanyAssetAction(data);
      if (!res.ok) {
        toast.error(c.assetUploadFailed);
        return;
      }
      if (key === "vat_certificate") {
        update({ vatCertificateUrl: res.value.fileUrl });
      }
      toast.success(c.assetUploaded);
      router.refresh();
    } catch {
      toast.error(c.assetUploadFailed);
    } finally {
      setBusy(false);
    }
  };

  const handleAssetRemove = async (key: string) => {
    setBusy(true);
    try {
      const res = await removeCompanyAssetAction(key);
      if (!res.ok) {
        toast.error(c.assetRemoveFailed);
        return;
      }
      toast.success(c.assetRemoved);
      router.refresh();
    } catch {
      toast.error(c.assetRemoveFailed);
    } finally {
      setBusy(false);
    }
  };

  if (!company) {
    return (
      <div className="it-card p-8 text-center text-ink-muted font-mono text-xs">
        {c.unavailable}
      </div>
    );
  }

  const governance: AdminAllowedSettings = {
    ...DEFAULT_ADMIN_ALLOWED,
    ...(formData.adminAllowedSettings ?? {}),
  };

  const toggleGov = (key: keyof AdminAllowedSettings) => {
    update({
      adminAllowedSettings: {
        ...governance,
        [key]: !governance[key],
      },
    });
  };

  const showFormSave = tab !== "appearance";

  return (
    <div className="space-y-4">
      <PageTitle title={c.title} description={c.description} />

      <div className="it-card flex flex-wrap items-center justify-between gap-3 p-2 font-mono text-xs">
        <label className="flex items-center gap-2">
          <span className="font-bold uppercase tracking-wider text-ink-muted">
            SECTION:
          </span>
          <select
            value={tab}
            onChange={(e) => setTab(e.target.value as Tab)}
            className="it-field-sunken font-bold text-xs"
          >
            <option value="profile">100 - {c.tabs.profile}</option>
            <option value="finance">200 - {c.tabs.finance}</option>
            <option value="sequences">300 - {c.tabs.sequences}</option>
            <option value="branding">400 - {c.tabs.branding}</option>
            <option value="appearance">500 - {c.tabs.appearance}</option>
            <option value="governance">600 - {c.tabs.governance}</option>
            <option value="setup">
              700 - {c.tabs.setup} {setupStatus?.complete ? "✔" : "⚠"}
            </option>
          </select>
        </label>
        <div className="flex items-center gap-2">
          {canEdit && showFormSave && (
            <button
              type="submit"
              form="company-form"
              disabled={busy}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-[#0070d2] hover:bg-[#005fb2] text-white text-xs font-semibold shadow-sm transition-colors"
            >
              {busy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              <span>{c.save}</span>
            </button>
          )}
        </div>
      </div>

      {tab === "appearance" ? (
        <CompanyThemeTab initialTheme={company.theme} canEdit={canEdit} />
      ) : (
        <form id="company-form" onSubmit={handleSave} className="space-y-4">
          <fieldset disabled={busy || !canEdit} className="space-y-4">
            {tab === "profile" && (
              <div className="it-card space-y-4">
                <div className="border-b border-slate-300 dark:border-slate-700 pb-2">
                  <h2 className="text-xs font-bold uppercase font-mono text-ink">
                    {c.sections.basicInfo}
                  </h2>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 text-xs">
                  <label className="block space-y-1">
                    <span className="font-bold text-ink-muted">{c.fields.companyNameEn}</span>
                    <input
                      required
                      value={formData.companyNameEn ?? ""}
                      onChange={(e) => update({ companyNameEn: e.target.value })}
                      className="it-field-sunken w-full"
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="font-bold text-ink-muted">{c.fields.companyNameAr}</span>
                    <input
                      required
                      dir="rtl"
                      value={formData.companyNameAr ?? ""}
                      onChange={(e) => update({ companyNameAr: e.target.value })}
                      className="it-field-sunken w-full"
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="font-bold text-ink-muted">{c.fields.taglineEn}</span>
                    <input
                      value={formData.taglineEn ?? ""}
                      onChange={(e) => update({ taglineEn: e.target.value })}
                      className="it-field-sunken w-full"
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="font-bold text-ink-muted">{c.fields.taglineAr}</span>
                    <input
                      dir="rtl"
                      value={formData.taglineAr ?? ""}
                      onChange={(e) => update({ taglineAr: e.target.value })}
                      className="it-field-sunken w-full"
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="font-bold text-ink-muted">{c.fields.crNumber}</span>
                    <input
                      value={formData.crNumber ?? ""}
                      onChange={(e) => update({ crNumber: e.target.value })}
                      className="it-field-sunken w-full font-mono"
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="font-bold text-ink-muted">{c.fields.businessActivity}</span>
                    <input
                      value={formData.businessActivity ?? ""}
                      onChange={(e) => update({ businessActivity: e.target.value })}
                      className="it-field-sunken w-full"
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="font-bold text-ink-muted">{c.fields.foundedYear}</span>
                    <input
                      type="number"
                      min={1800}
                      max={new Date().getFullYear()}
                      value={formData.foundedYear ?? ""}
                      onChange={(e) =>
                        update({
                          foundedYear: e.target.value ? parseInt(e.target.value, 10) : null,
                        })
                      }
                      className="it-field-sunken w-full font-mono"
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="font-bold text-ink-muted">{c.fields.timeZone}</span>
                    <input
                      dir="ltr"
                      value={formData.timeZone ?? "UTC"}
                      onChange={(e) => update({ timeZone: e.target.value })}
                      className="it-field-sunken w-full font-mono"
                    />
                  </label>
                  <div className="space-y-1">
                    <span className="font-bold text-ink-muted block">{c.fields.contentLanguages}</span>
                    <div className="flex items-center gap-4 pt-1">
                      {(["ar", "en"] as const).map((lang) => (
                        <label key={lang} className="inline-flex items-center gap-1.5 font-mono">
                          <input
                            type="checkbox"
                            checked={(formData.contentLanguages ?? ["ar", "en"]).includes(lang)}
                            onChange={() => toggleLanguage(lang)}
                          />
                          <span>{lang.toUpperCase()}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <label className="block space-y-1">
                    <span className="font-bold text-ink-muted">{c.fields.primaryLanguage}</span>
                    <select
                      value={formData.primaryLanguage ?? "ar"}
                      onChange={(e) => update({ primaryLanguage: e.target.value })}
                      className="it-field-sunken w-full font-mono"
                    >
                      {(formData.contentLanguages ?? ["ar", "en"]).map((lang) => (
                        <option key={lang} value={lang}>
                          {lang.toUpperCase()}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="border-b border-slate-300 dark:border-slate-700 pb-2 pt-2">
                  <h2 className="text-xs font-bold uppercase font-mono text-ink">
                    {c.sections.contactAddress}
                  </h2>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 text-xs">
                  <label className="block space-y-1">
                    <span className="font-bold text-ink-muted">{c.fields.email}</span>
                    <input
                      type="email"
                      dir="ltr"
                      value={formData.email ?? ""}
                      onChange={(e) => update({ email: e.target.value })}
                      className="it-field-sunken w-full"
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="font-bold text-ink-muted">{c.fields.phone}</span>
                    <input
                      type="tel"
                      dir="ltr"
                      value={formData.phone ?? ""}
                      onChange={(e) => update({ phone: e.target.value })}
                      className="it-field-sunken w-full font-mono"
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="font-bold text-ink-muted">{c.fields.whatsappPhone}</span>
                    <input
                      type="tel"
                      dir="ltr"
                      value={formData.whatsappPhone ?? ""}
                      onChange={(e) => update({ whatsappPhone: e.target.value })}
                      className="it-field-sunken w-full font-mono"
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="font-bold text-ink-muted">{c.fields.website}</span>
                    <input
                      type="url"
                      dir="ltr"
                      value={formData.website ?? ""}
                      onChange={(e) => update({ website: e.target.value })}
                      className="it-field-sunken w-full font-mono"
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="font-bold text-ink-muted">{c.fields.city}</span>
                    <input
                      value={formData.city ?? ""}
                      onChange={(e) => update({ city: e.target.value })}
                      className="it-field-sunken w-full"
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="font-bold text-ink-muted">{c.fields.country}</span>
                    <input
                      value={formData.country ?? ""}
                      onChange={(e) => update({ country: e.target.value })}
                      className="it-field-sunken w-full font-mono uppercase"
                    />
                  </label>
                  <label className="block space-y-1 sm:col-span-2">
                    <span className="font-bold text-ink-muted">{c.fields.addressEn}</span>
                    <input
                      value={formData.addressEn ?? ""}
                      onChange={(e) => update({ addressEn: e.target.value })}
                      className="it-field-sunken w-full"
                    />
                  </label>
                  <label className="block space-y-1 sm:col-span-2">
                    <span className="font-bold text-ink-muted">{c.fields.addressAr}</span>
                    <input
                      dir="rtl"
                      value={formData.addressAr ?? ""}
                      onChange={(e) => update({ addressAr: e.target.value })}
                      className="it-field-sunken w-full"
                    />
                  </label>
                  <label className="block space-y-1 sm:col-span-2">
                    <span className="font-bold text-ink-muted">{c.fields.mapUrl}</span>
                    <input
                      type="url"
                      dir="ltr"
                      value={formData.mapUrl ?? ""}
                      onChange={(e) => update({ mapUrl: e.target.value })}
                      className="it-field-sunken w-full font-mono"
                    />
                  </label>
                </div>

                <div className="border-b border-slate-300 dark:border-slate-700 pb-2 pt-2">
                  <h2 className="text-xs font-bold uppercase font-mono text-ink">
                    {c.sections.socialLinks}
                  </h2>
                </div>
                <div className="grid gap-3 sm:grid-cols-3 text-xs">
                  <label className="block space-y-1">
                    <span className="font-bold text-ink-muted">{c.socialPlatforms.instagram}</span>
                    <input
                      dir="ltr"
                      placeholder={c.socialPlaceholders.instagram}
                      value={formData.instagramUrl ?? ""}
                      onChange={(e) => update({ instagramUrl: e.target.value })}
                      className="it-field-sunken w-full font-mono"
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="font-bold text-ink-muted">{c.socialPlatforms.linkedin}</span>
                    <input
                      dir="ltr"
                      placeholder={c.socialPlaceholders.linkedin}
                      value={formData.linkedinUrl ?? ""}
                      onChange={(e) => update({ linkedinUrl: e.target.value })}
                      className="it-field-sunken w-full font-mono"
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="font-bold text-ink-muted">{c.socialPlatforms.youtube}</span>
                    <input
                      dir="ltr"
                      placeholder={c.socialPlaceholders.youtube}
                      value={formData.youtubeUrl ?? ""}
                      onChange={(e) => update({ youtubeUrl: e.target.value })}
                      className="it-field-sunken w-full font-mono"
                    />
                  </label>
                </div>
              </div>
            )}

            {tab === "finance" && (
              <div className="it-card space-y-4">
                <div className="border-b border-slate-300 dark:border-slate-700 pb-2">
                  <h2 className="text-xs font-bold uppercase font-mono text-ink">
                    {c.sections.vatTax}
                  </h2>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 text-xs">
                  <div className="sm:col-span-2 flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="vatEnabled"
                      checked={formData.vatEnabled ?? false}
                      onChange={(e) => update({ vatEnabled: e.target.checked })}
                      className="size-4"
                    />
                    <label htmlFor="vatEnabled" className="font-bold text-ink">
                      {c.fields.vatEnabled}
                    </label>
                  </div>
                  <label className="block space-y-1">
                    <span className="font-bold text-ink-muted">{c.fields.vatId}</span>
                    <input
                      value={formData.vatId ?? ""}
                      onChange={(e) => update({ vatId: e.target.value })}
                      className="it-field-sunken w-full font-mono"
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="font-bold text-ink-muted">{c.fields.vatPercentage}</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={formData.vatPercentage ?? "10.00"}
                      onChange={(e) => update({ vatPercentage: e.target.value })}
                      className="it-field-sunken w-full font-mono"
                    />
                  </label>
                  <div className="sm:col-span-2 space-y-1">
                    <span className="font-bold text-ink-muted block">{c.fields.vatCertificate}</span>
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        dir="ltr"
                        value={formData.vatCertificateUrl ?? ""}
                        onChange={(e) => update({ vatCertificateUrl: e.target.value })}
                        placeholder="/api/files/..."
                        className="it-field-sunken flex-1 min-w-[220px] font-mono"
                      />
                      {canEdit && (
                        <label className="it-btn-3d cursor-pointer px-3 py-1 font-bold inline-flex items-center gap-1.5">
                          <Upload className="size-3.5" />
                          <span>{c.uploadAsset}</span>
                          <input
                            type="file"
                            className="hidden"
                            accept="application/pdf,image/png,image/jpeg,image/webp"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) void handleAssetUpload("vat_certificate", "VAT Certificate", f);
                            }}
                          />
                        </label>
                      )}
                    </div>
                  </div>
                  <label className="block space-y-1 sm:col-span-2">
                    <span className="font-bold text-ink-muted">{c.fields.defaultCurrency}</span>
                    <div className="flex items-center gap-2">
                      <Select
                        disabled={company.currencyLocked}
                        value={formData.defaultCurrency ?? ""}
                        onChange={(e) =>
                          update({ defaultCurrency: e.target.value })
                        }
                        className="w-48"
                      >
                        {CURRENCY_CODES.map((code) => (
                          <option key={code} value={code}>
                            {code} · {getCurrencyLabel(code, locale === "ar")}
                          </option>
                        ))}
                      </Select>
                      {company.currencyLocked && (
                        <span className="flex items-center gap-1 text-[11px] font-mono text-amber-700 dark:text-amber-400">
                          <Lock className="h-3.5 w-3.5" />
                          {c.currencyLockedNotice}
                        </span>
                      )}
                    </div>
                  </label>
                  <label className="block space-y-1">
                    <span className="font-bold text-ink-muted">{c.fields.paymentTermsDays}</span>
                    <input
                      type="number"
                      min="0"
                      max="365"
                      value={formData.paymentTermsDays ?? 30}
                      onChange={(e) =>
                        update({ paymentTermsDays: parseInt(e.target.value, 10) || 0 })
                      }
                      className="it-field-sunken w-full font-mono"
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="font-bold text-ink-muted">{c.fields.defaultDiscountLimitPercent}</span>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={formData.defaultDiscountLimitPercent ?? "5.00"}
                      onChange={(e) => update({ defaultDiscountLimitPercent: e.target.value })}
                      className="it-field-sunken w-full font-mono"
                    />
                  </label>
                  <div className="sm:col-span-2 flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="quotationsAlwaysNeedApproval"
                      checked={formData.quotationsAlwaysNeedApproval ?? false}
                      onChange={(e) =>
                        update({ quotationsAlwaysNeedApproval: e.target.checked })
                      }
                      className="size-4"
                    />
                    <label htmlFor="quotationsAlwaysNeedApproval" className="font-bold text-ink">
                      {c.fields.quotationsAlwaysNeedApproval}
                    </label>
                  </div>
                </div>

                <div className="border-b border-slate-300 dark:border-slate-700 pb-2 pt-2">
                  <h2 className="text-xs font-bold uppercase font-mono text-ink">
                    {c.sections.bankDetails}
                  </h2>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 text-xs">
                  <label className="block space-y-1">
                    <span className="font-bold text-ink-muted">{c.fields.bankName}</span>
                    <input
                      value={formData.bankName ?? ""}
                      onChange={(e) => update({ bankName: e.target.value })}
                      className="it-field-sunken w-full"
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="font-bold text-ink-muted">{c.fields.bankAccountNumber}</span>
                    <input
                      dir="ltr"
                      value={formData.bankAccountNumber ?? ""}
                      onChange={(e) => update({ bankAccountNumber: e.target.value })}
                      className="it-field-sunken w-full font-mono"
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="font-bold text-ink-muted">{c.fields.bankIban}</span>
                    <input
                      dir="ltr"
                      value={formData.bankIban ?? ""}
                      onChange={(e) => update({ bankIban: e.target.value })}
                      className="it-field-sunken w-full font-mono uppercase"
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="font-bold text-ink-muted">{c.fields.bankSwift}</span>
                    <input
                      dir="ltr"
                      value={formData.bankSwift ?? ""}
                      onChange={(e) => update({ bankSwift: e.target.value })}
                      className="it-field-sunken w-full font-mono uppercase"
                    />
                  </label>
                </div>
              </div>
            )}

            {tab === "sequences" && (
              <div className="it-card space-y-4">
                <div className="border-b border-slate-300 dark:border-slate-700 pb-2">
                  <h2 className="text-xs font-bold uppercase font-mono text-ink">
                    {c.sections.documentSequences}
                  </h2>
                  <p className="text-[11px] text-ink-muted mt-0.5">{c.sections.sequencesHint}</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 text-xs">
                  <div className="p-3 border border-slate-300 dark:border-slate-700 bg-surface space-y-3">
                    <h3 className="font-bold uppercase font-mono text-ink">
                      {c.fields.invoiceSequence}
                    </h3>
                    <label className="block space-y-1">
                      <span className="font-bold text-ink-muted">{c.fields.prefix}</span>
                      <input
                        required
                        value={formData.invoicePrefix ?? "INV"}
                        onChange={(e) => update({ invoicePrefix: e.target.value })}
                        className="it-field-sunken w-full font-mono uppercase"
                      />
                    </label>
                    <label className="block space-y-1">
                      <span className="font-bold text-ink-muted">{c.fields.nextNumber}</span>
                      <input
                        type="number"
                        required
                        min={company.invoiceNextNumber}
                        value={formData.invoiceNextNumber ?? 1}
                        onChange={(e) =>
                          update({ invoiceNextNumber: parseInt(e.target.value, 10) || 1 })
                        }
                        className="it-field-sunken w-full font-mono"
                      />
                    </label>
                  </div>

                  <div className="p-3 border border-slate-300 dark:border-slate-700 bg-surface space-y-3">
                    <h3 className="font-bold uppercase font-mono text-ink">
                      {c.fields.receiptSequence}
                    </h3>
                    <label className="block space-y-1">
                      <span className="font-bold text-ink-muted">{c.fields.prefix}</span>
                      <input
                        required
                        value={formData.receiptPrefix ?? "RCT"}
                        onChange={(e) => update({ receiptPrefix: e.target.value })}
                        className="it-field-sunken w-full font-mono uppercase"
                      />
                    </label>
                    <label className="block space-y-1">
                      <span className="font-bold text-ink-muted">{c.fields.nextNumber}</span>
                      <input
                        type="number"
                        required
                        min={company.receiptNextNumber}
                        value={formData.receiptNextNumber ?? 1}
                        onChange={(e) =>
                          update({ receiptNextNumber: parseInt(e.target.value, 10) || 1 })
                        }
                        className="it-field-sunken w-full font-mono"
                      />
                    </label>
                  </div>
                </div>
              </div>
            )}

            {tab === "branding" && (
              <div className="it-card space-y-4">
                <div className="border-b border-slate-300 dark:border-slate-700 pb-2">
                  <h2 className="text-xs font-bold uppercase font-mono text-ink">
                    {c.sections.brandAssets}
                  </h2>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 text-xs">
                  {[
                    { key: "logo_light", title: c.assets.logoLight, hint: "PNG, SVG, WEBP" },
                    { key: "logo_dark", title: c.assets.logoDark, hint: "PNG, SVG, WEBP" },
                    { key: "full_logo_light", title: c.assets.fullLogoLight, hint: "PNG, SVG, WEBP" },
                    { key: "full_logo_dark", title: c.assets.fullLogoDark, hint: "PNG, SVG, WEBP" },
                    { key: "icon_light", title: c.assets.iconLight, hint: "PNG, SVG, ICO" },
                    { key: "icon_dark", title: c.assets.iconDark, hint: "PNG, SVG, ICO" },
                    { key: "letterhead_header", title: c.assets.letterheadHeader, hint: "PNG, WEBP" },
                    { key: "letterhead_footer", title: c.assets.letterheadFooter, hint: "PNG, WEBP" },
                    { key: "stamp", title: c.assets.stamp, hint: c.assets.privateStampHint },
                    { key: "signature", title: c.assets.signature, hint: c.assets.privateSignatureHint },
                  ].map(({ key, title, hint }) => {
                    const asset = assets.find((a) => a.assetKey === key);
                    return (
                      <div
                        key={key}
                        className="flex flex-col justify-between border border-slate-300 dark:border-slate-700 p-3 bg-surface space-y-3"
                      >
                        <div className="space-y-0.5">
                          <span className="font-bold font-mono text-ink">{title}</span>
                          <p className="text-[10px] text-ink-muted">{hint}</p>
                        </div>

                        {asset?.fileUrl ? (
                          <div className="space-y-2">
                            <div className="flex h-24 items-center justify-center border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2">
                              <img
                                src={asset.fileUrl}
                                alt={title}
                                className="max-h-full max-w-full object-contain"
                              />
                            </div>
                            {canEdit && (
                              <button
                                type="button"
                                onClick={() => handleAssetRemove(key)}
                                className="it-btn-3d w-full py-1 text-xs text-rose-700 dark:text-rose-400 font-bold flex items-center justify-center gap-1"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                <span>{c.removeAsset}</span>
                              </button>
                            )}
                          </div>
                        ) : (
                          <div>
                            {canEdit && (
                              <label className="flex cursor-pointer flex-col items-center justify-center border border-dashed border-slate-400 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/40 p-4 hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                                <Upload className="h-4 w-4 text-ink-muted" />
                                <span className="mt-1 text-[11px] font-mono text-ink-muted">
                                  {c.uploadAsset}
                                </span>
                                <input
                                  type="file"
                                  className="hidden"
                                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                                  onChange={(e) => {
                                    const f = e.target.files?.[0];
                                    if (f) void handleAssetUpload(key, title, f);
                                  }}
                                />
                              </label>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {tab === "governance" && (
              <div className="it-card space-y-5 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-300 dark:border-slate-700 pb-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="size-4 text-sky-600" />
                    <div>
                      <h2 className="font-bold uppercase font-mono text-ink">
                        {c.governance.title}
                      </h2>
                      <p className="text-[11px] text-ink-muted">{c.governance.subtitle}</p>
                    </div>
                  </div>
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => update({ adminAllowedSettings: { ...DEFAULT_ADMIN_ALLOWED } })}
                      className="it-btn-3d px-3 py-1 font-mono font-bold inline-flex items-center gap-1.5"
                    >
                      <RotateCcw className="size-3.5" />
                      <span>{c.governance.resetDefaults}</span>
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  <h3 className="font-bold font-mono uppercase text-amber-700 dark:text-amber-400">
                    {c.governance.itGroupTitle}
                  </h3>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {GOVERNANCE_IT_KEYS.map((key) => {
                      const allowed = governance[key];
                      const meta = c.governance.items[key];
                      return (
                        <div
                          key={key}
                          className="flex items-center justify-between gap-3 border border-slate-300 dark:border-slate-700 bg-surface p-3"
                        >
                          <div className="min-w-0">
                            <p className="font-bold text-ink">{meta.label}</p>
                            <p className="text-[11px] text-ink-muted">{meta.description}</p>
                          </div>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={allowed}
                            onClick={() => toggleGov(key)}
                            className={`it-btn-3d shrink-0 px-2.5 py-1 font-mono font-bold ${
                              allowed
                                ? "text-emerald-700 dark:text-emerald-400"
                                : "text-slate-500"
                            }`}
                          >
                            {allowed ? c.governance.allowed : c.governance.itOnly}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2 border-t border-slate-200 dark:border-slate-800 pt-4">
                  <h3 className="font-bold font-mono uppercase text-sky-700 dark:text-sky-400">
                    {c.governance.operationalGroupTitle}
                  </h3>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {GOVERNANCE_OPERATIONAL_KEYS.map((key) => {
                      const allowed = governance[key];
                      const meta = c.governance.items[key];
                      return (
                        <div
                          key={key}
                          className="flex items-center justify-between gap-3 border border-slate-300 dark:border-slate-700 bg-surface p-3"
                        >
                          <div className="min-w-0">
                            <p className="font-bold text-ink">{meta.label}</p>
                            <p className="text-[11px] text-ink-muted">{meta.description}</p>
                          </div>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={allowed}
                            onClick={() => toggleGov(key)}
                            className={`it-btn-3d shrink-0 px-2.5 py-1 font-mono font-bold ${
                              allowed
                                ? "text-emerald-700 dark:text-emerald-400"
                                : "text-slate-500"
                            }`}
                          >
                            {allowed ? c.governance.allowed : c.governance.itOnly}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {tab === "setup" && (
              <div className="it-card space-y-4 font-mono text-xs">
                <div className="border-b border-slate-300 dark:border-slate-700 pb-2">
                  <h2 className="text-xs font-bold uppercase text-ink">
                    {c.sections.setupStatus}
                  </h2>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 border border-slate-300 dark:border-slate-700 bg-surface">
                    {setupStatus?.complete ? (
                      <span className="text-emerald-700 dark:text-emerald-400 font-bold text-base">
                        [✔ COMPLETE]
                      </span>
                    ) : (
                      <span className="text-amber-700 dark:text-amber-400 font-bold text-base">
                        [⚠ INCOMPLETE]
                      </span>
                    )}
                    <div>
                      <h3 className="font-bold text-ink">
                        {setupStatus?.complete
                          ? c.setupCompletedTitle
                          : c.setupIncompleteTitle}
                      </h3>
                      <p className="text-[11px] text-ink-muted">
                        {company.setupCompletedAt
                          ? `${c.setupCompletedOn} ${date(company.setupCompletedAt)}`
                          : c.setupIncompleteNotice}
                      </p>
                    </div>
                  </div>

                  {!setupStatus?.complete && (setupStatus?.missing?.length ?? 0) > 0 && (
                    <div className="p-3 border border-amber-400 bg-amber-50 dark:bg-amber-950/40 space-y-2">
                      <span className="font-bold text-amber-800 dark:text-amber-300">
                        {c.missingFields}:
                      </span>
                      <ul className="list-disc list-inside text-amber-700 dark:text-amber-400 text-[11px]">
                        {setupStatus?.missing.map((f) => (
                          <li key={f}>{f}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {canComplete && !company.setupCompletedAt && (
                    <button
                      type="button"
                      onClick={handleCompleteSetup}
                      disabled={busy || !setupStatus?.complete}
                      className="it-btn-3d py-1.5 px-4 font-bold text-emerald-800 dark:text-emerald-300 disabled:opacity-50"
                    >
                      {c.markSetupComplete}
                    </button>
                  )}
                </div>
              </div>
            )}
          </fieldset>
        </form>
      )}
    </div>
  );
}

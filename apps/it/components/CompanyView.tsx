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
} from "lucide-react";
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

type Tab = "profile" | "finance" | "sequences" | "branding" | "setup";

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
  const { copy, date } = useCopy();
  const c = copy.company;
  const router = useRouter();

  const [tab, setTab] = React.useState<Tab>("profile");
  const [busy, setBusy] = React.useState(false);

  // Form state
  const [formData, setFormData] = React.useState<CompanyConfigurationPatch>(() => {
    if (!company) return {};
    return {
      companyNameEn: company.companyNameEn,
      companyNameAr: company.companyNameAr,
      crNumber: company.crNumber ?? "",
      vatId: company.vatId ?? "",
      vatEnabled: company.vatEnabled,
      vatPercentage: company.vatPercentage,
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
      invoicePrefix: company.invoicePrefix,
      invoiceNextNumber: company.invoiceNextNumber,
      receiptPrefix: company.receiptPrefix,
      receiptNextNumber: company.receiptNextNumber,
      primaryLanguage: company.primaryLanguage,
      contentLanguages: company.contentLanguages,
      businessActivity: company.businessActivity ?? "services",
      taglineEn: company.taglineEn ?? "",
      taglineAr: company.taglineAr ?? "",
      city: company.city ?? "",
      country: company.country ?? "BH",
    };
  });

  const update = (patch: Partial<CompanyConfigurationPatch>) => {
    setFormData((prev) => ({ ...prev, ...patch }));
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

  return (
    <div className="space-y-4">
      <PageTitle title={c.title} description={c.description} />

      {/* SAP Style Section Selector Dropdown Bar */}
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
            <option value="setup">
              500 - {c.tabs.setup} {setupStatus?.complete ? "✔" : "⚠"}
            </option>
          </select>
        </label>
        <div className="flex items-center gap-2">
          <span className="it-status-pane font-bold text-amber-700 dark:text-amber-400">
            T-CODE: OBY6 [COMPANY MASTER DATA]
          </span>
          {canEdit && (
            <button
              type="submit"
              form="company-form"
              disabled={busy}
              className="it-btn-3d py-1 px-3 text-emerald-800 dark:text-emerald-300 font-bold flex items-center gap-1.5"
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
                <label className="block space-y-1 sm:col-span-2">
                  <span className="font-bold text-ink-muted">{c.fields.defaultCurrency}</span>
                  <div className="flex items-center gap-2">
                    <input
                      disabled={company.currencyLocked}
                      value={formData.defaultCurrency ?? ""}
                      onChange={(e) =>
                        update({ defaultCurrency: e.target.value.toUpperCase() })
                      }
                      className="it-field-sunken w-32 font-mono uppercase"
                    />
                    {company.currencyLocked && (
                      <span className="flex items-center gap-1 text-[11px] font-mono text-amber-700 dark:text-amber-400">
                        <Lock className="h-3.5 w-3.5" />
                        {c.currencyLockedNotice}
                      </span>
                    )}
                  </div>
                </label>
                <label className="block space-y-1 sm:col-span-2">
                  <span className="font-bold text-ink-muted">{c.fields.paymentTermsDays}</span>
                  <input
                    type="number"
                    min="0"
                    max="365"
                    value={formData.paymentTermsDays ?? 30}
                    onChange={(e) =>
                      update({ paymentTermsDays: parseInt(e.target.value, 10) || 0 })
                    }
                    className="it-field-sunken w-32 font-mono"
                  />
                </label>
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
                  { key: "icon_light", title: c.assets.iconLight, hint: "PNG, SVG, ICO" },
                  { key: "icon_dark", title: c.assets.iconDark, hint: "PNG, SVG, ICO" },
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
                            {/* eslint-disable-next-line @next/next/no-img-element */}
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
    </div>
  );
}

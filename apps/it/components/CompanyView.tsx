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
import { Button, Card, Input } from "@platform/ui";
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
      timeZone: company.timeZone ?? "Asia/Bahrain",
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
      <Card className="rounded-3xl border border-outline-variant p-8 text-center text-ink-muted">
        {c.unavailable}
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageTitle title={c.title} description={c.description} />
        {canEdit && (
          <Button
            type="submit"
            form="company-form"
            disabled={busy}
            className="flex items-center gap-2"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            <span>{c.save}</span>
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-outline-variant pb-2">
        <button
          type="button"
          onClick={() => setTab("profile")}
          className={`flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium transition ${
            tab === "profile"
              ? "bg-primary text-primary-contrast"
              : "bg-surface text-ink hover:bg-surface-variant"
          }`}
        >
          <Building2 className="h-4 w-4" />
          <span>{c.tabs.profile}</span>
        </button>
        <button
          type="button"
          onClick={() => setTab("finance")}
          className={`flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium transition ${
            tab === "finance"
              ? "bg-primary text-primary-contrast"
              : "bg-surface text-ink hover:bg-surface-variant"
          }`}
        >
          <Receipt className="h-4 w-4" />
          <span>{c.tabs.finance}</span>
        </button>
        <button
          type="button"
          onClick={() => setTab("sequences")}
          className={`flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium transition ${
            tab === "sequences"
              ? "bg-primary text-primary-contrast"
              : "bg-surface text-ink hover:bg-surface-variant"
          }`}
        >
          <FileText className="h-4 w-4" />
          <span>{c.tabs.sequences}</span>
        </button>
        <button
          type="button"
          onClick={() => setTab("branding")}
          className={`flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium transition ${
            tab === "branding"
              ? "bg-primary text-primary-contrast"
              : "bg-surface text-ink hover:bg-surface-variant"
          }`}
        >
          <Palette className="h-4 w-4" />
          <span>{c.tabs.branding}</span>
        </button>
        <button
          type="button"
          onClick={() => setTab("setup")}
          className={`flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium transition ${
            tab === "setup"
              ? "bg-primary text-primary-contrast"
              : "bg-surface text-ink hover:bg-surface-variant"
          }`}
        >
          {setupStatus?.complete ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          ) : (
            <AlertCircle className="h-4 w-4 text-amber-500" />
          )}
          <span>{c.tabs.setup}</span>
        </button>
      </div>

      <form id="company-form" onSubmit={handleSave} className="space-y-6">
        <fieldset disabled={busy || !canEdit} className="space-y-6">
          {tab === "profile" && (
            <Card className="rounded-3xl border border-outline-variant p-6 space-y-6">
              <h2 className="text-base font-semibold">{c.sections.basicInfo}</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block space-y-1 text-sm">
                  <span>{c.fields.companyNameEn}</span>
                  <Input
                    required
                    value={formData.companyNameEn ?? ""}
                    onChange={(e) => update({ companyNameEn: e.target.value })}
                  />
                </label>
                <label className="block space-y-1 text-sm">
                  <span>{c.fields.companyNameAr}</span>
                  <Input
                    required
                    dir="rtl"
                    value={formData.companyNameAr ?? ""}
                    onChange={(e) => update({ companyNameAr: e.target.value })}
                  />
                </label>
                <label className="block space-y-1 text-sm">
                  <span>{c.fields.taglineEn}</span>
                  <Input
                    value={formData.taglineEn ?? ""}
                    onChange={(e) => update({ taglineEn: e.target.value })}
                  />
                </label>
                <label className="block space-y-1 text-sm">
                  <span>{c.fields.taglineAr}</span>
                  <Input
                    dir="rtl"
                    value={formData.taglineAr ?? ""}
                    onChange={(e) => update({ taglineAr: e.target.value })}
                  />
                </label>
                <label className="block space-y-1 text-sm">
                  <span>{c.fields.crNumber}</span>
                  <Input
                    value={formData.crNumber ?? ""}
                    onChange={(e) => update({ crNumber: e.target.value })}
                  />
                </label>
                <label className="block space-y-1 text-sm">
                  <span>{c.fields.businessActivity}</span>
                  <Input
                    value={formData.businessActivity ?? ""}
                    onChange={(e) => update({ businessActivity: e.target.value })}
                  />
                </label>
              </div>

              <h2 className="text-base font-semibold pt-4 border-t border-outline-variant">
                {c.sections.contactAddress}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block space-y-1 text-sm">
                  <span>{c.fields.email}</span>
                  <Input
                    type="email"
                    dir="ltr"
                    value={formData.email ?? ""}
                    onChange={(e) => update({ email: e.target.value })}
                  />
                </label>
                <label className="block space-y-1 text-sm">
                  <span>{c.fields.phone}</span>
                  <Input
                    type="tel"
                    dir="ltr"
                    value={formData.phone ?? ""}
                    onChange={(e) => update({ phone: e.target.value })}
                  />
                </label>
                <label className="block space-y-1 text-sm">
                  <span>{c.fields.whatsappPhone}</span>
                  <Input
                    type="tel"
                    dir="ltr"
                    value={formData.whatsappPhone ?? ""}
                    onChange={(e) => update({ whatsappPhone: e.target.value })}
                  />
                </label>
                <label className="block space-y-1 text-sm">
                  <span>{c.fields.website}</span>
                  <Input
                    type="url"
                    dir="ltr"
                    value={formData.website ?? ""}
                    onChange={(e) => update({ website: e.target.value })}
                  />
                </label>
                <label className="block space-y-1 text-sm">
                  <span>{c.fields.city}</span>
                  <Input
                    value={formData.city ?? ""}
                    onChange={(e) => update({ city: e.target.value })}
                  />
                </label>
                <label className="block space-y-1 text-sm">
                  <span>{c.fields.country}</span>
                  <Input
                    value={formData.country ?? ""}
                    onChange={(e) => update({ country: e.target.value })}
                  />
                </label>
                <label className="block space-y-1 text-sm sm:col-span-2">
                  <span>{c.fields.addressEn}</span>
                  <Input
                    value={formData.addressEn ?? ""}
                    onChange={(e) => update({ addressEn: e.target.value })}
                  />
                </label>
                <label className="block space-y-1 text-sm sm:col-span-2">
                  <span>{c.fields.addressAr}</span>
                  <Input
                    dir="rtl"
                    value={formData.addressAr ?? ""}
                    onChange={(e) => update({ addressAr: e.target.value })}
                  />
                </label>
              </div>

              <h2 className="text-base font-semibold pt-4 border-t border-outline-variant">
                {c.sections.socialLinks}
              </h2>
              <div className="grid gap-4 sm:grid-cols-3">
                <label className="block space-y-1 text-sm">
                  <span>Instagram</span>
                  <Input
                    dir="ltr"
                    placeholder="https://instagram.com/..."
                    value={formData.instagramUrl ?? ""}
                    onChange={(e) => update({ instagramUrl: e.target.value })}
                  />
                </label>
                <label className="block space-y-1 text-sm">
                  <span>LinkedIn</span>
                  <Input
                    dir="ltr"
                    placeholder="https://linkedin.com/company/..."
                    value={formData.linkedinUrl ?? ""}
                    onChange={(e) => update({ linkedinUrl: e.target.value })}
                  />
                </label>
                <label className="block space-y-1 text-sm">
                  <span>YouTube</span>
                  <Input
                    dir="ltr"
                    placeholder="https://youtube.com/@..."
                    value={formData.youtubeUrl ?? ""}
                    onChange={(e) => update({ youtubeUrl: e.target.value })}
                  />
                </label>
              </div>
            </Card>
          )}

          {tab === "finance" && (
            <Card className="rounded-3xl border border-outline-variant p-6 space-y-6">
              <h2 className="text-base font-semibold">{c.sections.vatTax}</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2 flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="vatEnabled"
                    checked={formData.vatEnabled ?? false}
                    onChange={(e) => update({ vatEnabled: e.target.checked })}
                    className="h-4 w-4 rounded border-outline-variant text-primary focus:ring-primary"
                  />
                  <label htmlFor="vatEnabled" className="text-sm font-medium">
                    {c.fields.vatEnabled}
                  </label>
                </div>
                <label className="block space-y-1 text-sm">
                  <span>{c.fields.vatId}</span>
                  <Input
                    value={formData.vatId ?? ""}
                    onChange={(e) => update({ vatId: e.target.value })}
                  />
                </label>
                <label className="block space-y-1 text-sm">
                  <span>{c.fields.vatPercentage}</span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formData.vatPercentage ?? "10.00"}
                    onChange={(e) => update({ vatPercentage: e.target.value })}
                  />
                </label>
                <label className="block space-y-1 text-sm sm:col-span-2">
                  <span>{c.fields.defaultCurrency}</span>
                  <div className="flex items-center gap-2">
                    <Input
                      disabled={company.currencyLocked}
                      value={formData.defaultCurrency ?? "BHD"}
                      onChange={(e) =>
                        update({ defaultCurrency: e.target.value.toUpperCase() })
                      }
                      className="max-w-[200px]"
                    />
                    {company.currencyLocked && (
                      <span className="flex items-center gap-1 text-xs text-ink-muted">
                        <Lock className="h-3.5 w-3.5" />
                        {c.currencyLockedNotice}
                      </span>
                    )}
                  </div>
                </label>
                <label className="block space-y-1 text-sm sm:col-span-2">
                  <span>{c.fields.paymentTermsDays}</span>
                  <Input
                    type="number"
                    min="0"
                    max="365"
                    value={formData.paymentTermsDays ?? 30}
                    onChange={(e) =>
                      update({ paymentTermsDays: parseInt(e.target.value, 10) || 0 })
                    }
                    className="max-w-[200px]"
                  />
                </label>
              </div>

              <h2 className="text-base font-semibold pt-4 border-t border-outline-variant">
                {c.sections.bankDetails}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block space-y-1 text-sm">
                  <span>{c.fields.bankName}</span>
                  <Input
                    value={formData.bankName ?? ""}
                    onChange={(e) => update({ bankName: e.target.value })}
                  />
                </label>
                <label className="block space-y-1 text-sm">
                  <span>{c.fields.bankAccountNumber}</span>
                  <Input
                    dir="ltr"
                    value={formData.bankAccountNumber ?? ""}
                    onChange={(e) => update({ bankAccountNumber: e.target.value })}
                  />
                </label>
                <label className="block space-y-1 text-sm">
                  <span>{c.fields.bankIban}</span>
                  <Input
                    dir="ltr"
                    value={formData.bankIban ?? ""}
                    onChange={(e) => update({ bankIban: e.target.value })}
                  />
                </label>
                <label className="block space-y-1 text-sm">
                  <span>{c.fields.bankSwift}</span>
                  <Input
                    dir="ltr"
                    value={formData.bankSwift ?? ""}
                    onChange={(e) => update({ bankSwift: e.target.value })}
                  />
                </label>
              </div>
            </Card>
          )}

          {tab === "sequences" && (
            <Card className="rounded-3xl border border-outline-variant p-6 space-y-6">
              <h2 className="text-base font-semibold">{c.sections.documentSequences}</h2>
              <p className="text-xs text-ink-muted">{c.sections.sequencesHint}</p>
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-4 rounded-2xl border border-outline-variant p-4">
                  <h3 className="text-sm font-semibold">{c.fields.invoiceSequence}</h3>
                  <label className="block space-y-1 text-sm">
                    <span>{c.fields.prefix}</span>
                    <Input
                      required
                      value={formData.invoicePrefix ?? "INV"}
                      onChange={(e) => update({ invoicePrefix: e.target.value })}
                    />
                  </label>
                  <label className="block space-y-1 text-sm">
                    <span>{c.fields.nextNumber}</span>
                    <Input
                      type="number"
                      required
                      min={company.invoiceNextNumber}
                      value={formData.invoiceNextNumber ?? 1}
                      onChange={(e) =>
                        update({ invoiceNextNumber: parseInt(e.target.value, 10) || 1 })
                      }
                    />
                  </label>
                </div>

                <div className="space-y-4 rounded-2xl border border-outline-variant p-4">
                  <h3 className="text-sm font-semibold">{c.fields.receiptSequence}</h3>
                  <label className="block space-y-1 text-sm">
                    <span>{c.fields.prefix}</span>
                    <Input
                      required
                      value={formData.receiptPrefix ?? "RCT"}
                      onChange={(e) => update({ receiptPrefix: e.target.value })}
                    />
                  </label>
                  <label className="block space-y-1 text-sm">
                    <span>{c.fields.nextNumber}</span>
                    <Input
                      type="number"
                      required
                      min={company.receiptNextNumber}
                      value={formData.receiptNextNumber ?? 1}
                      onChange={(e) =>
                        update({ receiptNextNumber: parseInt(e.target.value, 10) || 1 })
                      }
                    />
                  </label>
                </div>
              </div>
            </Card>
          )}

          {tab === "branding" && (
            <Card className="rounded-3xl border border-outline-variant p-6 space-y-6">
              <h2 className="text-base font-semibold">{c.sections.brandAssets}</h2>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
                      className="flex flex-col justify-between rounded-2xl border border-outline-variant p-4 space-y-3"
                    >
                      <div className="space-y-1">
                        <span className="text-sm font-semibold">{title}</span>
                        <p className="text-xs text-ink-muted">{hint}</p>
                      </div>

                      {asset?.fileUrl ? (
                        <div className="space-y-2">
                          <div className="flex h-24 items-center justify-center rounded-xl bg-surface-variant p-2">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={asset.fileUrl}
                              alt={title}
                              className="max-h-full max-w-full object-contain"
                            />
                          </div>
                          {canEdit && (
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => handleAssetRemove(key)}
                              className="w-full text-xs text-red-600 flex items-center justify-center gap-1"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              <span>{c.removeAsset}</span>
                            </Button>
                          )}
                        </div>
                      ) : (
                        <div>
                          {canEdit && (
                            <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-outline-variant bg-surface p-4 hover:bg-surface-variant transition">
                              <Upload className="h-5 w-5 text-ink-muted" />
                              <span className="mt-1 text-xs text-ink-muted">
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
            </Card>
          )}

          {tab === "setup" && (
            <Card className="rounded-3xl border border-outline-variant p-6 space-y-6">
              <h2 className="text-base font-semibold">{c.sections.setupStatus}</h2>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  {setupStatus?.complete ? (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                      <CheckCircle2 className="h-6 w-6" />
                    </div>
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                      <AlertCircle className="h-6 w-6" />
                    </div>
                  )}
                  <div>
                    <h3 className="text-sm font-semibold">
                      {setupStatus?.complete
                        ? c.setupCompletedTitle
                        : c.setupIncompleteTitle}
                    </h3>
                    <p className="text-xs text-ink-muted">
                      {company.setupCompletedAt
                        ? `${c.setupCompletedOn} ${date(company.setupCompletedAt)}`
                        : c.setupIncompleteNotice}
                    </p>
                  </div>
                </div>

                {!setupStatus?.complete && (setupStatus?.missing?.length ?? 0) > 0 && (
                  <div className="rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 p-4 border border-amber-200 dark:border-amber-900/50 space-y-2">
                    <span className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                      {c.missingFields}:
                    </span>
                    <ul className="list-disc list-inside text-xs text-amber-700 dark:text-amber-400">
                      {setupStatus?.missing.map((f) => (
                        <li key={f}>{f}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {canComplete && !company.setupCompletedAt && (
                  <Button
                    type="button"
                    onClick={handleCompleteSetup}
                    disabled={busy || !setupStatus?.complete}
                    className="mt-4"
                  >
                    {c.markSetupComplete}
                  </Button>
                )}
              </div>
            </Card>
          )}
        </fieldset>
      </form>
    </div>
  );
}

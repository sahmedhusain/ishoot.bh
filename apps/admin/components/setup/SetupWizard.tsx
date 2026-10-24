"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Building2, Palette, Image as ImageIcon, SlidersHorizontal, ClipboardCheck, Check, Upload, Trash2, Globe } from "lucide-react";
import { Button, Card, Input, Select } from "@platform/ui";
import { formatMessage } from "@platform/locales";
import { getCurrencyLabel } from "@platform/config/currency";
import { SUPPORTED_CURRENCIES } from "@platform/database/constants/finance";
import type { BrandTheme } from "@platform/database/constants/theme";
import type { SupportedCurrency } from "@platform/database/types";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { uploadFileDirectly } from "../../lib/upload-client";
import { errorMessage } from "../../lib/error-text";
import { saveCompanyAssetAction, deleteCompanyAssetAction } from "../../app/actions/settings";
import { saveSetupCompanyAction, saveSetupThemeAction, saveSetupConfigAction, completeSetupAction, type SetupCompanyInput, type SetupConfigInput } from "../../app/actions/setup";
import { ContentImage } from "../shared/ContentImage";
import { ThemeEditor } from "./ThemeEditor";

export type AssetSlot = "logo_light" | "logo_dark" | "icon_light" | "icon_dark" | "stamp" | "signature";

export interface SetupWizardProps {
  company: SetupCompanyInput;
  theme: BrandTheme;
  assets: Record<AssetSlot, string>;
  config: SetupConfigInput;
  modules: { moduleKey: string; nameEn: string; nameAr: string }[];
}

const STEPS = ["company", "brand", "assets", "configuration", "review"] as const;
type Step = (typeof STEPS)[number];
const ICONS: Record<Step, React.ComponentType<{ className?: string }>> = {
  company: Building2,
  brand: Palette,
  assets: ImageIcon,
  configuration: SlidersHorizontal,
  review: ClipboardCheck,
};
const ASSET_SLOTS: { key: AssetSlot; label: "logo" | "darkLogo" | "icon" | "darkIcon" | "stamp" | "signature"; dark?: boolean }[] = [
  { key: "logo_light", label: "logo" },
  { key: "logo_dark", label: "darkLogo", dark: true },
  { key: "icon_light", label: "icon" },
  { key: "icon_dark", label: "darkIcon", dark: true },
  { key: "stamp", label: "stamp" },
  { key: "signature", label: "signature" },
];

function Field({ label, children, wide }: { label: string; children: (id: string) => React.ReactNode; wide?: boolean }) {
  const id = React.useId();
  return (
    <div className={`space-y-1.5 ${wide ? "sm:col-span-2" : ""}`}>
      <label htmlFor={id} className="text-xs font-medium text-slate-700 dark:text-slate-300">{label}</label>
      {children(id)}
    </div>
  );
}

export function SetupWizard(props: SetupWizardProps) {
  const router = useRouter();
  const { t, locale, setLocale } = useAdminLocale();
  const copy = t.setupWizard;
  const [step, setStep] = React.useState<Step>("company");
  const [company, setCompany] = React.useState(props.company);
  const [theme, setTheme] = React.useState(props.theme);
  const [assets, setAssets] = React.useState(props.assets);
  const [config, setConfig] = React.useState(props.config);
  const [saving, setSaving] = React.useState(false);
  const [uploading, setUploading] = React.useState<AssetSlot | null>(null);
  const [error, setError] = React.useState("");
  const index = STEPS.indexOf(step);
  const headingRef = React.useRef<HTMLHeadingElement>(null);

  React.useEffect(() => headingRef.current?.focus(), [step]);

  const go = (next: Step) => {
    setError("");
    setStep(next);
  };

  const run = async (task: () => Promise<unknown>, next?: Step) => {
    setSaving(true);
    setError("");
    try {
      await task();
      if (next) go(next);
    } catch (err) {
      setError(errorMessage(err, t));
    } finally {
      setSaving(false);
    }
  };

  const saveStep = () => {
    const next = STEPS[index + 1];
    if (step === "company") {
      if (!company.companyNameEn.trim() || !company.companyNameAr.trim()) return setError(copy.company.required);
      return run(() => saveSetupCompanyAction(company), next);
    }
    if (step === "brand") return run(() => saveSetupThemeAction(theme), next);
    if (step === "assets") {
      if (!assets.logo_light && !assets.logo_dark) return setError(copy.assets.logoRequired);
      return go(next);
    }
    if (step === "configuration") return run(() => saveSetupConfigAction(config), next);
    return run(async () => {
      await completeSetupAction();
      router.replace("/dashboard");
      router.refresh();
    });
  };

  const uploadAsset = async (slot: AssetSlot, file: File) => {
    setUploading(slot);
    setError("");
    try {
      const data = await uploadFileDirectly(file, { entityType: "company_asset", entityId: slot, customName: `${slot}-${file.name}`, documentType: "branding_asset" });
      if (!data.success) throw new Error(data.error);
      const result = await saveCompanyAssetAction(slot, { title: copy.assets[ASSET_SLOTS.find((s) => s.key === slot)!.label], fileUrl: data.fileUrl, mimeType: file.type, fileSize: file.size });
      if (result.success) setAssets((current) => ({ ...current, [slot]: data.fileUrl }));
    } catch (err) {
      setError(errorMessage(err, t));
    } finally {
      setUploading(null);
    }
  };

  const removeAsset = async (slot: AssetSlot) => {
    setError("");
    try {
      await deleteCompanyAssetAction(slot);
      setAssets((current) => ({ ...current, [slot]: "" }));
    } catch (err) {
      setError(errorMessage(err, t));
    }
  };

  const companyFields: { key: keyof SetupCompanyInput; label: string; dir?: "ltr" | "rtl"; type?: string; wide?: boolean }[] = [
    { key: "companyNameEn", label: copy.company.nameEn, dir: "ltr" },
    { key: "companyNameAr", label: copy.company.nameAr, dir: "rtl" },
    { key: "crNumber", label: copy.company.crNumber, dir: "ltr" },
    { key: "vatId", label: copy.company.vatId, dir: "ltr" },
    { key: "addressEn", label: copy.company.addressEn, dir: "ltr", wide: true },
    { key: "addressAr", label: copy.company.addressAr, dir: "rtl", wide: true },
    { key: "phone", label: copy.company.phone, dir: "ltr", type: "tel" },
    { key: "email", label: copy.company.email, dir: "ltr", type: "email" },
    { key: "website", label: copy.company.website, dir: "ltr", type: "url", wide: true },
  ];

  const sampleNumber = (prefix: string, next: number) => `${prefix || "INV"}-${new Date().getFullYear()}-${String(next || 1).padStart(4, "0")}`;
  const moduleName = (m: SetupWizardProps["modules"][number]) => (locale === "ar" ? m.nameAr : m.nameEn);
  const enabled = (key: string) => config.modules.find((m) => m.moduleKey === key)?.isEnabled ?? true;

  return (
    <div className="min-h-screen bg-brand-base px-4 py-8 sm:px-6 lg:py-12">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white font-display">{copy.title}</h1>
            <p className="max-w-2xl text-sm text-slate-600 dark:text-ink-muted">{copy.subtitle}</p>
          </div>
          <button
            type="button"
            onClick={() => setLocale(locale === "ar" ? "en" : "ar")}
            className="inline-flex items-center gap-2 whitespace-nowrap rounded-xl border border-ink/15 px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-accent dark:text-slate-200"
          >
            <Globe className="h-3.5 w-3.5 text-accent" />
            {t.loginView.switchLanguage}
          </button>
        </header>

        <nav aria-label={copy.title}>
          <ol className="grid grid-cols-5 gap-2">
            {STEPS.map((s, i) => {
              const Icon = ICONS[s];
              const done = i < index;
              const current = s === step;
              return (
                <li key={s}>
                  <button
                    type="button"
                    disabled={i > index}
                    aria-current={current ? "step" : undefined}
                    aria-label={copy.steps[s]}
                    onClick={() => i < index && go(s)}
                    className={`flex w-full flex-col items-center gap-2 rounded-xl border p-3 text-center transition-colors sm:flex-row sm:text-start ${current ? "border-accent bg-accent/10" : done ? "border-ink/15 hover:border-accent/50" : "border-ink/10 opacity-60"}`}
                  >
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${done ? "bg-accent text-accent-foreground" : current ? "bg-primary text-primary-foreground" : "bg-ink/10 text-slate-500"}`}>
                      {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                    </span>
                    <span className="hidden text-xs font-semibold text-slate-800 dark:text-slate-100 sm:block">{copy.steps[s]}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        <Card className="space-y-6 rounded-2xl border border-ink/15 bg-white p-5 shadow-xs dark:bg-surface sm:p-8">
          <div className="space-y-1 border-b border-ink/10 pb-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-accent">{formatMessage(copy.stepOf, { current: index + 1, total: STEPS.length })}</p>
            <h2 ref={headingRef} tabIndex={-1} className="text-lg font-bold text-slate-900 outline-none dark:text-white">{copy.steps[step]}</h2>
            <p className="text-sm text-slate-600 dark:text-ink-muted">{copy.stepDescriptions[step]}</p>
          </div>

          {step === "company" ? (
            <div className="grid gap-5 sm:grid-cols-2">
              {companyFields.map((field) => (
                <Field key={field.key} label={field.label} wide={field.wide}>
                  {(id) => (
                    <Input
                      id={id}
                      name={field.key}
                      dir={field.dir}
                      type={field.type ?? "text"}
                      required={field.key === "companyNameEn" || field.key === "companyNameAr"}
                      value={company[field.key] ?? ""}
                      onChange={(e) => setCompany({ ...company, [field.key]: e.target.value })}
                      className="rounded-lg"
                    />
                  )}
                </Field>
              ))}
            </div>
          ) : null}

          {step === "brand" ? <ThemeEditor theme={theme} onChange={setTheme} /> : null}

          {step === "assets" ? (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {ASSET_SLOTS.map((slot) => {
                const url = assets[slot.key];
                const inputId = `asset-${slot.key}`;
                return (
                  <li key={slot.key} className="flex flex-col gap-3 rounded-xl border border-ink/15 p-4" data-testid={`asset-${slot.key}`}>
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{copy.assets[slot.label]}</p>
                      <p className="text-xs text-slate-500 dark:text-ink-muted">{copy.assets[`${slot.label}Hint`]}</p>
                    </div>
                    <div className={`flex h-24 items-center justify-center rounded-lg ${slot.dark ? "bg-slate-900" : "bg-slate-50"}`}>
                      {url ? <ContentImage src={url} alt={copy.assets[slot.label]} width={200} height={80} className="max-h-16 w-auto object-contain" /> : <ImageIcon className="h-6 w-6 text-slate-400" />}
                    </div>
                    <div className="flex gap-2">
                      <label htmlFor={inputId} className={`inline-flex h-9 flex-1 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-ink/20 px-3 text-xs font-semibold text-slate-700 hover:border-accent hover:text-accent dark:text-slate-200 ${uploading ? "pointer-events-none opacity-50" : ""}`}>
                        <Upload className="h-3.5 w-3.5" />
                        {uploading === slot.key ? copy.assets.uploading : url ? copy.assets.replace : copy.assets.upload}
                      </label>
                      <input
                        id={inputId}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="sr-only"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          e.target.value = "";
                          if (file) uploadAsset(slot.key, file);
                        }}
                      />
                      {url ? (
                        <button type="button" onClick={() => removeAsset(slot.key)} aria-label={`${copy.assets.remove} ${copy.assets[slot.label]}`} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-ink/20 text-slate-500 hover:border-rose-400 hover:text-rose-500">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : null}

          {step === "configuration" ? (
            <div className="space-y-8">
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                <Field label={copy.configuration.currency}>
                  {(id) => (
                    <Select id={id} value={config.defaultCurrency} onChange={(e) => setConfig({ ...config, defaultCurrency: e.target.value as SupportedCurrency })} className="rounded-lg">
                      {SUPPORTED_CURRENCIES.map((code) => <option key={code} value={code}>{`${code} · ${getCurrencyLabel(code, locale === "ar", false)}`}</option>)}
                    </Select>
                  )}
                </Field>
                <Field label={copy.configuration.paymentTerms}>
                  {(id) => <Input id={id} type="number" min={0} max={365} value={config.paymentTermsDays} onChange={(e) => setConfig({ ...config, paymentTermsDays: Number(e.target.value) })} className="rounded-lg" />}
                </Field>
                <div className="space-y-1.5">
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{copy.configuration.vatEnabled}</span>
                  <label className="flex h-11 items-center gap-3 rounded-lg border border-ink/20 px-3 text-sm text-slate-700 dark:text-slate-200">
                    <input type="checkbox" className="h-4 w-4 accent-accent" checked={config.vatEnabled} onChange={(e) => setConfig({ ...config, vatEnabled: e.target.checked })} />
                    {copy.configuration.vatEnabled}
                  </label>
                </div>
                {config.vatEnabled ? (
                  <Field label={copy.configuration.vatPercentage}>
                    {(id) => <Input id={id} type="number" min={0} max={100} step="0.01" value={config.vatPercentage} onChange={(e) => setConfig({ ...config, vatPercentage: Number(e.target.value) })} className="rounded-lg" />}
                  </Field>
                ) : null}
                {config.vatEnabled && !company.vatId?.trim() ? (
                  <p className="text-xs text-amber-700 dark:text-amber-300 sm:col-span-2 lg:col-span-3">{copy.configuration.vatNeedsId}</p>
                ) : null}
              </div>

              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                <Field label={copy.configuration.invoicePrefix}>
                  {(id) => <Input id={id} dir="ltr" maxLength={10} value={config.invoicePrefix} onChange={(e) => setConfig({ ...config, invoicePrefix: e.target.value.toUpperCase() })} className="rounded-lg font-mono" />}
                </Field>
                <Field label={copy.configuration.invoiceNextNumber}>
                  {(id) => <Input id={id} type="number" min={1} value={config.invoiceNextNumber} onChange={(e) => setConfig({ ...config, invoiceNextNumber: Number(e.target.value) })} className="rounded-lg" />}
                </Field>
                <Field label={copy.configuration.receiptPrefix}>
                  {(id) => <Input id={id} dir="ltr" maxLength={10} value={config.receiptPrefix} onChange={(e) => setConfig({ ...config, receiptPrefix: e.target.value.toUpperCase() })} className="rounded-lg font-mono" />}
                </Field>
                <Field label={copy.configuration.receiptNextNumber}>
                  {(id) => <Input id={id} type="number" min={1} value={config.receiptNextNumber} onChange={(e) => setConfig({ ...config, receiptNextNumber: Number(e.target.value) })} className="rounded-lg" />}
                </Field>
                <p className="text-xs text-slate-500 dark:text-ink-muted sm:col-span-2 lg:col-span-4" dir="ltr">
                  {formatMessage(copy.configuration.numberPreview, { example: `${sampleNumber(config.invoicePrefix, config.invoiceNextNumber)} · ${sampleNumber(config.receiptPrefix || "RCT", config.receiptNextNumber)}` })}
                </p>
              </div>

              <fieldset className="space-y-3">
                <legend className="text-sm font-bold text-slate-900 dark:text-white">{copy.configuration.modules}</legend>
                <p className="text-xs text-slate-500 dark:text-ink-muted">{copy.configuration.modulesHint}</p>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {props.modules.map((m) => (
                    <label key={m.moduleKey} className="flex items-center gap-3 rounded-lg border border-ink/15 px-3 py-2.5 text-sm text-slate-700 dark:text-slate-200">
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-accent"
                        checked={enabled(m.moduleKey)}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            modules: [...config.modules.filter((x) => x.moduleKey !== m.moduleKey), { moduleKey: m.moduleKey, isEnabled: e.target.checked }],
                          })
                        }
                      />
                      {moduleName(m)}
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>
          ) : null}

          {step === "review" ? (
            <dl className="grid gap-4 sm:grid-cols-2">
              {([
                ["company", [locale === "ar" ? company.companyNameAr : company.companyNameEn, company.crNumber || copy.review.missing]],
                ["brand", [`${theme.primary} · ${theme.accent}`, theme.fonts.body.kind === "system" ? copy.brand.fontSource.system : theme.fonts.body.family]],
                ["assets", [`${ASSET_SLOTS.filter((s) => assets[s.key]).length} / ${ASSET_SLOTS.length} ${copy.review.uploaded}`]],
                ["configuration", [`${config.defaultCurrency} · ${config.vatEnabled ? `${config.vatPercentage}%` : "—"}`, formatMessage(copy.review.enabledModules, { count: props.modules.filter((m) => enabled(m.moduleKey)).length })]],
              ] as [Exclude<Step, "review">, string[]][]).map(([section, lines]) => (
                <div key={section} className="space-y-2 rounded-xl border border-ink/15 p-4">
                  <div className="flex items-center justify-between">
                    <dt className="text-sm font-semibold text-slate-900 dark:text-white">{copy.review[section]}</dt>
                    <button type="button" onClick={() => go(section)} className="text-xs font-semibold text-accent hover:underline">{copy.review.edit}</button>
                  </div>
                  {lines.map((line) => <dd key={line} className="text-sm text-slate-600 dark:text-ink-muted">{line}</dd>)}
                  {section === "brand" ? (
                    <dd className="flex gap-2 pt-1" aria-hidden>
                      <span className="h-6 w-6 rounded-full" style={{ background: theme.primary }} />
                      <span className="h-6 w-6 rounded-full" style={{ background: theme.accent }} />
                    </dd>
                  ) : null}
                </div>
              ))}
              <p className="text-sm text-slate-700 dark:text-slate-200 sm:col-span-2">{copy.review.ready}</p>
            </dl>
          ) : null}

          {error ? <p role="alert" className="rounded-lg bg-rose-500/10 p-3 text-sm text-rose-700 dark:text-rose-300">{error}</p> : null}

          <div className="flex items-center justify-between gap-3 border-t border-ink/10 pt-5">
            <Button type="button" variant="ghost" disabled={index === 0 || saving} onClick={() => go(STEPS[index - 1])} className="whitespace-nowrap">
              {copy.back}
            </Button>
            <Button type="button" disabled={saving || !!uploading} onClick={saveStep} className="whitespace-nowrap" data-testid="setup-next">
              {saving ? copy.saving : step === "review" ? copy.finish : copy.next}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

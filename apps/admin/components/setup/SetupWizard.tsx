"use client";
import { useNavigationGuard } from "../../hooks/useUnsavedChanges";
import { DomainSettingsCard } from "../settings/DomainSettingsCard";
import { ShowExampleButton } from "../cms/SampleContentCard";
import { addSampleContentAction } from "../../app/actions/samples";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { WebsitePreviewPane } from "./WebsitePreviewPane";
import { ActivityThumb } from "./ActivityThumb";
import { BASE_ROLES, DEPARTMENT_CATALOGUE, DEPARTMENT_ROLES, activityDepartments, type DepartmentKey } from "@platform/database/constants/departments";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Building2, Palette, Image as ImageIcon, SlidersHorizontal, ClipboardCheck, Check, Upload, Trash2, Globe, MonitorSmartphone, Ban, PartyPopper } from "lucide-react";
import { Button, Card, Input, Select } from "@platform/ui";
import { formatMessage } from "@platform/locales";
import { getCurrencyLabel } from "@platform/config/currency";
import { SUPPORTED_CURRENCIES } from "@platform/database/constants/finance";
import { STYLE_PRESETS, type BrandTheme } from "@platform/database/constants/theme";
import type { ContentLanguage } from "@platform/database/constants/languages";
import { ACTIVITY_PRESETS, BUSINESS_ACTIVITIES, isBusinessActivity, type BusinessActivity } from "@platform/database/website-presets";
import { websiteConfigForActivity, type ResolvedWebsiteConfig } from "@platform/database/website-config";
import type { SupportedCurrency } from "@platform/database/types";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { uploadFileDirectly } from "../../lib/upload-client";
import { errorMessage } from "../../lib/error-text";
import { saveCompanyAssetAction, deleteCompanyAssetAction } from "../../app/actions/settings";
import {
  saveSetupCompanyAction,
  saveSetupThemeAction,
  saveSetupConfigAction,
  saveSetupWebsiteAction,
  saveSetupWebsiteDraftAction,
  completeSetupAction,
  type SetupCompanyInput,
  type SetupConfigInput,
} from "../../app/actions/setup";
import { ContentImage } from "../shared/ContentImage";
import { ThemeEditor } from "./ThemeEditor";
import { Field, LanguageFields, activityIcon } from "./LanguageFields";
import { WebsiteSetupFields } from "./WebsiteSetupFields";

export type AssetSlot = "logo_light" | "logo_dark" | "icon_light" | "icon_dark" | "stamp" | "signature";

export interface SetupWizardProps {
  company: SetupCompanyInput;
  theme: BrandTheme;
  assets: Record<AssetSlot, string>;
  config: SetupConfigInput;
  website: { enabled: boolean; config: ResolvedWebsiteConfig };
  /** The saved website and admin domains (the domain card saves them itself). */
  domains: { websiteDomain: string; adminDomain: string };
  modules: { moduleKey: string; nameEn: string; nameAr: string }[];
  /** Catalogue departments the company already has (kept whatever is chosen). */
  existingDepartments: string[];
}

const STEPS = ["company", "brand", "assets", "website", "configuration", "review"] as const;
type Step = (typeof STEPS)[number];
const ICONS: Record<Step, React.ComponentType<{ className?: string }>> = {
  company: Building2,
  brand: Palette,
  assets: ImageIcon,
  website: MonitorSmartphone,
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
const LANGUAGE_CHOICES: { id: "both" | "ar" | "en"; languages: ContentLanguage[] }[] = [
  { id: "both", languages: ["ar", "en"] },
  { id: "ar", languages: ["ar"] },
  { id: "en", languages: ["en"] },
];

function Group({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-4">
      <div className="space-y-0.5">
        <legend className="text-sm font-bold text-slate-900 dark:text-white">{title}</legend>
        {hint ? <p className="text-xs text-slate-500 dark:text-ink-muted">{hint}</p> : null}
      </div>
      {children}
    </fieldset>
  );
}

function ChoiceCard({ selected, onSelect, icon: Icon, title, description, testId, preview }: { selected: boolean; onSelect: () => void; icon: React.ComponentType<{ className?: string }>; title: string; description: string; testId?: string; preview?: React.ReactNode }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      data-testid={testId}
      className={`flex w-full flex-wrap items-start gap-3 rounded-xl border p-3.5 text-start transition-colors ${selected ? "border-accent bg-accent/10" : "border-ink/15 hover:border-ink/30"}`}
    >
      {preview ? <span className="block w-full">{preview}</span> : null}
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${selected ? "bg-accent text-accent-foreground" : "bg-ink/[0.06] text-accent"}`}>
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-slate-900 dark:text-white">{title}</span>
        <span className="block text-xs leading-relaxed text-slate-500 dark:text-ink-muted">{description}</span>
      </span>
    </button>
  );
}

export function SetupWizard(props: SetupWizardProps) {
  const router = useRouter();
  const { t, locale, setLocale } = useAdminLocale();
  const copy = t.setupWizard;
  const { requestNavigation } = useNavigationGuard();
  const [step, setStep] = React.useState<Step>("company");
  const [company, setCompany] = React.useState(props.company);
  const [theme, setTheme] = React.useState(props.theme);
  const [assets, setAssets] = React.useState(props.assets);
  const [config, setConfig] = React.useState(props.config);
  const [website, setWebsite] = React.useState(props.website);
  const [publishWebsite, setPublishWebsite] = React.useState(true);
  const [sampleContent, setSampleContent] = React.useState(false);
  // Recommendations follow the chosen activity until the person changes that part by hand.
  const touched = React.useRef({ theme: false, modules: false, departments: false });
  const [previewRevision, setPreviewRevision] = React.useState(0);
  const [finished, setFinished] = React.useState(false);
  const [direction, setDirection] = React.useState(1);
  const reduceMotion = useReducedMotion();
  const [saving, setSaving] = React.useState(false);
  const [uploading, setUploading] = React.useState<AssetSlot | null>(null);
  const [error, setError] = React.useState("");
  const index = STEPS.indexOf(step);
  const headingRef = React.useRef<HTMLHeadingElement>(null);
  const languages = company.contentLanguages as ContentLanguage[];
  const activity = isBusinessActivity(company.businessActivity) ? company.businessActivity : null;

  React.useEffect(() => headingRef.current?.focus(), [step]);

  const go = async (next: Step) => {
    if (!(await requestNavigation())) return;
    setError("");
    setDirection(STEPS.indexOf(next) >= STEPS.indexOf(step) ? 1 : -1);
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

  const chooseActivity = (next: BusinessActivity) => {
    setCompany((current) => ({ ...current, businessActivity: next }));
    const preset = ACTIVITY_PRESETS[next];
    setWebsite((current) => ({ ...current, config: { ...current.config, ...websiteConfigForActivity(next, current.config) } as ResolvedWebsiteConfig }));
    if (!touched.current.modules)
      setConfig((current) => ({ ...current, modules: current.modules.map((m) => ({ ...m, isEnabled: preset.modules[m.moduleKey as keyof typeof preset.modules] ?? m.isEnabled })) }));
    if (!touched.current.departments)
      setConfig((current) => ({ ...current, departments: Array.from(new Set([...props.existingDepartments, ...activityDepartments(next)])) }));
    const style = STYLE_PRESETS.find((s) => s.id === preset.stylePreset);
    if (!touched.current.theme && style) setTheme((current) => ({ ...current, ...style.theme }));
  };

  // The preview shows the website settings as they are edited: saved as a draft shortly after each change.
  const draftReady = React.useRef(false);
  React.useEffect(() => {
    if (step !== "website" || !website.enabled) return;
    if (!draftReady.current) {
      draftReady.current = true;
      return;
    }
    const timer = window.setTimeout(() => {
      saveSetupWebsiteDraftAction(website.config).then(() => setPreviewRevision((n) => n + 1), () => undefined);
    }, 700);
    return () => window.clearTimeout(timer);
  }, [step, website.enabled, website.config]);

  const chooseLanguages = (next: ContentLanguage[]) =>
    setCompany((current) => ({ ...current, contentLanguages: next, primaryLanguage: next.includes(current.primaryLanguage as ContentLanguage) ? current.primaryLanguage : next[0] }));

  const saveStep = () => {
    const next = STEPS[index + 1];
    if (step === "company") {
      if (!activity) return setError(t.serverErrors.messages.businessActivityInvalid);
      const missing = languages.some((l) => !(l === "en" ? company.companyNameEn : company.companyNameAr).trim());
      if (missing) return setError(languages.length > 1 ? copy.company.requiredBoth : copy.company.required);
      // The website draft follows the activity now, so the Brand step's preview already shows it.
      return run(async () => {
        await saveSetupCompanyAction(company);
        await saveSetupWebsiteDraftAction(website.config);
      }, next);
    }
    if (step === "brand") return run(() => saveSetupThemeAction(theme), next);
    if (step === "assets") {
      if (!assets.logo_light && !assets.logo_dark) return setError(copy.assets.logoRequired);
      return go(next);
    }
    if (step === "website") {
      // The website module follows this answer; the configuration step shows it already switched.
      setConfig((current) => ({ ...current, modules: current.modules.map((m) => (m.moduleKey === "cms" ? { ...m, isEnabled: website.enabled } : m)) }));
      return run(async () => {
        await saveSetupWebsiteAction({ enabled: website.enabled, config: website.config });
        if (website.enabled && sampleContent && activity) await addSampleContentAction(activity);
      }, next);
    }
    if (step === "configuration") return run(() => saveSetupConfigAction(config), next);
    // The celebration shows while setup is finished (the page moves to the dashboard as soon as it is), and at
    // least a moment; a failure takes it away again and shows the error.
    setFinished(true);
    return run(async () => {
      try {
        await Promise.all([completeSetupAction({ publishWebsite: website.enabled && publishWebsite }), new Promise((resolve) => window.setTimeout(resolve, reduceMotion ? 300 : 1400))]);
      } catch (err) {
        setFinished(false);
        throw err;
      }
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

  const text = (key: keyof SetupCompanyInput, label: string, options: { dir?: "ltr" | "rtl"; type?: string; wide?: boolean; placeholder?: string; inputMode?: "numeric" } = {}) => (
    <Field key={key} label={label} wide={options.wide}>
      {(id) => (
        <Input
          id={id}
          name={key}
          dir={options.dir ?? "ltr"}
          type={options.type ?? "text"}
          inputMode={options.inputMode}
          placeholder={options.placeholder}
          value={(company[key] as string) ?? ""}
          onChange={(e) => setCompany({ ...company, [key]: e.target.value })}
          className="rounded-lg"
        />
      )}
    </Field>
  );

  const sampleNumber = (prefix: string, next: number) => `${prefix || "INV"}-${new Date().getFullYear()}-${String(next || 1).padStart(4, "0")}`;
  const moduleName = (m: SetupWizardProps["modules"][number]) => (locale === "ar" ? m.nameAr : m.nameEn);
  const enabled = (key: string) => config.modules.find((m) => m.moduleKey === key)?.isEnabled ?? true;
  const languageChoice = LANGUAGE_CHOICES.find((c) => c.languages.join() === languages.join())?.id ?? "both";
  const activityName = activity ? copy.company.activities[activity].name : copy.review.missing;
  // Beside the Website step; below the Brand step, whose editor needs the width for its style gallery.
  const showPreview = step === "brand" || (step === "website" && website.enabled);
  const previewBeside = step === "website";
  const chosenDepartments = new Set(config.departments);
  const departmentNames = t.departmentCatalogue as Record<DepartmentKey, string>;
  const roleNames = t.roles as Record<string, string>;
  const readyRoles = Array.from(new Set([...BASE_ROLES, ...DEPARTMENT_CATALOGUE.filter((d) => chosenDepartments.has(d)).flatMap((d) => DEPARTMENT_ROLES[d])]));
  const nameIn = (lang: string) => (lang === "ar" ? company.companyNameAr : company.companyNameEn);

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
          <ol className="grid grid-cols-6 gap-2">
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
                    className={`flex w-full flex-col items-center gap-2 rounded-xl border p-3 text-center transition-colors lg:flex-row lg:text-start ${current ? "border-accent bg-accent/10" : done ? "border-ink/15 hover:border-accent/50" : "border-ink/10 opacity-60"}`}
                  >
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${done ? "bg-accent text-accent-foreground" : current ? "bg-primary text-primary-foreground" : "bg-ink/10 text-slate-500"}`}>
                      {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                    </span>
                    <span className="hidden text-xs font-semibold text-slate-800 dark:text-slate-100 lg:block">{copy.steps[s]}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        <div className="h-1.5 overflow-hidden rounded-full bg-ink/10" role="progressbar" aria-label={copy.title} aria-valuemin={1} aria-valuemax={STEPS.length} aria-valuenow={index + 1}>
          <motion.div className="h-full rounded-full bg-accent" initial={false} animate={{ width: `${((index + 1) / STEPS.length) * 100}%` }} transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 140, damping: 22 }} />
        </div>

        <Card className="space-y-6 rounded-2xl border border-ink/15 bg-white p-5 shadow-xs dark:bg-surface sm:p-8">
          <div className="space-y-1 border-b border-ink/10 pb-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-accent">{formatMessage(copy.stepOf, { current: index + 1, total: STEPS.length })}</p>
            <h2 ref={headingRef} tabIndex={-1} className="text-lg font-bold text-slate-900 outline-none dark:text-white">{copy.steps[step]}</h2>
            <p className="text-sm text-slate-600 dark:text-ink-muted">{copy.stepDescriptions[step]}</p>
          </div>

          <div className={showPreview ? `grid items-start gap-6 ${previewBeside ? "xl:grid-cols-[minmax(0,1fr)_minmax(320px,440px)]" : ""}` : undefined}>
          <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={step}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: (locale === "ar" ? -1 : 1) * direction * 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -((locale === "ar" ? -1 : 1) * direction * 24) }}
            transition={{ duration: reduceMotion ? 0.01 : 0.22, ease: "easeOut" }}
            className="min-w-0"
          >
          {step === "company" ? (
            <div className="space-y-8">
              <Group title={copy.company.languagesTitle} hint={copy.company.languagesHint}>
                <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label={copy.company.languagesTitle}>
                  {LANGUAGE_CHOICES.map((choice) => (
                    <ChoiceCard
                      key={choice.id}
                      selected={languageChoice === choice.id}
                      onSelect={() => chooseLanguages(choice.languages)}
                      icon={Globe}
                      title={copy.company.languageOptions[choice.id]}
                      description={choice.languages.map((l) => copy.company.languageNames[l]).join(" · ")}
                      testId={`languages-${choice.id}`}
                    />
                  ))}
                </div>
                {languages.length > 1 ? (
                  <div className="max-w-xs">
                    <Field label={copy.company.primaryLanguage} hint={copy.company.primaryHint}>
                      {(id) => (
                        <Select id={id} value={company.primaryLanguage} onChange={(e) => setCompany({ ...company, primaryLanguage: e.target.value })} className="rounded-lg">
                          {(["ar", "en"] as const).map((l) => <option key={l} value={l}>{copy.company.languageNames[l]}</option>)}
                        </Select>
                      )}
                    </Field>
                  </div>
                ) : null}
              </Group>

              <Group title={copy.company.activityTitle} hint={copy.company.activityHint}>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3" role="radiogroup" aria-label={copy.company.activityTitle}>
                  {BUSINESS_ACTIVITIES.map((a) => (
                    <div key={a} className="relative">
                      <ChoiceCard
                        selected={activity === a}
                        onSelect={() => chooseActivity(a)}
                        icon={activityIcon(a)}
                        title={copy.company.activities[a].name}
                        description={copy.company.activities[a].description}
                        testId={`activity-${a}`}
                        preview={<ActivityThumb activity={a} locale={locale} />}
                      />
                      <ShowExampleButton activity={a} compact className="absolute end-2 top-2" />
                    </div>
                  ))}
                </div>
              </Group>

              <Group title={copy.company.identityTitle}>
                <div className="grid gap-5 sm:grid-cols-2">
                  <LanguageFields name="companyName" label={copy.company.name} languages={languages} required maxLength={200} en={company.companyNameEn} ar={company.companyNameAr} onChange={(v) => setCompany({ ...company, companyNameEn: v.en, companyNameAr: v.ar })} />
                  {text("crNumber", copy.company.crNumber)}
                  {text("vatId", copy.company.vatId)}
                </div>
              </Group>

              <Group title={copy.company.profileTitle}>
                <div className="grid gap-5 sm:grid-cols-2">
                  <LanguageFields name="tagline" label={copy.company.tagline} hint={copy.company.taglineHint} languages={languages} maxLength={160} en={company.taglineEn ?? ""} ar={company.taglineAr ?? ""} onChange={(v) => setCompany({ ...company, taglineEn: v.en, taglineAr: v.ar })} />
                  {text("foundedYear", copy.company.foundedYear, { inputMode: "numeric", placeholder: String(new Date().getFullYear() - 5) })}
                  {text("city", copy.company.city, { dir: languages[0] === "ar" ? "rtl" : "ltr" })}
                  {text("country", copy.company.country, { dir: languages[0] === "ar" ? "rtl" : "ltr" })}
                </div>
              </Group>

              <Group title={copy.company.contactTitle}>
                <div className="grid gap-5 sm:grid-cols-2">
                  <LanguageFields name="address" label={copy.company.address} languages={languages} wide maxLength={300} en={company.addressEn ?? ""} ar={company.addressAr ?? ""} onChange={(v) => setCompany({ ...company, addressEn: v.en, addressAr: v.ar })} />
                  {text("phone", copy.company.phone, { type: "tel" })}
                  {text("whatsappPhone", copy.company.whatsapp, { type: "tel" })}
                  {text("email", copy.company.email, { type: "email" })}
                  {text("website", copy.company.website, { type: "url" })}
                  {text("mapUrl", copy.company.mapUrl, { type: "url", wide: true, placeholder: "https://maps.google.com/…" })}
                </div>
              </Group>

              <Group title={copy.company.socialTitle}>
                <div className="grid gap-5 sm:grid-cols-3">
                  {text("instagramUrl", copy.company.instagram, { type: "url" })}
                  {text("linkedinUrl", copy.company.linkedin, { type: "url" })}
                  {text("youtubeUrl", copy.company.youtube, { type: "url" })}
                </div>
              </Group>
            </div>
          ) : null}

          {step === "brand" ? (
            <ThemeEditor
              theme={theme}
              languages={languages}
              onChange={(next) => {
                touched.current.theme = true;
                setTheme(next);
              }}
            />
          ) : null}

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

          {step === "website" ? (
            <div className="space-y-6">
              <Group title={copy.website.enabledTitle}>
                <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label={copy.website.enabledTitle}>
                  <ChoiceCard selected={website.enabled} onSelect={() => setWebsite({ ...website, enabled: true })} icon={MonitorSmartphone} title={copy.website.yes.title} description={copy.website.yes.description} testId="website-on" />
                  <ChoiceCard selected={!website.enabled} onSelect={() => setWebsite({ ...website, enabled: false })} icon={Ban} title={copy.website.no.title} description={copy.website.no.description} testId="website-off" />
                </div>
              </Group>
              {website.enabled ? (
                <>
                  <WebsiteSetupFields
                    config={website.config}
                    onChange={(next) => setWebsite({ ...website, config: next })}
                    languages={languages}
                    primaryLanguage={company.primaryLanguage as ContentLanguage}
                    companyActivity={activity}
                    hasWhatsapp={!!company.whatsappPhone?.trim()}
                  />
                  <div className="flex flex-col gap-3 rounded-xl border border-ink/10 p-4 sm:flex-row sm:items-start">
                    <label className="flex flex-1 items-start gap-3 text-sm text-slate-800 dark:text-slate-100">
                      <input type="checkbox" className="mt-0.5 h-4 w-4 accent-accent" checked={sampleContent} onChange={(e) => setSampleContent(e.target.checked)} data-testid="sample-content" />
                      <span>
                        <span className="block font-semibold">{t.sampleContent.start}</span>
                        <span className="block text-xs text-slate-500 dark:text-ink-muted">{t.sampleContent.startHint}</span>
                      </span>
                    </label>
                    {activity ? <ShowExampleButton activity={activity} /> : null}
                  </div>
                  <DomainSettingsCard compact canEdit initialWebsiteDomain={props.domains.websiteDomain} initialAdminDomain={props.domains.adminDomain} />
                  <label className="flex items-start gap-3 rounded-xl border border-accent/40 bg-accent/[0.06] p-4 text-sm text-slate-800 dark:text-slate-100">
                    <input type="checkbox" className="mt-0.5 h-4 w-4 accent-accent" checked={publishWebsite} onChange={(e) => setPublishWebsite(e.target.checked)} />
                    <span>
                      <span className="block font-semibold">{copy.website.publishOnFinish}</span>
                      <span className="block text-xs text-slate-500 dark:text-ink-muted">{copy.website.publishHint}</span>
                    </span>
                  </label>
                </>
              ) : null}
            </div>
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
                <p className="text-xs text-slate-500 dark:text-ink-muted">{activity ? formatMessage(copy.configuration.modulesRecommended, { activity: activityName }) : copy.configuration.modulesHint}</p>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {props.modules.map((m) => (
                    <label key={m.moduleKey} className="flex items-center gap-3 rounded-lg border border-ink/15 px-3 py-2.5 text-sm text-slate-700 dark:text-slate-200">
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-accent"
                        checked={enabled(m.moduleKey)}
                        onChange={(e) => {
                          touched.current.modules = true;
                          setConfig({
                            ...config,
                            modules: [...config.modules.filter((x) => x.moduleKey !== m.moduleKey), { moduleKey: m.moduleKey, isEnabled: e.target.checked }],
                          });
                        }}
                      />
                      {moduleName(m)}
                    </label>
                  ))}
                </div>
              </fieldset>

              <fieldset className="space-y-3" data-testid="setup-departments">
                <legend className="text-sm font-bold text-slate-900 dark:text-white">{copy.configuration.departments}</legend>
                <p className="text-xs text-slate-500 dark:text-ink-muted">{activity ? formatMessage(copy.configuration.departmentsRecommended, { activity: activityName }) : copy.configuration.departmentsHint}</p>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {DEPARTMENT_CATALOGUE.map((key) => {
                    const kept = props.existingDepartments.includes(key);
                    return (
                      <label key={key} className="flex items-center gap-3 rounded-lg border border-ink/15 px-3 py-2.5 text-sm text-slate-700 dark:text-slate-200">
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-accent"
                          checked={kept || chosenDepartments.has(key)}
                          disabled={kept}
                          onChange={(e) => {
                            touched.current.departments = true;
                            setConfig({ ...config, departments: e.target.checked ? [...config.departments, key] : config.departments.filter((d) => d !== key) });
                          }}
                        />
                        {departmentNames[key]}
                      </label>
                    );
                  })}
                </div>
                <div className="space-y-2 rounded-xl bg-ink/[0.03] p-4">
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">{copy.configuration.rolesReady}</p>
                  <ul className="flex flex-wrap gap-1.5" aria-label={copy.configuration.rolesReady}>
                    {readyRoles.map((role) => <li key={role} className="rounded-full border border-ink/15 bg-white px-2.5 py-1 text-xs text-slate-700 dark:bg-surface dark:text-slate-200">{roleNames[role] ?? role}</li>)}
                  </ul>
                  <p className="text-xs text-slate-500 dark:text-ink-muted">{copy.configuration.rolesHint}</p>
                </div>
              </fieldset>
            </div>
          ) : null}

          {step === "review" ? (
            <dl className="grid gap-4 sm:grid-cols-2">
              {([
                ["company", [languages.map(nameIn).filter((v, i, all) => all.indexOf(v) === i).join(" · "), `${copy.review.activity}: ${activityName}`, `${copy.review.languages}: ${copy.company.languageOptions[languageChoice]}`, company.crNumber || copy.review.missing]],
                ["brand", [`${theme.primary} · ${theme.accent}`, theme.fonts.body.kind === "system" ? copy.brand.fontSource.system : theme.fonts.body.family]],
                ["assets", [`${ASSET_SLOTS.filter((s) => assets[s.key]).length} / ${ASSET_SLOTS.length} ${copy.review.uploaded}`]],
                [
                  "website",
                  website.enabled
                    ? [
                        formatMessage(copy.review.websiteOn, { type: copy.company.activities[website.config.purpose].name }),
                        `/${company.primaryLanguage}/${website.config.collection.slug} · ${copy.website.heroStyles[website.config.heroStyle].name}`,
                        publishWebsite ? copy.review.willPublish : copy.review.draftOnly,
                      ]
                    : [copy.review.websiteOff],
                ],
                ["configuration", [`${config.defaultCurrency} · ${config.vatEnabled ? `${config.vatPercentage}%` : "—"}`, formatMessage(copy.review.enabledModules, { count: props.modules.filter((m) => enabled(m.moduleKey)).length }), formatMessage(copy.review.departmentCount, { count: new Set([...props.existingDepartments, ...config.departments]).size })]],
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
          </motion.div>
          </AnimatePresence>
          {showPreview ? <WebsitePreviewPane theme={theme} revision={previewRevision} /> : null}
          </div>

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
      <AnimatePresence>
        {finished ? (
          <motion.div role="status" className="fixed inset-0 z-50 flex items-center justify-center bg-brand-base/90 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="relative flex flex-col items-center gap-4 text-center">
              {!reduceMotion
                ? Array.from({ length: 14 }, (_, i) => (
                    <motion.span
                      key={i}
                      aria-hidden="true"
                      className={`absolute h-2 w-2 rounded-full ${i % 2 ? "bg-accent" : "bg-primary"}`}
                      initial={{ x: 0, y: 0, opacity: 1, scale: 0.6 }}
                      animate={{ x: Math.cos((i / 14) * Math.PI * 2) * 140, y: Math.sin((i / 14) * Math.PI * 2) * 140, opacity: 0, scale: 1.2 }}
                      transition={{ duration: 1.2, ease: "easeOut" }}
                    />
                  ))
                : null}
              <motion.span className="flex h-16 w-16 items-center justify-center rounded-full bg-accent text-accent-foreground" initial={reduceMotion ? false : { scale: 0.4, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 220, damping: 12 }}>
                <PartyPopper className="h-7 w-7" />
              </motion.span>
              <p className="text-lg font-bold text-slate-900 dark:text-white">{copy.finished}</p>
              <p className="text-sm text-slate-600 dark:text-ink-muted">{copy.finishedHint}</p>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

"use client";

import * as React from "react";
import { ArrowDown, ArrowUp, Check, Eye, EyeOff, RotateCcw } from "lucide-react";
import { Input, Select } from "@platform/ui";
import type { ContentLanguage } from "@platform/database/constants/languages";
import {
  BUSINESS_ACTIVITIES,
  COLLECTION_LAYOUTS,
  HERO_STYLES,
  type BusinessActivity,
  type CollectionLayout,
  type HeroStyle,
  type InquiryOptions,
} from "@platform/database/website-presets";
import { websiteConfigForActivity, type ResolvedWebsiteConfig, type WebsiteSection } from "@platform/database/website-config";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { Field, LanguageFields, activityIcon } from "./LanguageFields";

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 rounded-xl border border-ink/15 p-4 sm:p-5">
      <div className="space-y-0.5">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">{title}</h3>
        {hint ? <p className="text-xs text-slate-500 dark:text-ink-muted">{hint}</p> : null}
      </div>
      {children}
    </section>
  );
}

function Toggle({ label, checked, onChange, disabled, hint }: { label: string; checked: boolean; onChange: (value: boolean) => void; disabled?: boolean; hint?: string }) {
  return (
    <label className={`flex items-start gap-3 rounded-lg border border-ink/15 px-3 py-2.5 text-sm text-slate-700 dark:text-slate-200 ${disabled ? "opacity-60" : "cursor-pointer hover:border-ink/30"}`}>
      <input type="checkbox" className="mt-0.5 h-4 w-4 accent-accent" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span>
        {label}
        {hint ? <span className="block text-[11px] text-slate-500 dark:text-ink-muted">{hint}</span> : null}
      </span>
    </label>
  );
}

/** A tiny drawing of each homepage opening, so the choice is visual. */
function HeroSketch({ style }: { style: HeroStyle }) {
  if (style === "cinematic")
    return (
      <span className="relative flex h-16 items-end overflow-hidden rounded-md bg-gradient-to-br from-tone-30 to-tone-10 p-2">
        <span className="space-y-1">
          <span className="block h-1.5 w-16 rounded bg-white/90" />
          <span className="block h-1.5 w-10 rounded bg-white/60" />
        </span>
      </span>
    );
  if (style === "split")
    return (
      <span className="flex h-16 gap-2 overflow-hidden rounded-md bg-tone-90 p-2 dark:bg-tone-20">
        <span className="flex flex-1 flex-col justify-center gap-1">
          <span className="block h-1.5 w-full rounded bg-tone-30 dark:bg-tone-80" />
          <span className="block h-1.5 w-2/3 rounded bg-tone-50" />
          <span className="mt-1 block h-2 w-8 rounded bg-accent" />
        </span>
        <span className="w-1/2 rounded bg-gradient-to-br from-tone-50 to-tone-30" />
      </span>
    );
  return (
    <span className="flex h-16 flex-col items-center justify-center gap-1 overflow-hidden rounded-md bg-primary p-2">
      <span className="block h-1.5 w-16 rounded bg-white/90" />
      <span className="block h-1.5 w-10 rounded bg-white/60" />
      <span className="mt-1 block h-2 w-8 rounded bg-accent" />
    </span>
  );
}

export interface WebsiteSetupFieldsProps {
  config: ResolvedWebsiteConfig;
  onChange: (config: ResolvedWebsiteConfig) => void;
  languages: readonly ContentLanguage[];
  primaryLanguage: ContentLanguage;
  /** The company's activity, marked as recommended in the type picker. */
  companyActivity?: BusinessActivity | null;
  hasWhatsapp: boolean;
}

export function WebsiteSetupFields({ config, onChange, languages, primaryLanguage, companyActivity, hasWhatsapp }: WebsiteSetupFieldsProps) {
  const { t, locale } = useAdminLocale();
  const copy = t.setupWizard.website;
  const activities = t.setupWizard.company.activities;
  const [notice, setNotice] = React.useState("");
  const set = (patch: Partial<ResolvedWebsiteConfig>) => onChange({ ...config, ...patch });
  const apply = (activity: BusinessActivity) => {
    const next = websiteConfigForActivity(activity, config);
    onChange({ ...config, ...next } as ResolvedWebsiteConfig);
    setNotice(copy.applied);
  };
  const collection = config.collection;
  const setCollection = (patch: Partial<ResolvedWebsiteConfig["collection"]>) => set({ collection: { ...collection, ...patch } });
  const move = (index: number, direction: -1 | 1) => {
    const sections = [...config.sections];
    [sections[index], sections[index + direction]] = [sections[index + direction], sections[index]];
    set({ sections });
  };
  // The closing call to action is part of the shared footer, so it is not offered as a section here.
  const sections = config.sections.map((s, index) => ({ ...s, index })).filter((s) => s.id !== "cta");
  const sectionName = (id: WebsiteSection) => (id === "portfolio" ? `${copy.sectionNames.portfolio} · ${locale === "ar" ? collection.navAr : collection.navEn}` : copy.sectionNames[id]);

  return (
    <div className="space-y-5">
      <Section title={copy.typeTitle} hint={copy.typeHint}>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4" role="radiogroup" aria-label={copy.typeTitle}>
          {BUSINESS_ACTIVITIES.map((activity) => {
            const Icon = activityIcon(activity);
            const active = config.purpose === activity;
            return (
              <button
                key={activity}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => apply(activity)}
                className={`relative flex items-center gap-2 rounded-lg border px-3 py-2.5 text-start text-xs font-medium transition-colors ${active ? "border-accent bg-accent/10 text-slate-900 dark:text-white" : "border-ink/15 text-slate-600 hover:border-ink/30 dark:text-slate-300"}`}
              >
                <Icon className="h-4 w-4 shrink-0 text-accent" />
                <span className="min-w-0 flex-1 truncate">{activities[activity].name}</span>
                {activity === companyActivity ? <span className="shrink-0 rounded-full bg-accent/15 px-1.5 py-0.5 text-[10px] text-brand-text">{copy.recommended}</span> : null}
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => apply(config.purpose)} className="inline-flex items-center gap-1.5 rounded-lg border border-ink/20 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-accent hover:text-accent dark:text-slate-200">
            <RotateCcw className="h-3.5 w-3.5" />
            {copy.applyRecommended}
          </button>
          {notice ? <p role="status" className="inline-flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-300"><Check className="h-3.5 w-3.5" />{notice}</p> : null}
        </div>
        <dl className="grid gap-2 rounded-lg bg-ink/[0.04] p-3 text-xs sm:grid-cols-3">
          <div>
            <dt className="text-slate-500 dark:text-ink-muted">{copy.summaryAddress}</dt>
            <dd className="font-mono text-slate-900 dark:text-white" dir="ltr">/{primaryLanguage}/{collection.slug}</dd>
          </div>
          <div>
            <dt className="text-slate-500 dark:text-ink-muted">{copy.collectionLayout}</dt>
            <dd className="text-slate-900 dark:text-white">{copy.layouts[collection.layout]}</dd>
          </div>
          <div>
            <dt className="text-slate-500 dark:text-ink-muted">{copy.heroTitle}</dt>
            <dd className="text-slate-900 dark:text-white">{copy.heroStyles[config.heroStyle].name}</dd>
          </div>
        </dl>
      </Section>

      <Section title={copy.catalogueTitle} hint={copy.catalogueHint}>
        <div className="grid gap-4 sm:grid-cols-2">
          <LanguageFields name="collectionNav" label={copy.collectionNav} languages={languages} required maxLength={60} en={collection.navEn} ar={collection.navAr} onChange={(v) => setCollection({ navEn: v.en, navAr: v.ar })} />
          <LanguageFields name="collectionTitle" label={copy.collectionTitle} languages={languages} maxLength={120} en={collection.titleEn} ar={collection.titleAr} onChange={(v) => setCollection({ titleEn: v.en, titleAr: v.ar })} />
          <LanguageFields name="collectionSubtitle" label={copy.collectionSubtitle} languages={languages} multiline maxLength={300} en={collection.subtitleEn} ar={collection.subtitleAr} onChange={(v) => setCollection({ subtitleEn: v.en, subtitleAr: v.ar })} />
          <Field label={copy.collectionSlug}>
            {(id) => (
              <div className="flex items-center rounded-lg border border-ink/25 bg-white ps-3 dark:border-white/20 dark:bg-surface" dir="ltr">
                <span className="text-sm text-slate-400">/{primaryLanguage}/</span>
                <Input
                  id={id}
                  dir="ltr"
                  value={collection.slug}
                  maxLength={40}
                  onChange={(e) => setCollection({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-{2,}/g, "-") })}
                  className="border-0 ps-0.5 font-mono shadow-none focus:ring-0"
                />
              </div>
            )}
          </Field>
          <Field label={copy.collectionLayout}>
            {(id) => (
              <Select id={id} value={collection.layout} onChange={(e) => setCollection({ layout: e.target.value as CollectionLayout })} className="rounded-lg">
                {COLLECTION_LAYOUTS.map((layout) => <option key={layout} value={layout}>{copy.layouts[layout]}</option>)}
              </Select>
            )}
          </Field>
        </div>
      </Section>

      <Section title={copy.heroTitle}>
        <div className="grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label={copy.heroTitle}>
          {HERO_STYLES.map((style) => (
            <button
              key={style}
              type="button"
              role="radio"
              aria-checked={config.heroStyle === style}
              onClick={() => set({ heroStyle: style })}
              className={`space-y-2 rounded-xl border p-3 text-start transition-colors ${config.heroStyle === style ? "border-accent bg-accent/10" : "border-ink/15 hover:border-ink/30"}`}
            >
              <HeroSketch style={style} />
              <span className="block text-sm font-semibold text-slate-900 dark:text-white">{copy.heroStyles[style].name}</span>
              <span className="block text-[11px] text-slate-500 dark:text-ink-muted">{copy.heroStyles[style].description}</span>
            </button>
          ))}
        </div>
      </Section>

      <div className="grid gap-5 lg:grid-cols-2">
        <Section title={copy.pagesTitle}>
          <div className="grid gap-2">
            {config.pages.map((page) => (
              <Toggle
                key={page.id}
                label={page.id === "works" ? `${copy.pageNames.works} · ${locale === "ar" ? collection.navAr : collection.navEn}` : copy.pageNames[page.id]}
                checked={page.visible}
                onChange={(visible) => set({ pages: config.pages.map((p) => (p.id === page.id ? { ...p, visible } : p)) })}
              />
            ))}
          </div>
        </Section>

        <Section title={copy.sectionsTitle} hint={copy.sectionsHint}>
          <ol className="space-y-1.5">
            {sections.map((section, position) => (
              <li key={section.id} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${section.visible ? "border-ink/15 text-slate-800 dark:text-slate-100" : "border-dashed border-ink/15 text-slate-400"}`}>
                <span className="w-5 text-xs text-slate-400">{position + 1}</span>
                <span className="min-w-0 flex-1 truncate">{sectionName(section.id)}</span>
                <button
                  type="button"
                  aria-pressed={section.visible}
                  aria-label={sectionName(section.id)}
                  onClick={() => set({ sections: config.sections.map((s) => (s.id === section.id ? { ...s, visible: !s.visible } : s)) })}
                  className="rounded p-1 hover:bg-ink/10"
                >
                  {section.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>
                <button type="button" aria-label={`${copy.moveUp} ${sectionName(section.id)}`} disabled={position === 0} onClick={() => move(section.index, -1)} className="rounded p-1 hover:bg-ink/10 disabled:opacity-30">
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label={`${copy.moveDown} ${sectionName(section.id)}`}
                  disabled={position === sections.length - 1}
                  onClick={() => move(section.index, 1)}
                  className="rounded p-1 hover:bg-ink/10 disabled:opacity-30"
                >
                  <ArrowDown className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ol>
        </Section>
      </div>

      <Section title={copy.contactTitle} hint={copy.contactHint}>
        <div className="grid gap-2 sm:grid-cols-2">
          {(Object.keys(config.inquiry) as (keyof InquiryOptions)[]).map((key) => (
            <Toggle key={key} label={copy.inquiry[key]} checked={config.inquiry[key]} onChange={(value) => set({ inquiry: { ...config.inquiry, [key]: value } })} />
          ))}
          <Toggle label={copy.whatsappButton} hint={hasWhatsapp ? undefined : copy.whatsappMissing} checked={config.whatsappButton} onChange={(whatsappButton) => set({ whatsappButton })} />
          {config.purpose === "media" || config.purpose === "events" || config.showEquipment ? (
            <Toggle label={copy.equipment} checked={config.showEquipment} onChange={(showEquipment) => set({ showEquipment })} />
          ) : null}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <LanguageFields name="hours" label={copy.hours} languages={languages} placeholder={copy.hoursPlaceholder} en={config.hoursEn} ar={config.hoursAr} onChange={(v) => set({ hoursEn: v.en, hoursAr: v.ar })} />
        </div>
      </Section>

      <Section title={copy.seoTitle} hint={copy.seoHint}>
        <div className="grid gap-4 sm:grid-cols-2">
          <LanguageFields name="seoTitle" label={copy.seoSiteTitle} languages={languages} maxLength={70} en={config.seo.titleEn} ar={config.seo.titleAr} onChange={(v) => set({ seo: { ...config.seo, titleEn: v.en, titleAr: v.ar } })} />
          <LanguageFields name="seoDescription" label={copy.seoDescription} languages={languages} multiline maxLength={160} en={config.seo.descriptionEn} ar={config.seo.descriptionAr} onChange={(v) => set({ seo: { ...config.seo, descriptionEn: v.en, descriptionAr: v.ar } })} />
        </div>
      </Section>
    </div>
  );
}

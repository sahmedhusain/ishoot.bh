"use client";

import { LANGUAGES, getWebsiteTranslations } from "@platform/locales";
import { deepMerge } from "@platform/locales/merge";
import { Input, Select } from "@platform/ui";
import type { ResolvedWebsiteConfig } from "@platform/database/website-config";
import type { ContentLanguage } from "@platform/database/constants/languages";
import { useAdminLocale } from "../../hooks/useAdminLocale";

const COPY_FIELDS = [
  ["nav", "home", "home"], ["nav", "about", "about"], ["nav", "works", "catalogue"], ["nav", "contact", "contact"],
  ["hero", "headline", "headline"], ["hero", "subheadline", "intro"], ["hero", "caption", "caption"],
  ["hero", "exploreWorks", "explore"], ["hero", "startProject", "action"],
  ["contact", "title", "contactTitle"], ["contact", "subtitle", "contactIntro"], ["contact", "submit", "submit"],
] as const;

export function WebsiteLanguageFields({ config, onChange, languages }: { config: ResolvedWebsiteConfig; onChange: (config: ResolvedWebsiteConfig) => void; languages: readonly ContentLanguage[] }) {
  const { t } = useAdminLocale();
  const copy = t.websiteLanguages;
  const enabled = config.interfaceLanguages ?? [...languages];
  const primary = config.primaryInterfaceLanguage ?? enabled[0];
  return <section className="space-y-4 rounded-xl border border-outline-variant p-4 sm:p-5">
    <div><h3 className="text-sm font-bold">{copy.title}</h3><p className="text-xs text-ink-muted">{copy.hint}</p></div>
    <fieldset className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4"><legend className="sr-only">{copy.title}</legend>
      {LANGUAGES.map((language) => <label key={language.code} className="flex min-h-11 items-center gap-2 rounded-lg border border-outline-variant px-3 py-2 text-sm"><input type="checkbox" checked={enabled.includes(language.code)} onChange={(event) => {
        const next = event.target.checked ? [...enabled, language.code] : enabled.filter((value) => value !== language.code);
        if (next.length) onChange({ ...config, interfaceLanguages: next, primaryInterfaceLanguage: next.includes(primary) ? primary : next[0] });
      }} /><span lang={language.code}>{language.name}</span></label>)}
    </fieldset>
    <label className="block space-y-1 text-sm"><span>{copy.primary}</span><Select value={primary} onChange={(event) => onChange({ ...config, interfaceLanguages: enabled, primaryInterfaceLanguage: event.target.value })}>{LANGUAGES.filter((language) => enabled.includes(language.code)).map((language) => <option key={language.code} value={language.code}>{language.name}</option>)}</Select></label>
    <p className="text-xs text-ink-muted">{copy.fallback}</p>
    {LANGUAGES.filter((language) => enabled.includes(language.code)).map((language) => {
      const dictionary = getWebsiteTranslations(language.code);
      return <details key={language.code} className="rounded-xl border border-outline-variant p-3"><summary className="min-h-8 cursor-pointer text-sm font-medium">{language.name} · {copy.customize}</summary><div className="mt-4 grid gap-3 sm:grid-cols-2">
        {COPY_FIELDS.map(([group, key, label]) => {
          const values = config.interfaceCopy?.[language.code]?.[group] as Record<string, unknown> | undefined;
          const value = typeof values?.[key] === "string" ? values[key] as string : "";
          const fallback = (dictionary[group] as Record<string, unknown>)[key];
          return <label key={`${group}.${key}`} className="block space-y-1 text-xs"><span>{copy.fields[label]}</span><Input dir={language.direction} value={value} placeholder={typeof fallback === "string" ? fallback : ""} maxLength={1500} onChange={(event) => onChange({ ...config, interfaceCopy: deepMerge(config.interfaceCopy ?? {}, { [language.code]: { [group]: { [key]: event.target.value } } }) })} /></label>;
        })}
      </div></details>;
    })}
  </section>;
}

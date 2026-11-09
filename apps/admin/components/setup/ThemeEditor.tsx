"use client";

import * as React from "react";
import { Upload, X, CheckCircle2, AlertTriangle, Sun, Moon, Search, ExternalLink, ArrowUpRight } from "lucide-react";
import { Input, Select } from "@platform/ui";
import { formatMessage } from "@platform/locales";
import {
  FONT_EXTENSIONS,
  FONT_LIBRARY,
  HEADING_WEIGHTS,
  LICENSED_FONTS,
  STYLE_PRESETS,
  googleFontsHref,
  normalizeTheme,
  themeStylesheet,
  themeVariables,
  themeWarnings,
  weightFromFileName,
  type BrandTheme,
  type FontChoice,
  type LibraryFont,
  type ThemeButtonShape,
  type ThemeFontScale,
  type ThemeMode,
  type ThemeRadius,
} from "@platform/database/constants/theme";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { uploadFileDirectly } from "../../lib/upload-client";
import { errorMessage } from "../../lib/error-text";

const PALETTES: [string, string][] = [
  ["#312E81", "#4F46E5"],
  ["#0C4A6E", "#0284C7"],
  ["#064E3B", "#059669"],
  ["#134E4A", "#0D9488"],
  ["#7F1D1D", "#DC2626"],
  ["#78350F", "#D97706"],
  ["#3F2A1D", "#B45309"],
  ["#4A044E", "#A21CAF"],
  ["#831843", "#DB2777"],
  ["#1F2937", "#2563EB"],
  ["#111827", "#374151"],
];
const RADII: ThemeRadius[] = ["none", "sm", "md", "lg", "xl"];
const MODES: ThemeMode[] = ["light", "dark", "system"];
const SHAPES: ThemeButtonShape[] = ["square", "rounded", "pill"];
const SCALES: ThemeFontScale[] = ["sm", "md", "lg"];
const WEIGHTS = [100, 200, 300, 400, 500, 600, 700, 800, 900];
const FILTERS = ["all", "arabic", "latin", "sans", "serif", "display", "handwriting"] as const;
type FontFilter = (typeof FILTERS)[number];
const SAMPLE = "أبجد هوز Aa Bb 123";
const LICENSED_FAMILIES: readonly string[] = LICENSED_FONTS.map((f) => f.family);

function useThemeFonts(theme: BrandTheme) {
  const href = googleFontsHref(theme);
  const faces = themeStylesheet(theme).split(":root{")[0];
  useStylesheet(href);
  React.useEffect(() => {
    if (!faces) return;
    const style = document.createElement("style");
    style.textContent = faces;
    document.head.appendChild(style);
    return () => style.remove();
  }, [faces]);
}

function useStylesheet(href: string | null) {
  React.useEffect(() => {
    if (!href) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
    return () => link.remove();
  }, [href]);
}

const libraryPreviewHref = `https://fonts.googleapis.com/css2?${FONT_LIBRARY.map((f) => `family=${f.family.replace(/ /g, "+")}`).join("&")}&text=${encodeURIComponent(SAMPLE)}&display=swap`;

function ChoiceGroup<T extends string | number>({ label, options, value, onChange, render }: { label: string; options: readonly T[]; value: T; onChange: (value: T) => void; render: (value: T) => React.ReactNode }) {
  const name = React.useId();
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium text-ink">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <label key={String(option)} className="relative cursor-pointer">
            <input type="radio" name={name} value={String(option)} checked={value === option} onChange={() => onChange(option)} className="peer absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0" />
            <span className="flex min-h-10 items-center whitespace-nowrap rounded-lg border border-outline px-3 py-2 text-sm text-ink transition-colors peer-checked:border-primary peer-checked:bg-secondary-container peer-checked:text-on-secondary-container peer-focus-visible:outline peer-focus-visible:outline-[3px] peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary">{render(option)}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function ColourField({ label, hint, value, onChange }: { label: string; hint: string; value: string; onChange: (hex: string) => void }) {
  const id = React.useId();
  const [draft, setDraft] = React.useState(value);
  React.useEffect(() => setDraft(value), [value]);
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-xs font-medium text-ink">{label}</label>
      <div className="flex items-center gap-3">
        <input
          type="color"
          aria-label={label}
          value={value}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          className="h-11 w-14 shrink-0 cursor-pointer rounded-lg border border-ink/20 bg-transparent p-1"
        />
        <Input
          id={id}
          dir="ltr"
          value={draft}
          maxLength={7}
          onChange={(e) => {
            const next = e.target.value.trim();
            setDraft(next);
            if (/^#[0-9a-fA-F]{6}$/.test(next)) onChange(next.toUpperCase());
          }}
          className="rounded-lg font-mono uppercase"
        />
      </div>
      <p className="text-[11px] text-ink-muted">{hint}</p>
    </div>
  );
}

function FontLibrary({ value, onChange, label }: { value: FontChoice; onChange: (font: FontChoice) => void; label: string }) {
  const { t } = useAdminLocale();
  const copy = t.setupWizard.brand;
  const [query, setQuery] = React.useState("");
  const [filter, setFilter] = React.useState<FontFilter>("all");
  useStylesheet(libraryPreviewHref);
  const matches = (font: LibraryFont) =>
    font.family.toLowerCase().includes(query.trim().toLowerCase()) &&
    (filter === "all" || font.script === filter || font.category === filter);
  const fonts = FONT_LIBRARY.filter(matches);
  const searchId = React.useId();
  return (
    <div className="space-y-3">
      <div className="relative">
        <label htmlFor={searchId} className="sr-only">{copy.fontSearch}</label>
        <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
        <Input id={searchId} type="search" value={query} placeholder={copy.fontSearch} onChange={(e) => setQuery(e.target.value)} className="rounded-lg ps-9" />
      </div>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label={copy.fontSearch}>
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            aria-pressed={filter === f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${filter === f ? "bg-accent text-accent-foreground" : "bg-ink/[0.06] text-ink-muted hover:bg-ink/10 dark:text-ink"}`}
          >
            {copy.fontFilters[f]}
          </button>
        ))}
      </div>
      <p className="text-[11px] text-ink-muted" aria-live="polite">{formatMessage(copy.fontCount, { count: fonts.length })}</p>
      {fonts.length ? (
        <div className="grid max-h-80 grid-cols-1 gap-2 overflow-y-auto pe-1 sm:grid-cols-2" role="radiogroup" aria-label={label}>
          {fonts.map((font) => {
            const selected = value.kind === "google" && value.family === font.family;
            return (
              <button
                key={font.family}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => onChange({ kind: "google", family: font.family })}
                className={`rounded-lg border px-3 py-2 text-start transition-colors ${selected ? "border-accent bg-accent/10 text-ink dark:text-ink" : "border-ink/15 text-ink-muted hover:border-ink/30 dark:text-ink"}`}
              >
                <span className="flex items-center justify-between gap-2 text-xs">
                  <span className="truncate font-medium">{font.family}</span>
                  {font.script === "latin" ? <span className="shrink-0 rounded bg-ink/[0.06] px-1.5 py-0.5 text-[10px] text-ink-muted">{copy.fontFilters.latin}</span> : null}
                </span>
                <span className="block truncate pt-1 text-base" style={{ fontFamily: `"${font.family}", system-ui` }}>{SAMPLE}</span>
              </button>
            );
          })}
        </div>
      ) : (
        <p className="rounded-lg bg-ink/[0.04] p-4 text-center text-xs text-ink-muted">{copy.noFonts}</p>
      )}
    </div>
  );
}

function FontUploader({ value, onChange, slot, licensed }: { value: Extract<FontChoice, { kind: "upload" }>; onChange: (font: FontChoice) => void; slot: "body" | "heading"; licensed: boolean }) {
  const { t } = useAdminLocale();
  const copy = t.setupWizard.brand;
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [weight, setWeight] = React.useState(400);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const id = React.useId();
  const source = LICENSED_FONTS.find((f) => f.family === value.family)?.source;

  const upload = async (files: File[]) => {
    setUploading(true);
    setError("");
    let current = value;
    try {
      for (const file of files) {
        const fileWeight = weightFromFileName(file.name) ?? weight;
        const data = await uploadFileDirectly(file, { entityType: "company_font", entityId: `${slot}-${fileWeight}`, customName: file.name });
        if (!data.success) throw new Error(data.error);
        current = { ...current, files: [...current.files.filter((f) => f.weight !== fileWeight), { weight: fileWeight, url: data.fileUrl }] };
        onChange(current);
      }
    } catch (err) {
      setError(errorMessage(err, t, copy.uploadFont));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="space-y-3">
      {licensed ? (
        <div className="space-y-3">
          <p className="rounded-lg bg-accent/[0.07] p-3 text-xs leading-relaxed text-ink">{copy.licensedIntro}</p>
          <div className="grid gap-2" role="radiogroup" aria-label={copy.fontSource.licensed}>
            {LICENSED_FONTS.map((font) => (
              <button
                key={font.family}
                type="button"
                role="radio"
                aria-checked={value.family === font.family}
                onClick={() => onChange({ kind: "upload", family: font.family, files: value.family === font.family ? value.files : [] })}
                className={`rounded-lg border px-3 py-2 text-start text-sm ${value.family === font.family ? "border-accent bg-accent/10 text-ink dark:text-ink" : "border-ink/15 text-ink-muted hover:border-ink/30 dark:text-ink"}`}
              >
                {font.family}
              </button>
            ))}
          </div>
          {source ? (
            <a href={source} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline">
              {copy.getFont}
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          ) : null}
        </div>
      ) : (
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-ink" htmlFor={`${id}-family`}>{copy.fontFamilyName}</label>
          <Input
            id={`${id}-family`}
            dir="ltr"
            value={value.family}
            maxLength={60}
            onChange={(e) => onChange({ ...value, family: e.target.value.replace(/[^A-Za-z0-9 ]/g, "") })}
            className="rounded-lg"
          />
        </div>
      )}
      <div className="flex flex-wrap items-end gap-2">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-ink" htmlFor={`${id}-weight`}>{copy.fontWeight}</label>
          <Select id={`${id}-weight`} value={weight} onChange={(e) => setWeight(Number(e.target.value))} className="w-28 rounded-lg">
            {WEIGHTS.map((w) => <option key={w} value={w}>{w}</option>)}
          </Select>
        </div>
        <input
          ref={fileRef}
          type="file"
          multiple
          accept={FONT_EXTENSIONS.map((e) => `.${e}`).join(",")}
          className="hidden"
          onChange={(e) => e.target.files?.length && upload(Array.from(e.target.files))}
        />
        <button
          type="button"
          disabled={uploading || !value.family}
          onClick={() => fileRef.current?.click()}
          className="inline-flex h-11 items-center gap-2 whitespace-nowrap rounded-lg border border-ink/20 px-4 text-sm font-medium text-ink hover:border-accent hover:text-accent disabled:opacity-50"
        >
          <Upload className="h-4 w-4" />
          {uploading ? t.setupWizard.assets.uploading : copy.uploadFont}
        </button>
      </div>
      <p className="text-[11px] text-ink-muted">{copy.uploadHint}</p>
      {value.files.length ? (
        <ul className="flex flex-wrap gap-2">
          {[...value.files].sort((a, b) => a.weight - b.weight).map((file) => (
            <li key={file.weight} className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1 text-xs text-ink" style={{ fontFamily: `"${value.family}", system-ui`, fontWeight: file.weight }}>
              {file.weight}
              <button
                type="button"
                aria-label={`${t.setupWizard.assets.remove} ${file.weight}`}
                onClick={() => onChange({ ...value, files: value.files.filter((f) => f.weight !== file.weight) })}
                className="rounded-full p-0.5 hover:bg-accent/20"
              >
                <X className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {error ? <p role="alert" className="text-xs text-rose-600 dark:text-rose-400">{error}</p> : null}
    </div>
  );
}

type FontSource = "google" | "licensed" | "upload" | "system";
const sourceOf = (font: FontChoice): FontSource =>
  font.kind === "upload" ? (LICENSED_FAMILIES.includes(font.family) ? "licensed" : "upload") : font.kind;

function FontField({ label, value, onChange, slot, arabic }: { label: string; value: FontChoice; onChange: (font: FontChoice) => void; slot: "body" | "heading"; arabic: boolean }) {
  const { t } = useAdminLocale();
  const copy = t.setupWizard.brand;
  const sourceId = React.useId();
  const source = sourceOf(value);
  const latinOnly = arabic && value.kind === "google" && FONT_LIBRARY.find((f) => f.family === value.family)?.script === "latin";

  return (
    <fieldset className="space-y-3 rounded-xl border border-ink/15 p-4">
      <legend className="px-1 text-xs font-semibold text-ink">{label}</legend>
      <div className="space-y-1.5">
        <label htmlFor={sourceId} className="sr-only">{label}</label>
        <Select
          id={sourceId}
          value={source}
          onChange={(e) => {
            const next = e.target.value as FontSource;
            if (next === "google") onChange({ kind: "google", family: FONT_LIBRARY[0].family });
            else if (next === "licensed") onChange({ kind: "upload", family: LICENSED_FONTS[0].family, files: [] });
            else if (next === "upload") onChange({ kind: "upload", family: "", files: [] });
            else onChange({ kind: "system" });
          }}
          className="rounded-lg"
        >
          {(["google", "licensed", "upload", "system"] as const).map((s) => <option key={s} value={s}>{copy.fontSource[s]}</option>)}
        </Select>
      </div>

      {value.kind === "google" ? <FontLibrary value={value} onChange={onChange} label={label} /> : null}
      {value.kind === "upload" ? <FontUploader value={value} onChange={onChange} slot={slot} licensed={source === "licensed"} /> : null}
      {latinOnly ? (
        <p className="flex items-start gap-2 rounded-lg bg-amber-500/10 p-2.5 text-xs text-amber-700 dark:text-amber-300">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {copy.latinOnlyWarning}
        </p>
      ) : null}
    </fieldset>
  );
}

function ThemePreview({ theme }: { theme: BrandTheme }) {
  const { t } = useAdminLocale();
  const copy = t.setupWizard.brand;
  const [mode, setMode] = React.useState<"light" | "dark">("light");
  const [surface, setSurface] = React.useState<"admin" | "website">("website");
  const vars = themeVariables(theme);
  const previewMode = surface === "website" ? theme.websiteMode : mode;
  const style = { ...vars.common, ...(previewMode === "dark" ? vars.dark : vars.light), fontSize: "var(--brand-font-size)" } as React.CSSProperties;
  const heading = { fontFamily: "var(--brand-font-heading)", fontWeight: theme.headingWeight, textTransform: theme.headingCase === "uppercase" ? "uppercase" : "none" } as React.CSSProperties;
  const button = { borderRadius: "var(--brand-button-radius)" };
  const toggle = (active: boolean) => `inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs ${active ? "bg-accent text-accent-foreground" : "text-slate-600 dark:text-slate-300"}`;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-300">{copy.preview}</h3>
        <div className="flex gap-2">
          <div className="inline-flex rounded-lg border border-ink/15 p-0.5" role="group" aria-label={copy.preview}>
            {(["website", "admin"] as const).map((s) => (
              <button key={s} type="button" aria-pressed={surface === s} onClick={() => setSurface(s)} className={toggle(surface === s)}>
                {s === "website" ? copy.previewWebsite : copy.previewAdmin}
              </button>
            ))}
          </div>
          <div className="inline-flex rounded-lg border border-ink/15 p-0.5" role="group" aria-label={copy.defaultMode}>
            {(["light", "dark"] as const).map((m) => (
              <button key={m} type="button" aria-pressed={mode === m} aria-label={copy.modes[m]} onClick={() => setMode(m)} className={toggle(mode === m)}>
                {m === "light" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div style={style} className="overflow-hidden rounded-brand border border-ink/15 bg-brand-base p-4" data-testid="theme-preview">
        {surface === "website" ? (
          <div className={`space-y-4 rounded-brand p-6 ${theme.websiteMode === "light" ? "bg-brand-surface text-slate-900" : "bg-tone-10 text-white"}`} style={{ fontFamily: "var(--brand-font-body)" }}>
            <p className={`text-[0.7em] font-semibold uppercase tracking-[0.14em] ${theme.websiteMode === "light" ? "text-accent-pressed" : "text-mint"}`}>{copy.previewHeroEyebrow}</p>
            <h4 className="text-[1.9em] leading-tight" style={heading}>{copy.previewHeroTitle}</h4>
            <p className={`text-[0.9em] leading-relaxed ${theme.websiteMode === "light" ? "text-slate-600" : "text-white/75"}`}>{copy.previewHeroBody}</p>
            <div className="flex flex-wrap gap-2 pt-1">
              <span style={button} className="inline-flex h-10 items-center gap-2 bg-accent-pressed px-4 text-[0.85em] font-semibold text-white">
                {copy.previewButton}
                <ArrowUpRight className="h-4 w-4 rtl:-scale-x-100" />
              </span>
              <span style={button} className={`inline-flex h-10 items-center border px-4 text-[0.85em] font-semibold ${theme.websiteMode === "light" ? "border-slate-300 text-slate-900" : "border-white/30 text-white"}`}>{copy.previewSecondary}</span>
            </div>
          </div>
        ) : (
          <div className="space-y-4 rounded-brand bg-m3-surface-container-low text-m3-on-surface p-5" style={{ fontFamily: "var(--brand-font-body)" }}>
            <div className="flex items-center justify-between gap-3">
              <h4 className="text-[1.375em] font-medium">{copy.previewHeading}</h4>
              <span className="rounded-lg bg-m3-secondary-container px-2.5 py-0.5 text-[0.75em] font-medium text-m3-on-secondary-container">{copy.previewBadge}</span>
            </div>
            <p className="text-[0.875em] leading-relaxed text-m3-on-surface-variant">{copy.previewBody}</p>
            <div className="h-1 overflow-hidden rounded-full bg-m3-secondary-container">
              <div className="h-full w-2/3 rounded-full bg-m3-primary" />
            </div>
            <div className="flex flex-wrap gap-2">
              <span style={button} data-preview-primary className="inline-flex h-10 items-center bg-m3-primary px-4 text-[0.875em] font-medium text-m3-on-primary">{copy.previewButton}</span>
              <span style={button} className="inline-flex h-10 items-center border border-m3-outline px-4 text-[0.875em] font-medium text-m3-primary">{copy.previewSecondary}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StylePresets({ theme, onApply }: { theme: BrandTheme; onApply: (preset: (typeof STYLE_PRESETS)[number]) => void }) {
  const { t } = useAdminLocale();
  const copy = t.setupWizard.brand;
  const href = React.useMemo(() => {
    const families = Array.from(new Set(STYLE_PRESETS.flatMap((p) => [p.theme.fonts.heading, p.theme.fonts.body]).flatMap((f) => (f.kind === "google" ? [f.family] : []))));
    return `https://fonts.googleapis.com/css2?${families.map((f) => `family=${f.replace(/ /g, "+")}`).join("&")}&display=swap`;
  }, []);
  useStylesheet(href);
  return (
    <section className="space-y-3" aria-labelledby="theme-styles">
      <div>
        <h3 id="theme-styles" className="text-sm font-bold text-ink">{copy.stylePresets}</h3>
        <p className="text-xs text-ink-muted">{copy.stylePresetsHint}</p>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {STYLE_PRESETS.map((preset) => {
          const p = preset.theme;
          const active = theme.primary === p.primary && theme.accent === p.accent && JSON.stringify(theme.fonts) === JSON.stringify(p.fonts) && theme.buttonShape === p.buttonShape;
          const family = p.fonts.heading.kind === "google" ? p.fonts.heading.family : undefined;
          return (
            <button
              key={preset.id}
              type="button"
              aria-pressed={active}
              onClick={() => onApply(preset)}
              className={`space-y-2 rounded-xl border p-3 text-start transition-colors ${active ? "border-accent bg-accent/10" : "border-ink/15 hover:border-ink/30"}`}
            >
              <span className={`flex h-10 items-end gap-1 overflow-hidden p-1.5 ${p.websiteMode === "light" ? "bg-slate-100" : "bg-slate-900"}`} style={{ borderRadius: p.buttonShape === "pill" ? 12 : p.buttonShape === "square" ? 0 : 6 }}>
                <span className="h-full w-2/3 rounded-sm" style={{ background: p.primary }} />
                <span className="h-3 w-1/3" style={{ background: p.accent, borderRadius: p.buttonShape === "pill" ? 9999 : p.buttonShape === "square" ? 0 : 3 }} />
              </span>
              <span className="block truncate text-sm text-ink" style={{ fontFamily: family ? `"${family}", system-ui` : undefined, fontWeight: p.headingWeight }}>
                {copy.styleNames[preset.id as keyof typeof copy.styleNames]}
              </span>
              <span className="block truncate text-[11px] text-ink-muted">{family} · {copy.websiteModes[p.websiteMode]}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export function ThemeEditor({ theme, onChange, languages = ["ar", "en"] }: { theme: BrandTheme; onChange: (theme: BrandTheme) => void; languages?: readonly string[] }) {
  const { t } = useAdminLocale();
  const copy = t.setupWizard.brand;
  const normalized = normalizeTheme(theme);
  useThemeFonts(normalized);
  const warnings = themeWarnings(normalized);
  const set = (patch: Partial<BrandTheme>) => onChange({ ...normalized, ...theme, ...patch });
  const arabic = languages.includes("ar");

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)]">
      <div className="space-y-8">
        <StylePresets theme={normalized} onApply={(preset) => set({ ...preset.theme })} />

        <section className="space-y-4" aria-labelledby="theme-colours">
          <h3 id="theme-colours" className="text-sm font-bold text-ink">{copy.colours}</h3>
          <div className="space-y-2">
            <p className="text-xs font-medium text-ink">{copy.presets}</p>
            <div className="flex flex-wrap gap-2">
              {PALETTES.map(([primary, accent]) => {
                const active = normalized.primary === primary && normalized.accent === accent;
                return (
                  <button
                    key={primary + accent}
                    type="button"
                    aria-label={`${primary} / ${accent}`}
                    aria-pressed={active}
                    onClick={() => set({ primary, accent })}
                    className={`flex h-10 w-16 overflow-hidden rounded-lg border-2 transition-colors ${active ? "border-slate-900 dark:border-white" : "border-transparent"}`}
                  >
                    <span className="h-full w-1/2" style={{ background: primary }} />
                    <span className="h-full w-1/2" style={{ background: accent }} />
                  </button>
                );
              })}
            </div>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <ColourField label={copy.primary} hint={copy.primaryHint} value={normalized.primary} onChange={(primary) => set({ primary })} />
            <ColourField label={copy.accent} hint={copy.accentHint} value={normalized.accent} onChange={(accent) => set({ accent })} />
          </div>
          <div aria-live="polite" className={`flex items-start gap-2 rounded-lg p-3 text-xs ${warnings.length ? "bg-amber-500/10 text-amber-700 dark:text-amber-300" : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"}`}>
            {warnings.length ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />}
            <div>
              {warnings.length ? (
                <ul className="space-y-1">{warnings.map((w) => <li key={w}>{copy.warnings[w]}</li>)}</ul>
              ) : (
                copy.contrastOk
              )}
            </div>
          </div>
        </section>

        <section className="space-y-4" aria-labelledby="theme-fonts">
          <h3 id="theme-fonts" className="text-sm font-bold text-ink">{copy.fonts}</h3>
          <div className="grid gap-4 xl:grid-cols-2">
            <FontField slot="body" arabic={arabic} label={copy.bodyFont} value={theme.fonts.body} onChange={(body) => set({ fonts: { ...theme.fonts, body } })} />
            <FontField slot="heading" arabic={arabic} label={copy.headingFont} value={theme.fonts.heading} onChange={(heading) => set({ fonts: { ...theme.fonts, heading } })} />
          </div>
        </section>

        <section className="space-y-5" aria-labelledby="theme-type">
          <h3 id="theme-type" className="text-sm font-bold text-ink">{copy.typography}</h3>
          <p className="text-xs text-ink-muted">{copy.adminShapeHint}</p>
          <div className="grid gap-5 sm:grid-cols-2">
            <ChoiceGroup label={copy.fontScale} options={SCALES} value={normalized.fontScale} onChange={(fontScale) => set({ fontScale })} render={(s) => copy.fontScales[s]} />
            <ChoiceGroup
              label={copy.headingWeight}
              options={HEADING_WEIGHTS}
              value={normalized.headingWeight}
              onChange={(headingWeight) => set({ headingWeight })}
              render={(w) => <span style={{ fontWeight: w }}>{copy.headingWeights[String(w) as keyof typeof copy.headingWeights]}</span>}
            />
            {languages.includes("en") ? (
              <ChoiceGroup label={copy.headingCase} options={["normal", "uppercase"] as const} value={normalized.headingCase} onChange={(headingCase) => set({ headingCase })} render={(c) => copy.headingCases[c]} />
            ) : null}
            <ChoiceGroup label={copy.surface} options={["tinted", "neutral"] as const} value={normalized.surface} onChange={(surface) => set({ surface })} render={(s) => copy.surfaces[s]} />
            <ChoiceGroup label={copy.websiteMode} options={["dark", "light"] as const} value={normalized.websiteMode} onChange={(websiteMode) => set({ websiteMode })} render={(m) => copy.websiteModes[m]} />
            <ChoiceGroup
              label={copy.radius}
              options={RADII}
              value={normalized.radius}
              onChange={(radius) => set({ radius })}
              render={(r) => copy.radiusOptions[r]}
            />
            <ChoiceGroup label={copy.buttonShape} options={SHAPES} value={normalized.buttonShape} onChange={(buttonShape) => set({ buttonShape })} render={(s) => copy.buttonShapes[s]} />
            <ChoiceGroup label={copy.defaultMode} options={MODES} value={normalized.defaultMode} onChange={(defaultMode) => set({ defaultMode })} render={(m) => copy.modes[m]} />
          </div>
        </section>
      </div>

      <div className="lg:sticky lg:top-6 lg:self-start">
        <ThemePreview theme={normalized} />
      </div>
    </div>
  );
}

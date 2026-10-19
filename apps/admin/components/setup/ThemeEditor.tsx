"use client";

import * as React from "react";
import { Upload, X, CheckCircle2, AlertTriangle, Sun, Moon } from "lucide-react";
import { Input, Select } from "@platform/ui";
import {
  CURATED_FONTS,
  googleFontsHref,
  normalizeTheme,
  themeStylesheet,
  themeVariables,
  themeWarnings,
  type BrandTheme,
  type FontChoice,
  type ThemeMode,
  type ThemeRadius,
} from "@platform/database/constants/theme";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { uploadFileDirectly } from "../../lib/upload-client";
import { errorMessage } from "../../lib/error-text";

/** Starting palettes (primary, accent); any colour can still be picked. */
const PALETTES: [string, string][] = [
  ["#312E81", "#4F46E5"],
  ["#0C4A6E", "#0284C7"],
  ["#064E3B", "#059669"],
  ["#134E4A", "#0D9488"],
  ["#7F1D1D", "#DC2626"],
  ["#78350F", "#D97706"],
  ["#4A044E", "#A21CAF"],
  ["#1F2937", "#2563EB"],
];
const RADII: ThemeRadius[] = ["none", "sm", "md", "lg", "xl"];
const MODES: ThemeMode[] = ["light", "dark", "system"];
const WEIGHTS = [300, 400, 500, 600, 700, 800, 900];

/** Loads the theme's fonts into this page so the preview shows the real typefaces. */
function useThemeFonts(theme: BrandTheme) {
  const href = googleFontsHref(theme);
  const faces = themeStylesheet(theme).split(":root{")[0];
  React.useEffect(() => {
    if (!href) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
    return () => link.remove();
  }, [href]);
  React.useEffect(() => {
    if (!faces) return;
    const style = document.createElement("style");
    style.textContent = faces;
    document.head.appendChild(style);
    return () => style.remove();
  }, [faces]);
}

function ColourField({ label, hint, value, onChange }: { label: string; hint: string; value: string; onChange: (hex: string) => void }) {
  const id = React.useId();
  const [draft, setDraft] = React.useState(value);
  React.useEffect(() => setDraft(value), [value]);
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-xs font-medium text-slate-700 dark:text-slate-300">{label}</label>
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
      <p className="text-[11px] text-slate-500 dark:text-slate-400">{hint}</p>
    </div>
  );
}

function FontField({ label, value, onChange, slot }: { label: string; value: FontChoice; onChange: (font: FontChoice) => void; slot: "body" | "heading" }) {
  const { t } = useAdminLocale();
  const copy = t.setupWizard.brand;
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [weight, setWeight] = React.useState(400);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const sourceId = React.useId();

  const upload = async (file: File) => {
    setUploading(true);
    setError("");
    try {
      const data = await uploadFileDirectly(file, { entityType: "company_font", entityId: `${slot}-${weight}`, customName: file.name });
      if (!data.success) throw new Error(data.error);
      const current = value.kind === "upload" ? value : { kind: "upload" as const, family: "", files: [] };
      onChange({ ...current, files: [...current.files.filter((f) => f.weight !== weight), { weight, url: data.fileUrl }] });
    } catch (err) {
      setError(errorMessage(err, t, copy.uploadFont));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <fieldset className="space-y-3 rounded-xl border border-ink/15 p-4">
      <legend className="px-1 text-xs font-semibold text-slate-700 dark:text-slate-300">{label}</legend>
      <div className="space-y-1.5">
        <label htmlFor={sourceId} className="sr-only">{label}</label>
        <Select
          id={sourceId}
          value={value.kind}
          onChange={(e) => {
            const kind = e.target.value as FontChoice["kind"];
            if (kind === "google") onChange({ kind, family: CURATED_FONTS[0].family });
            else if (kind === "upload") onChange({ kind, family: "", files: [] });
            else onChange({ kind: "system" });
          }}
          className="rounded-lg"
        >
          <option value="google">{copy.fontSource.google}</option>
          <option value="upload">{copy.fontSource.upload}</option>
          <option value="system">{copy.fontSource.system}</option>
        </Select>
      </div>

      {value.kind === "google" ? (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2" role="radiogroup" aria-label={label}>
          {CURATED_FONTS.map((font) => (
            <button
              key={font.family}
              type="button"
              role="radio"
              aria-checked={value.family === font.family}
              onClick={() => onChange({ kind: "google", family: font.family })}
              className={`rounded-lg border px-3 py-2 text-start text-sm transition-colors ${value.family === font.family ? "border-accent bg-accent/10 text-slate-900 dark:text-white" : "border-ink/15 text-slate-600 hover:border-ink/30 dark:text-slate-300"}`}
              style={{ fontFamily: `"${font.family}", system-ui` }}
            >
              <span className="block truncate">{font.family}</span>
              <span className="block truncate text-xs opacity-70">{copy.fontSample}</span>
            </button>
          ))}
        </div>
      ) : null}

      {value.kind === "upload" ? (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300" htmlFor={`${sourceId}-family`}>{copy.fontFamilyName}</label>
            <Input
              id={`${sourceId}-family`}
              dir="ltr"
              value={value.family}
              maxLength={60}
              onChange={(e) => onChange({ ...value, family: e.target.value.replace(/[^A-Za-z0-9 ]/g, "") })}
              className="rounded-lg"
            />
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300" htmlFor={`${sourceId}-weight`}>{copy.fontWeight}</label>
              <Select id={`${sourceId}-weight`} value={weight} onChange={(e) => setWeight(Number(e.target.value))} className="w-28 rounded-lg">
                {WEIGHTS.map((w) => <option key={w} value={w}>{w}</option>)}
              </Select>
            </div>
            <input ref={fileRef} type="file" accept=".woff2,font/woff2" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
            <button
              type="button"
              disabled={uploading || !value.family}
              onClick={() => fileRef.current?.click()}
              className="inline-flex h-11 items-center gap-2 whitespace-nowrap rounded-lg border border-ink/20 px-4 text-sm font-medium text-slate-700 hover:border-accent hover:text-accent disabled:opacity-50 dark:text-slate-200"
            >
              <Upload className="h-4 w-4" />
              {uploading ? t.setupWizard.assets.uploading : copy.uploadFont}
            </button>
          </div>
          {value.files.length ? (
            <ul className="flex flex-wrap gap-2">
              {[...value.files].sort((a, b) => a.weight - b.weight).map((file) => (
                <li key={file.weight} className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1 text-xs text-slate-700 dark:text-slate-200">
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
      ) : null}
    </fieldset>
  );
}

export function ThemePreview({ theme }: { theme: BrandTheme }) {
  const { t } = useAdminLocale();
  const copy = t.setupWizard.brand;
  const [mode, setMode] = React.useState<"light" | "dark">("light");
  const vars = themeVariables(theme);
  const style = { ...vars.common, ...(mode === "dark" ? vars.dark : vars.light) } as React.CSSProperties;
  const dark = mode === "dark";
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-300">{copy.preview}</h3>
        <div className="inline-flex rounded-lg border border-ink/15 p-0.5" role="group" aria-label={copy.defaultMode}>
          {(["light", "dark"] as const).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={mode === m}
              onClick={() => setMode(m)}
              className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs ${mode === m ? "bg-accent text-accent-foreground" : "text-slate-600 dark:text-slate-300"}`}
            >
              {m === "light" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
              {copy.modes[m]}
            </button>
          ))}
        </div>
      </div>
      <div style={style} className="overflow-hidden border border-ink/15 bg-brand-base p-4" data-testid="theme-preview">
        <div className="space-y-4 rounded-brand bg-brand-surface p-5 shadow-sm" style={{ fontFamily: "var(--brand-font-body)" }}>
          <div className="flex items-center justify-between gap-3">
            <h4 className={`text-lg font-bold ${dark ? "text-white" : "text-slate-900"}`} style={{ fontFamily: "var(--brand-font-heading)" }}>{copy.previewHeading}</h4>
            <span className="rounded-full bg-accent/15 px-2.5 py-0.5 text-xs font-semibold text-brand-text">{copy.previewBadge}</span>
          </div>
          <p className={`text-sm leading-relaxed ${dark ? "text-ink-muted" : "text-slate-600"}`}>{copy.previewBody}</p>
          <div className={`h-2 overflow-hidden rounded-full ${dark ? "bg-tone-20" : "bg-tone-90"}`}>
            <div className="h-full w-2/3 rounded-full bg-accent" />
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex h-10 items-center rounded-brand bg-primary px-4 text-sm font-semibold text-primary-foreground">{copy.previewButton}</span>
            <span className="inline-flex h-10 items-center rounded-brand border border-accent px-4 text-sm font-semibold text-brand-text">{copy.previewSecondary}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ThemeEditor({ theme, onChange }: { theme: BrandTheme; onChange: (theme: BrandTheme) => void }) {
  const { t } = useAdminLocale();
  const copy = t.setupWizard.brand;
  const normalized = normalizeTheme(theme);
  useThemeFonts(normalized);
  const warnings = themeWarnings(normalized);
  const set = (patch: Partial<BrandTheme>) => onChange({ ...theme, ...patch });

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)]">
      <div className="space-y-8">
        <section className="space-y-4" aria-labelledby="theme-colours">
          <h3 id="theme-colours" className="text-sm font-bold text-slate-900 dark:text-white">{copy.colours}</h3>
          <div className="space-y-2">
            <p className="text-xs font-medium text-slate-700 dark:text-slate-300">{copy.presets}</p>
            <div className="flex flex-wrap gap-2">
              {PALETTES.map(([primary, accent]) => {
                const active = theme.primary === primary && theme.accent === accent;
                return (
                  <button
                    key={primary + accent}
                    type="button"
                    aria-label={`${primary} / ${accent}`}
                    aria-pressed={active}
                    onClick={() => set({ primary, accent })}
                    className={`flex h-10 w-16 overflow-hidden rounded-lg border-2 transition-transform hover:scale-105 ${active ? "border-slate-900 dark:border-white" : "border-transparent"}`}
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
          <h3 id="theme-fonts" className="text-sm font-bold text-slate-900 dark:text-white">{copy.fonts}</h3>
          <div className="grid gap-4 xl:grid-cols-2">
            <FontField slot="body" label={copy.bodyFont} value={theme.fonts.body} onChange={(body) => set({ fonts: { ...theme.fonts, body } })} />
            <FontField slot="heading" label={copy.headingFont} value={theme.fonts.heading} onChange={(heading) => set({ fonts: { ...theme.fonts, heading } })} />
          </div>
        </section>

        <section className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <p className="text-xs font-medium text-slate-700 dark:text-slate-300">{copy.radius}</p>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={copy.radius}>
              {RADII.map((r) => (
                <button
                  key={r}
                  type="button"
                  role="radio"
                  aria-checked={theme.radius === r}
                  onClick={() => set({ radius: r })}
                  className={`whitespace-nowrap border px-3 py-1.5 text-xs ${theme.radius === r ? "border-accent bg-accent/10 text-slate-900 dark:text-white" : "border-ink/15 text-slate-600 dark:text-slate-300"}`}
                  style={{ borderRadius: { none: 0, sm: 4, md: 8, lg: 12, xl: 16 }[r] }}
                >
                  {copy.radiusOptions[r]}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-medium text-slate-700 dark:text-slate-300">{copy.defaultMode}</p>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={copy.defaultMode}>
              {MODES.map((m) => (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={theme.defaultMode === m}
                  onClick={() => set({ defaultMode: m })}
                  className={`whitespace-nowrap rounded-lg border px-3 py-1.5 text-xs ${theme.defaultMode === m ? "border-accent bg-accent/10 text-slate-900 dark:text-white" : "border-ink/15 text-slate-600 dark:text-slate-300"}`}
                >
                  {copy.modes[m]}
                </button>
              ))}
            </div>
          </div>
        </section>
      </div>

      <div className="lg:sticky lg:top-6 lg:self-start">
        <ThemePreview theme={normalized} />
      </div>
    </div>
  );
}

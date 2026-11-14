"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Loader2, Palette, Save } from "lucide-react";
import {
  FONT_LIBRARY,
  HEADING_WEIGHTS,
  STYLE_PRESETS,
  normalizeTheme,
  themeWarnings,
  type BrandTheme,
  type ThemeFontScale,
  type ThemeHeadingCase,
  type ThemeMode,
  type ThemeSurface,
  type WebsiteMode,
} from "@platform/config/constants/theme";
import { saveCompanyAction } from "../app/(desk)/company/actions";
import { useCopy } from "./CopyProvider";

const PALETTES: [string, string][] = [
  ["#1E3A8A", "#2563EB"],
  ["#312E81", "#4F46E5"],
  ["#0C4A6E", "#0284C7"],
  ["#064E3B", "#059669"],
  ["#134E4A", "#0D9488"],
  ["#7F1D1D", "#DC2626"],
  ["#78350F", "#D97706"],
  ["#4A044E", "#A21CAF"],
  ["#111827", "#374151"],
];

const MODES: ThemeMode[] = ["light", "dark", "system"];
const WEBSITE_MODES: WebsiteMode[] = ["dark", "light"];
const SCALES: ThemeFontScale[] = ["sm", "md", "lg"];
const SURFACES: ThemeSurface[] = ["tinted", "neutral"];
const HEADING_CASES: ThemeHeadingCase[] = ["normal", "uppercase"];

export function CompanyThemeTab({
  initialTheme,
  canEdit,
}: {
  initialTheme: unknown;
  canEdit: boolean;
}) {
  const { copy } = useCopy();
  const c = copy.company;
  const ap = c.appearance;
  const router = useRouter();

  const [theme, setTheme] = React.useState<BrandTheme>(() => normalizeTheme(initialTheme));
  const [saved, setSaved] = React.useState<BrandTheme>(() => normalizeTheme(initialTheme));
  const [saving, setSaving] = React.useState(false);

  const dirty = JSON.stringify(theme) !== JSON.stringify(saved);
  const warnings = themeWarnings(theme);

  const set = (patch: Partial<BrandTheme>) => {
    setTheme((prev) => normalizeTheme({ ...prev, ...patch }));
  };

  const handleSave = async () => {
    if (!canEdit) return;
    setSaving(true);
    try {
      const res = await saveCompanyAction({ theme: theme as unknown as never });
      if (!res.ok) {
        toast.error(c[res.reason] || c.failed);
        return;
      }
      setSaved(theme);
      toast.success(ap.saved);
      router.refresh();
    } catch {
      toast.error(c.failed);
    } finally {
      setSaving(false);
    }
  };

  const googleFonts = FONT_LIBRARY.map((f) => f.family);

  return (
    <div className="it-card space-y-5 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-300 dark:border-slate-700 pb-3">
        <div className="flex items-center gap-2">
          <Palette className="size-4 text-sky-600" />
          <div>
            <h2 className="font-bold uppercase font-mono text-ink">{ap.title}</h2>
            <p className="text-[11px] text-ink-muted">{ap.subtitle}</p>
          </div>
        </div>
        {canEdit && (
          <button
            type="button"
            disabled={!dirty || saving}
            onClick={handleSave}
            className="it-btn-3d px-4 py-1.5 font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5 disabled:opacity-50"
          >
            {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
            <span>{saving ? ap.saving : ap.save}</span>
          </button>
        )}
      </div>

      {/* Style Presets */}
      <section className="space-y-2">
        <h3 className="font-bold font-mono uppercase text-ink-muted">{ap.presetsTitle}</h3>
        <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {STYLE_PRESETS.map((preset) => {
            const p = preset.theme;
            const active =
              theme.primary === p.primary &&
              theme.accent === p.accent &&
              theme.websiteMode === p.websiteMode;
            return (
              <button
                key={preset.id}
                type="button"
                disabled={!canEdit}
                onClick={() => set({ ...p })}
                className={`border p-2.5 text-start transition ${
                  active
                    ? "border-sky-600 bg-sky-50 dark:bg-sky-950/30"
                    : "border-slate-300 dark:border-slate-700 bg-surface hover:border-slate-400"
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="size-3.5 border border-black/15" style={{ background: p.primary }} />
                  <span className="size-3.5 border border-black/15" style={{ background: p.accent }} />
                  <span className="font-bold font-mono text-ink truncate">{preset.id}</span>
                </div>
                <p className="text-[10px] text-ink-muted truncate">
                  {p.fonts.heading.kind === "google" ? p.fonts.heading.family : "System"} · {p.websiteMode}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {/* Colors */}
      <section className="space-y-3 border-t border-slate-200 dark:border-slate-800 pt-4">
        <h3 className="font-bold font-mono uppercase text-ink-muted">{ap.colorsTitle}</h3>
        <div className="flex flex-wrap gap-2">
          {PALETTES.map(([primary, accent]) => {
            const active = theme.primary === primary && theme.accent === accent;
            return (
              <button
                key={primary + accent}
                type="button"
                disabled={!canEdit}
                onClick={() => set({ primary, accent })}
                aria-label={`${primary} / ${accent}`}
                className={`flex h-8 w-14 overflow-hidden border-2 ${
                  active ? "border-sky-600" : "border-slate-300 dark:border-slate-700"
                }`}
              >
                <span className="h-full w-1/2" style={{ background: primary }} />
                <span className="h-full w-1/2" style={{ background: accent }} />
              </button>
            );
          })}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1">
            <span className="font-bold text-ink-muted">{ap.primaryColor}</span>
            <div className="flex items-center gap-2">
              <input
                type="color"
                disabled={!canEdit}
                value={theme.primary}
                onChange={(e) => set({ primary: e.target.value.toUpperCase() })}
                className="h-9 w-12 cursor-pointer border border-slate-300 bg-transparent p-0.5"
              />
              <input
                dir="ltr"
                disabled={!canEdit}
                value={theme.primary}
                maxLength={7}
                onChange={(e) => {
                  const v = e.target.value.trim().toUpperCase();
                  if (/^#[0-9A-F]{6}$/.test(v)) set({ primary: v });
                }}
                className="it-field-sunken w-full font-mono uppercase"
              />
            </div>
          </label>
          <label className="block space-y-1">
            <span className="font-bold text-ink-muted">{ap.accentColor}</span>
            <div className="flex items-center gap-2">
              <input
                type="color"
                disabled={!canEdit}
                value={theme.accent}
                onChange={(e) => set({ accent: e.target.value.toUpperCase() })}
                className="h-9 w-12 cursor-pointer border border-slate-300 bg-transparent p-0.5"
              />
              <input
                dir="ltr"
                disabled={!canEdit}
                value={theme.accent}
                maxLength={7}
                onChange={(e) => {
                  const v = e.target.value.trim().toUpperCase();
                  if (/^#[0-9A-F]{6}$/.test(v)) set({ accent: v });
                }}
                className="it-field-sunken w-full font-mono uppercase"
              />
            </div>
          </label>
        </div>
        <div
          className={`flex items-center gap-2 border p-2 text-[11px] font-mono ${
            warnings.length
              ? "border-amber-400 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300"
              : "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300"
          }`}
        >
          {warnings.length ? (
            <>
              <AlertTriangle className="size-3.5 shrink-0" />
              <span>{warnings.join(", ")}</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="size-3.5 shrink-0" />
              <span>{ap.contrastOk}</span>
            </>
          )}
        </div>
      </section>

      {/* Modes & Typography */}
      <section className="space-y-3 border-t border-slate-200 dark:border-slate-800 pt-4">
        <h3 className="font-bold font-mono uppercase text-ink-muted">{ap.typographyTitle}</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="block space-y-1">
            <span className="font-bold text-ink-muted">{ap.defaultMode}</span>
            <select
              disabled={!canEdit}
              value={theme.defaultMode}
              onChange={(e) => set({ defaultMode: e.target.value as ThemeMode })}
              className="it-field-sunken w-full font-mono"
            >
              {MODES.map((m) => (
                <option key={m} value={m}>
                  {ap.modes[m]}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1">
            <span className="font-bold text-ink-muted">{ap.websiteMode}</span>
            <select
              disabled={!canEdit}
              value={theme.websiteMode}
              onChange={(e) => set({ websiteMode: e.target.value as WebsiteMode })}
              className="it-field-sunken w-full font-mono"
            >
              {WEBSITE_MODES.map((m) => (
                <option key={m} value={m}>
                  {ap.websiteModes[m]}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1">
            <span className="font-bold text-ink-muted">{ap.surface}</span>
            <select
              disabled={!canEdit}
              value={theme.surface}
              onChange={(e) => set({ surface: e.target.value as ThemeSurface })}
              className="it-field-sunken w-full font-mono"
            >
              {SURFACES.map((s) => (
                <option key={s} value={s}>
                  {ap.surfaces[s]}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1">
            <span className="font-bold text-ink-muted">{ap.fontScale}</span>
            <select
              disabled={!canEdit}
              value={theme.fontScale}
              onChange={(e) => set({ fontScale: e.target.value as ThemeFontScale })}
              className="it-field-sunken w-full font-mono"
            >
              {SCALES.map((s) => (
                <option key={s} value={s}>
                  {s.toUpperCase()}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1">
            <span className="font-bold text-ink-muted">{ap.headingWeight}</span>
            <select
              disabled={!canEdit}
              value={theme.headingWeight}
              onChange={(e) => set({ headingWeight: Number(e.target.value) })}
              className="it-field-sunken w-full font-mono"
            >
              {HEADING_WEIGHTS.map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1">
            <span className="font-bold text-ink-muted">{ap.headingCase}</span>
            <select
              disabled={!canEdit}
              value={theme.headingCase}
              onChange={(e) => set({ headingCase: e.target.value as ThemeHeadingCase })}
              className="it-field-sunken w-full font-mono"
            >
              {HEADING_CASES.map((hc) => (
                <option key={hc} value={hc}>
                  {hc}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1">
            <span className="font-bold text-ink-muted">{ap.bodyFont}</span>
            <select
              disabled={!canEdit}
              value={theme.fonts.body.kind === "google" ? theme.fonts.body.family : "__system__"}
              onChange={(e) =>
                set({
                  fonts: {
                    ...theme.fonts,
                    body:
                      e.target.value === "__system__"
                        ? { kind: "system" }
                        : { kind: "google", family: e.target.value },
                  },
                })
              }
              className="it-field-sunken w-full font-mono"
            >
              <option value="__system__">{ap.systemFont}</option>
              {googleFonts.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1">
            <span className="font-bold text-ink-muted">{ap.headingFont}</span>
            <select
              disabled={!canEdit}
              value={theme.fonts.heading.kind === "google" ? theme.fonts.heading.family : "__system__"}
              onChange={(e) =>
                set({
                  fonts: {
                    ...theme.fonts,
                    heading:
                      e.target.value === "__system__"
                        ? { kind: "system" }
                        : { kind: "google", family: e.target.value },
                  },
                })
              }
              className="it-field-sunken w-full font-mono"
            >
              <option value="__system__">{ap.systemFont}</option>
              {googleFonts.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>
    </div>
  );
}

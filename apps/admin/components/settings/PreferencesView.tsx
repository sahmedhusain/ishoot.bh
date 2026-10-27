"use client";

import * as React from "react";
import { Button, SegmentedButton } from "@platform/ui";
import { Check, Globe, Laptop, Moon, RotateCcw, Sun } from "lucide-react";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { useAdminTheme, type AdminTheme } from "../../hooks/useAdminTheme";
import {
  ADMIN_DESIGN_PRESETS,
  APPEARANCE_OPTIONS,
  DEFAULT_APPEARANCE,
  type AdminAppearance,
} from "../../lib/admin-appearance";
import { SettingsNavTabs } from "./SettingsNavTabs";

function ChoiceRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="appearance-control-row">
      <span>{label}</span>
      {children}
    </div>
  );
}

export function PreferencesView() {
  const { t, locale, setLocale } = useAdminLocale();
  const { theme, setTheme, appearance, setAppearance } = useAdminTheme();
  const copy = t.appearance;
  const selectedPreset = Object.entries(ADMIN_DESIGN_PRESETS).find(
    ([, preset]) =>
      Object.keys(DEFAULT_APPEARANCE).every(
        (key) =>
          preset[key as keyof AdminAppearance] ===
          appearance[key as keyof AdminAppearance],
      ),
  )?.[0];
  const choices = <K extends keyof AdminAppearance>(key: K) => (
    <ChoiceRow key={key} label={copy[key]}>
      <SegmentedButton
        label={copy[key]}
        value={appearance[key]}
        onChange={(value) => setAppearance({ ...appearance, [key]: value })}
        options={APPEARANCE_OPTIONS[key].map((value) => ({
          value,
          label: (copy.options[key] as Record<string, string>)[value],
        }))}
      />
    </ChoiceRow>
  );

  return (
    <div className="max-w-6xl mx-auto pb-10">
      <SettingsNavTabs />
      <header className="flex flex-col sm:flex-row justify-between gap-6 mb-8" data-page-header>
        <div>
          <h1 className="text-ink">{copy.title}</h1>
          <p className="text-ink-muted">{copy.subtitle}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => setAppearance(DEFAULT_APPEARANCE)}
          className="self-start shrink-0"
        >
          <RotateCcw aria-hidden className="w-4 h-4" />
          {copy.reset}
        </Button>
      </header>

      <section
        className="appearance-section appearance-section-header"
        aria-labelledby="appearance-mode"
       data-page-section>
        <div>
          <h2 id="appearance-mode">{copy.modeTitle}</h2>
          <p>{copy.modeDescription}</p>
        </div>
        <div>
          <ChoiceRow label={t.preferences.themeTitle}>
            <SegmentedButton<AdminTheme>
              label={t.preferences.themeTitle}
              value={theme}
              onChange={setTheme}
              options={[
                {
                  value: "light",
                  label: t.preferences.lightTitle,
                  icon: <Sun />,
                },
                {
                  value: "dark",
                  label: t.preferences.darkTitle,
                  icon: <Moon />,
                },
                {
                  value: "system",
                  label: t.preferences.systemTitle,
                  icon: <Laptop />,
                },
              ]}
            />
          </ChoiceRow>
          <ChoiceRow label={t.preferences.sysLangTitle}>
            <SegmentedButton<"ar" | "en">
              label={t.preferences.sysLangTitle}
              value={locale}
              onChange={setLocale}
              options={[
                {
                  value: "ar",
                  label: t.preferences.arabicLabel,
                  icon: <Globe />,
                },
                {
                  value: "en",
                  label: t.preferences.englishLabel,
                  icon: <Globe />,
                },
              ]}
            />
          </ChoiceRow>
        </div>
      </section>

      <section
        className="appearance-section appearance-section-header"
        aria-labelledby="appearance-workspace"
       data-page-section>
        <div>
          <h2 id="appearance-workspace">{copy.workspaceTitle}</h2>
          <p>{copy.workspaceDescription}</p>
          <span className="inline-flex mt-4 text-xs font-medium text-primary">
            {selectedPreset
              ? copy.presets[selectedPreset as keyof typeof copy.presets].name
              : copy.custom}
          </span>
        </div>
        <div className="space-y-5">
          <div className="appearance-options">
            {Object.entries(ADMIN_DESIGN_PRESETS).map(([id, preset]) => (
              <button
                key={id}
                type="button"
                data-preset={id}
                className="appearance-preset"
                aria-pressed={selectedPreset === id}
                onClick={() => setAppearance(preset)}
              >
                <span className="appearance-miniature" aria-hidden>
                  <i />
                  <span>
                    <b />
                    <em />
                  </span>
                </span>
                <span className="flex items-center justify-between gap-2 text-sm font-semibold">
                  <bdi dir="auto">{copy.presets[id as keyof typeof copy.presets].name}</bdi>
                  {selectedPreset === id && (
                    <Check aria-hidden className="w-4 h-4 text-primary" />
                  )}
                </span>
                <p>
                  {copy.presets[id as keyof typeof copy.presets].description}
                </p>
              </button>
            ))}
          </div>
          <div>
            {choices("density")}
            {choices("corners")}
            {choices("borders")}
          </div>
        </div>
      </section>

      <section
        className="appearance-section appearance-section-header"
        aria-labelledby="appearance-overlays"
       data-page-section>
        <div>
          <h2 id="appearance-overlays">{copy.overlaysTitle}</h2>
          <p>{copy.overlaysDescription}</p>
        </div>
        <div>
          {choices("dialogPlacement")}
          {choices("backdrop")}
          {choices("motion")}
        </div>
      </section>
      <p className="border-t border-outline-variant pt-5 text-xs leading-relaxed text-ink-muted">
        {copy.personalHint}
      </p>
    </div>
  );
}

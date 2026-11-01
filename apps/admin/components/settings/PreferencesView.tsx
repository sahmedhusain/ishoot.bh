"use client";

import * as React from "react";
import { LANGUAGES, isLocale, type Locale } from "@platform/locales/registry";
import {
  Button,
  Input,
  Select,
  SegmentedButton,
  useConfirmation,
} from "@platform/ui";
import {
  Check,
  CheckCircle2,
  Globe,
  Laptop,
  LayoutDashboard,
  Moon,
  RotateCcw,
  Save,
  Sparkles,
  Sun,
  Undo2,
} from "lucide-react";
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
  const confirmAction = useConfirmation();
  const { t, locale, setLocale } = useAdminLocale();
  const {
    theme,
    setTheme,
    appearance,
    setAppearance,
    webTheme,
    setWebTheme,
    webAppearance,
    setWebAppearance,
  } = useAdminTheme();
  const copy = t.appearance;

  const [targetScope, setTargetScope] = React.useState<"admin" | "web">(
    "admin",
  );
  const [draftTheme, setDraftTheme] = React.useState<AdminTheme>(theme);
  const [draftLocale, setDraftLocale] = React.useState<Locale>(locale);
  const [draftAppearance, setDraftAppearance] =
    React.useState<AdminAppearance>(appearance);
  const [draftWebTheme, setDraftWebTheme] =
    React.useState<AdminTheme>(webTheme);
  const [draftWebAppearance, setDraftWebAppearance] =
    React.useState<AdminAppearance>(webAppearance);
  const [savedNotice, setSavedNotice] = React.useState(false);

  // Sync draft state when saved context loads from localStorage on mount.
  React.useEffect(() => {
    setDraftTheme(theme);
  }, [theme]);
  React.useEffect(() => {
    setDraftLocale(locale);
  }, [locale]);
  React.useEffect(() => {
    setDraftAppearance(appearance);
  }, [appearance]);
  React.useEffect(() => {
    setDraftWebTheme(webTheme);
  }, [webTheme]);
  React.useEffect(() => {
    setDraftWebAppearance(webAppearance);
  }, [webAppearance]);

  // Live preview of Admin appearance on documentElement while editing, reverting to saved on unmount if unconfirmed.
  const latestSavedAppearanceRef = React.useRef(appearance);
  React.useEffect(() => {
    latestSavedAppearanceRef.current = appearance;
  }, [appearance]);

  React.useEffect(() => {
    for (const [key, entry] of Object.entries(draftAppearance)) {
      document.documentElement.dataset[key] = entry;
    }
  }, [draftAppearance]);

  React.useEffect(() => {
    return () => {
      for (const [key, entry] of Object.entries(
        latestSavedAppearanceRef.current,
      )) {
        document.documentElement.dataset[key] = entry;
      }
    };
  }, []);

  const activeDraftAppearance =
    targetScope === "admin" ? draftAppearance : draftWebAppearance;
  const setActiveDraftAppearance =
    targetScope === "admin" ? setDraftAppearance : setDraftWebAppearance;
  const activeDraftTheme = targetScope === "admin" ? draftTheme : draftWebTheme;
  const setActiveDraftTheme =
    targetScope === "admin" ? setDraftTheme : setDraftWebTheme;

  const isDirty =
    draftTheme !== theme ||
    draftLocale !== locale ||
    JSON.stringify(draftAppearance) !== JSON.stringify(appearance) ||
    draftWebTheme !== webTheme ||
    JSON.stringify(draftWebAppearance) !== JSON.stringify(webAppearance);

  const selectedPreset = Object.entries(ADMIN_DESIGN_PRESETS).find(
    ([, preset]) =>
      Object.keys(DEFAULT_APPEARANCE).every(
        (key) =>
          preset[key as keyof AdminAppearance] ===
          activeDraftAppearance[key as keyof AdminAppearance],
      ),
  )?.[0];

  const choices = <K extends keyof AdminAppearance>(key: K) => (
    <ChoiceRow key={`${targetScope}-${key}`} label={copy[key]}>
      <SegmentedButton
        label={copy[key]}
        value={activeDraftAppearance[key]}
        onChange={(value) => {
          setSavedNotice(false);
          setActiveDraftAppearance({ ...activeDraftAppearance, [key]: value });
        }}
        options={APPEARANCE_OPTIONS[key].map((value) => ({
          value,
          label: (copy.options[key] as Record<string, string>)[value],
        }))}
      />
    </ChoiceRow>
  );

  const handleDiscard = () => {
    setDraftTheme(theme);
    setDraftLocale(locale);
    setDraftAppearance(appearance);
    setDraftWebTheme(webTheme);
    setDraftWebAppearance(webAppearance);
    setSavedNotice(false);
  };

  const handleConfirmSave = () => {
    confirmAction({
      title: copy.confirmSaveTitle,
      description: copy.confirmSaveDescription,
      onConfirm: () => {
        setAppearance(draftAppearance);
        latestSavedAppearanceRef.current = draftAppearance;
        setTheme(draftTheme);
        if (draftLocale !== locale) {
          setLocale(draftLocale);
        }
        setWebAppearance(draftWebAppearance);
        setWebTheme(draftWebTheme);
        setSavedNotice(true);
      },
    });
  };

  const handleConfirmReset = () => {
    confirmAction({
      title: copy.confirmResetTitle,
      description: copy.confirmResetDescription,
      onConfirm: () => {
        if (targetScope === "admin") {
          setDraftAppearance(DEFAULT_APPEARANCE);
          setAppearance(DEFAULT_APPEARANCE);
          latestSavedAppearanceRef.current = DEFAULT_APPEARANCE;
        } else {
          setDraftWebAppearance(DEFAULT_APPEARANCE);
          setWebAppearance(DEFAULT_APPEARANCE);
        }
        setSavedNotice(true);
      },
    });
  };

  // Compute preview radius and spacing tokens for the interactive preview card
  const previewCardRadius =
    activeDraftAppearance.corners === "rounded"
      ? "24px"
      : activeDraftAppearance.corners === "square"
        ? "4px"
        : "var(--company-corner, 14px)";
  const previewFieldRadius =
    activeDraftAppearance.corners === "rounded"
      ? "16px"
      : activeDraftAppearance.corners === "square"
        ? "4px"
        : "10px";
  const previewButtonRadius =
    activeDraftAppearance.corners === "rounded"
      ? "999px"
      : activeDraftAppearance.corners === "square"
        ? "4px"
        : "var(--company-button-corner, 999px)";
  const previewBorderColor =
    activeDraftAppearance.borders === "defined"
      ? "var(--md-sys-color-outline)"
      : "rgb(var(--m3-color-outline-variant) / 0.65)";
  const previewPadding =
    activeDraftAppearance.density === "compact" ? "14px" : "22px";
  const previewControlHeight =
    activeDraftAppearance.density === "compact" ? "36px" : "44px";

  return (
    <div className="max-w-6xl mx-auto pb-24">
      <SettingsNavTabs />
      <header
        className="flex flex-col sm:flex-row justify-between gap-6 mb-6"
        data-page-header
      >
        <div>
          <h1 className="text-ink">{copy.title}</h1>
          <p className="text-ink-muted">{copy.subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 self-start shrink-0">
          {isDirty ? (
            <Button
              type="button"
              variant="ghost"
              onClick={handleDiscard}
              data-testid="appearance-discard"
            >
              <Undo2 aria-hidden className="w-4 h-4" />
              {copy.discardChanges}
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            onClick={handleConfirmReset}
            data-testid="appearance-reset"
          >
            <RotateCcw aria-hidden className="w-4 h-4" />
            {copy.reset}
          </Button>
          <Button
            type="button"
            variant="primary"
            disabled={!isDirty}
            onClick={handleConfirmSave}
            data-testid="appearance-save"
          >
            <Save aria-hidden className="w-4 h-4" />
            {copy.saveChanges}
          </Button>
        </div>
      </header>

      {savedNotice && !isDirty ? (
        <div
          role="status"
          className="mb-6 flex items-center gap-2.5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs font-semibold text-emerald-700 dark:text-emerald-300"
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>{copy.savedMessage}</span>
        </div>
      ) : null}

      {/* Target Scope Selector: Admin Workspace vs Public Website */}
      <div className="mb-6 rounded-2xl border border-outline-variant bg-surface-container-low p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
            {targetScope === "admin" ? (
              <LayoutDashboard className="w-4 h-4" aria-hidden="true" />
            ) : (
              <Globe className="w-4 h-4" aria-hidden="true" />
            )}
          </span>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-ink-muted">
              {copy.targetScope}
            </div>
            <div className="text-sm font-semibold text-ink mt-0.5">
              {targetScope === "admin" ? copy.adminScope : copy.webScope}
            </div>
          </div>
        </div>
        <SegmentedButton<"admin" | "web">
          label={copy.targetScope}
          value={targetScope}
          onChange={setTargetScope}
          options={[
            {
              value: "admin",
              label: copy.adminScope,
              icon: <LayoutDashboard className="w-4 h-4" />,
            },
            {
              value: "web",
              label: copy.webScope,
              icon: <Globe className="w-4 h-4" />,
            },
          ]}
        />
      </div>

      {/* Live Component & Corner Preview Canvas */}
      <section
        className="mb-6 rounded-2xl border border-outline-variant bg-surface-container-low p-5 space-y-4"
        data-appearance-preview
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-ink flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" aria-hidden="true" />
              <span>{copy.previewTitle}</span>
              <span className="text-xs font-medium text-primary px-2.5 py-0.5 rounded-full bg-primary/10">
                {targetScope === "admin" ? copy.adminScope : copy.webScope}
              </span>
            </h2>
            <p className="text-xs text-ink-muted mt-0.5">
              {copy.previewSubtitle}
            </p>
          </div>
          <span className="text-xs font-semibold text-primary">
            {selectedPreset
              ? copy.presets[selectedPreset as keyof typeof copy.presets].name
              : copy.custom}
          </span>
        </div>

        <div
          style={{
            borderRadius: previewCardRadius,
            border: `1px solid ${previewBorderColor}`,
            padding: previewPadding,
            background: "var(--md-sys-color-surface-container-lowest)",
            transition: "all 220ms cubic-bezier(0.2, 0, 0, 1)",
          }}
          className="space-y-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-bold text-ink">
                {copy.previewCardTitle}
              </div>
              <div className="text-xs text-ink-muted mt-0.5">
                {copy.previewCardSubtitle}
              </div>
            </div>
            <span
              style={{ borderRadius: previewButtonRadius }}
              className="px-3 py-1 text-xs font-semibold bg-secondary-container text-on-secondary-container"
            >
              {copy.previewBadge}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-3 items-center">
            <Input
              readOnly
              value=""
              placeholder={copy.previewInputPlaceholder}
              style={{
                borderRadius: previewFieldRadius,
                borderColor: previewBorderColor,
                minHeight: previewControlHeight,
                height: previewControlHeight,
              }}
            />
            <button
              type="button"
              style={{
                borderRadius: previewButtonRadius,
                minHeight: previewControlHeight,
                border: `1px solid ${previewBorderColor}`,
              }}
              className="px-4 text-xs font-semibold text-ink bg-surface-container-low hover:bg-surface-container transition-colors"
            >
              {copy.previewSecondaryBtn}
            </button>
            <button
              type="button"
              style={{
                borderRadius: previewButtonRadius,
                minHeight: previewControlHeight,
              }}
              className="px-5 text-xs font-semibold bg-primary text-on-primary shadow-xs transition-transform active:scale-95"
            >
              {copy.previewPrimaryBtn}
            </button>
          </div>
        </div>
      </section>

      <section
        className="appearance-section appearance-section-header"
        aria-labelledby="appearance-mode"
        data-page-section
      >
        <div>
          <h2 id="appearance-mode">{copy.modeTitle}</h2>
          <p>{copy.modeDescription}</p>
        </div>
        <div>
          <ChoiceRow label={t.preferences.themeTitle}>
            <SegmentedButton<AdminTheme>
              label={t.preferences.themeTitle}
              value={activeDraftTheme}
              onChange={(nextTheme) => {
                setSavedNotice(false);
                setActiveDraftTheme(nextTheme);
              }}
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
          {targetScope === "admin" ? (
            <ChoiceRow label={t.preferences.sysLangTitle}>
              <Select
                aria-label={t.preferences.sysLangTitle}
                value={draftLocale}
                onChange={(event) => {
                  if (isLocale(event.target.value)) {
                    setSavedNotice(false);
                    setDraftLocale(event.target.value);
                  }
                }}
                className="min-w-48"
              >
                {LANGUAGES.map((language) => (
                  <option key={language.code} value={language.code}>
                    {language.name}
                  </option>
                ))}
              </Select>
            </ChoiceRow>
          ) : null}
        </div>
      </section>

      <section
        className="appearance-section appearance-section-header"
        aria-labelledby="appearance-workspace"
        data-page-section
      >
        <div>
          <h2 id="appearance-workspace">
            {targetScope === "admin"
              ? copy.workspaceTitle
              : copy.webWorkspaceTitle}
          </h2>
          <p>
            {targetScope === "admin"
              ? copy.workspaceDescription
              : copy.webWorkspaceDescription}
          </p>
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
                onClick={() => {
                  setSavedNotice(false);
                  setActiveDraftAppearance(preset);
                }}
              >
                <span className="appearance-miniature" aria-hidden>
                  <i />
                  <span>
                    <b />
                    <em />
                  </span>
                </span>
                <span className="flex items-center justify-between gap-2 text-sm font-semibold">
                  <bdi dir="auto">
                    {copy.presets[id as keyof typeof copy.presets].name}
                  </bdi>
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
        data-page-section
      >
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

      {/* Sticky Save Confirmation Bar when unsaved changes exist */}
      {isDirty ? (
        <div className="fixed bottom-5 inset-x-4 sm:inset-x-auto sm:end-8 z-40 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-primary/40 bg-surface-container-highest/95 backdrop-blur-md px-5 py-3.5 shadow-2xl">
          <span className="text-xs font-medium text-ink">
            {copy.unsavedBanner}
          </span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDiscard}
            >
              <Undo2 aria-hidden className="w-3.5 h-3.5" />
              {copy.discardChanges}
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleConfirmSave}
            >
              <Save aria-hidden className="w-3.5 h-3.5" />
              {copy.saveChanges}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

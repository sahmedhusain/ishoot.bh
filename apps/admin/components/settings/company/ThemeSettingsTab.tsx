"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button, Card } from "@platform/ui";
import type { BrandTheme } from "@platform/database/constants/theme";
import { useAdminLocale } from "../../../hooks/useAdminLocale";
import { errorMessage } from "../../../lib/error-text";
import { saveSetupThemeAction } from "../../../app/actions/setup";
import { ThemeEditor } from "../../setup/ThemeEditor";

/** Colours, fonts, corners and default mode after setup; saving re-themes both apps. */
export function ThemeSettingsTab({ initialTheme }: { initialTheme: BrandTheme }) {
  const router = useRouter();
  const { t } = useAdminLocale();
  const [theme, setTheme] = React.useState(initialTheme);
  const [saved, setSaved] = React.useState(initialTheme);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");
  const dirty = JSON.stringify(theme) !== JSON.stringify(saved);

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const result = await saveSetupThemeAction(theme);
      setSaved(result.theme);
      setTheme(result.theme);
      router.refresh();
    } catch (err) {
      setError(errorMessage(err, t));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="space-y-6 rounded-2xl border border-ink/15 bg-white p-6 shadow-xs dark:bg-surface">
      <ThemeEditor theme={theme} onChange={setTheme} />
      {error ? <p role="alert" className="rounded-lg bg-rose-500/10 p-3 text-sm text-rose-700 dark:text-rose-300">{error}</p> : null}
      <div className="flex justify-end">
        <Button type="button" data-testid="theme-save" disabled={!dirty || saving} onClick={save} className="whitespace-nowrap rounded-full px-6 text-xs font-semibold">
          {saving ? t.setupWizard.saving : t.actions.save}
        </Button>
      </div>
    </Card>
  );
}

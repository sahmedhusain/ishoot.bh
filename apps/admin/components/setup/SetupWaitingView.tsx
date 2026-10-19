"use client";

import { Hourglass } from "lucide-react";
import { useAdminLocale } from "../../hooks/useAdminLocale";

/** Shown to people without settings access while an administrator finishes the first-run setup. */
export function SetupWaitingView() {
  const { t } = useAdminLocale();
  return (
    <main className="flex min-h-screen items-center justify-center bg-brand-base p-6">
      <div className="max-w-md space-y-3 rounded-2xl border border-ink/15 bg-white p-8 text-center dark:bg-surface">
        <Hourglass className="mx-auto h-8 w-8 text-accent" />
        <h1 className="text-lg font-bold text-slate-900 dark:text-white">{t.setupWizard.waiting.title}</h1>
        <p className="text-sm text-slate-600 dark:text-ink-muted">{t.setupWizard.waiting.body}</p>
      </div>
    </main>
  );
}

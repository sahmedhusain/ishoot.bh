"use client";

import { Hourglass } from "lucide-react";
import { useAdminLocale } from "../../hooks/useAdminLocale";

/** Shown to people without settings access while an administrator finishes the first-run setup. */
export function SetupWaitingView() {
  const { t } = useAdminLocale();
  return (
    <main className="flex min-h-screen items-center justify-center bg-brand-base p-6">
      <div className="max-w-md space-y-3 rounded-2xl border border-outline-variant bg-surface-raised p-8 text-center dark:bg-surface" data-page-header>
        <Hourglass className="mx-auto h-8 w-8 text-accent" />
        <h1 className="text-lg font-bold text-ink">{t.setupWizard.waiting.title}</h1>
        <p className="text-sm text-ink-muted">{t.setupWizard.waiting.body}</p>
      </div>
    </main>
  );
}

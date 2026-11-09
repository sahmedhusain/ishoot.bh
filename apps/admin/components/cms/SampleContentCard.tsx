"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Eye, Loader2, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@platform/ui";
import type { BusinessActivity } from "@platform/database/website-presets";
import { addSampleContentAction, exampleWebsiteAction, removeSampleContentAction } from "../../app/actions/samples";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { errorMessage } from "../../lib/error-text";
import { formatMessage } from "@platform/locales";

export function ShowExampleButton({ activity, className, compact }: { activity: BusinessActivity; className?: string; compact?: boolean }) {
  const { t, locale } = useAdminLocale();
  const [busy, setBusy] = React.useState(false);
  const open = async () => {
    setBusy(true);
    const tab = window.open("", "_blank");
    try {
      const url = await exampleWebsiteAction(activity, locale);
      if (tab) {
        tab.opener = null;
        tab.location.href = url;
      } else window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      tab?.close();
    } finally {
      setBusy(false);
    }
  };
  if (compact)
    return (
      <button type="button" aria-label={t.sampleContent.showExample} title={t.sampleContent.showExample} disabled={busy} onClick={open} data-testid={`example-${activity}`} className={`rounded-full bg-surface/90 p-1.5 text-ink-muted shadow-sm ring-1 ring-ink/10 transition-colors hover:text-accent dark:text-ink ${className ?? ""}`}>
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />}
      </button>
    );
  return (
    <Button type="button" variant="outline" size="sm" className={`rounded-full gap-1.5 ${className ?? ""}`} disabled={busy} onClick={open} data-testid={`example-${activity}`}>
      {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
      {t.sampleContent.showExample}
    </Button>
  );
}

export function SampleContentCard({ activity, count }: { activity: BusinessActivity | null; count: number }) {
  const { t } = useAdminLocale();
  const copy = t.sampleContent;
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const run = async (task: () => Promise<unknown>) => {
    setBusy(true);
    setError("");
    try {
      await task();
      router.refresh();
    } catch (err) {
      setError(errorMessage(err, t));
    } finally {
      setBusy(false);
    }
  };
  if (!count && !activity) return null;
  return (
    <section className="rounded-2xl border border-accent/30 bg-accent/[0.05] p-4 flex flex-col sm:flex-row sm:items-center gap-3" aria-label={copy.title}>
      <Sparkles className="w-5 h-5 text-accent shrink-0" aria-hidden="true" />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-ink">{copy.title}</p>
        <p className="text-xs text-ink-muted mt-0.5">{count ? formatMessage(copy.present, { count }) : copy.absent}</p>
        {error && <p role="alert" className="text-xs text-rose-600 mt-1">{error}</p>}
      </div>
      <div className="flex flex-wrap gap-2">
        {activity && <ShowExampleButton activity={activity} />}
        {count ? (
          <Button type="button" variant="outline" size="sm" className="rounded-full gap-1.5 text-rose-600" disabled={busy} onClick={() => run(removeSampleContentAction)} data-testid="remove-samples">
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            {copy.remove}
          </Button>
        ) : activity ? (
          <Button type="button" variant="outline" size="sm" className="rounded-full gap-1.5" disabled={busy} onClick={() => run(() => addSampleContentAction(activity))} data-testid="add-samples">
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            {copy.add}
          </Button>
        ) : null}
      </div>
    </section>
  );
}

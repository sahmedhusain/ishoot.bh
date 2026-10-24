"use client";

import { formatMessage } from "@platform/locales";
import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CalendarDays,
  Copy,
  ExternalLink,
  RefreshCw,
  Unlink,
} from "lucide-react";
import { Button, Card, formatDate } from "@platform/ui";
import type { CalendarLayer } from "@platform/database/types";
import {
  createCalendarFeedAction,
  revokeCalendarFeedAction,
  setCalendarSyncEnabledAction,
  updateCalendarFeedLayersAction,
} from "../../app/actions/calendar";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { errorMessage } from "../../lib/error-text";

const LAYERS: CalendarLayer[] = [
  "own",
  "shared",
  "leave",
  "holidays",
  "sales",
  "finance",
  "hr",
  "payroll",
  "meetings",
  "requests",
];

/**
 * Your calendar in Google Calendar (or Outlook / Apple Calendar): a private subscription link that lists only what
 * you may see, kept up to date by your calendar app. Administrators can switch the feature off for the company.
 */
export function CalendarSyncCard({
  feed,
  syncEnabled,
  canManage,
}: {
  feed: {
    layers: CalendarLayer[];
    createdAt: string;
    lastUsedAt: string | null;
  } | null;
  syncEnabled: boolean;
  canManage: boolean;
}) {
  const { t, locale } = useAdminLocale();
  const c = t.calendarSync;
  const router = useRouter();
  const [layers, setLayers] = React.useState<CalendarLayer[]>(
    feed?.layers ?? LAYERS,
  );
  const [link, setLink] = React.useState<{
    https: string;
    webcal: string;
  } | null>(null);
  const [busy, setBusy] = React.useState(false);

  const run = async <T,>(work: () => Promise<T>, done?: string) => {
    setBusy(true);
    try {
      const result = await work();
      if (done) toast.success(done);
      router.refresh();
      return result;
    } catch (error) {
      toast.error(errorMessage(error, t, c.failed));
      return undefined;
    } finally {
      setBusy(false);
    }
  };
  const create = async () => {
    const result = await run(() => createCalendarFeedAction(layers), c.created);
    if (result) setLink(result);
  };
  const googleUrl = link
    ? `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(link.webcal)}`
    : "";

  return (
    <Card
      id="calendar-sync"
      className="scroll-mt-24 space-y-4 p-5 dark:bg-surface-raised"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary dark:bg-white/10 dark:text-white">
          <CalendarDays className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              {c.title}
            </h3>
            <span
              className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${!syncEnabled ? "border-ink/15 bg-slate-500/10 text-slate-600" : feed ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"}`}
            >
              {!syncEnabled ? c.off : feed ? c.connected : c.notConnected}
            </span>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
            {c.description}
          </p>
        </div>
      </div>

      {canManage && (
        <label className="flex items-center gap-2 rounded-xl border border-ink/10 px-3 py-2 text-xs text-ink">
          <input
            type="checkbox"
            checked={syncEnabled}
            disabled={busy}
            onChange={(e) =>
              run(() => setCalendarSyncEnabledAction(e.target.checked), c.saved)
            }
          />
          {c.companySwitch}
        </label>
      )}

      {syncEnabled && (
        <>
          <fieldset>
            <legend className="mb-1.5 text-xs font-semibold text-ink">
              {c.includes}
            </legend>
            <div className="flex flex-wrap gap-1.5">
              {LAYERS.map((layer) => (
                <label
                  key={layer}
                  className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] ${layers.includes(layer) ? "border-accent bg-accent/10 font-semibold text-ink" : "border-ink/15 text-ink-muted"}`}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={layers.includes(layer)}
                    onChange={() =>
                      setLayers((prev) =>
                        prev.includes(layer)
                          ? prev.filter((l) => l !== layer)
                          : [...prev, layer],
                      )
                    }
                  />
                  {t.calendarSharing.layers[layer]}
                </label>
              ))}
            </div>
            <p className="mt-1 text-[11px] text-ink-muted">{c.roleNote}</p>
          </fieldset>

          {link ? (
            <div className="space-y-2 rounded-2xl border border-accent/30 bg-accent/5 p-3">
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  dir="ltr"
                  value={link.https}
                  onFocus={(e) => e.target.select()}
                  className="h-9 min-w-0 flex-1 rounded-lg border border-ink/15 bg-white px-2 font-mono text-[11px] dark:bg-surface"
                  aria-label={c.yourLink}
                />
                <button
                  type="button"
                  onClick={() =>
                    navigator.clipboard
                      .writeText(link.https)
                      .then(() => toast.success(c.copied))
                  }
                  className="inline-flex h-9 items-center gap-1 rounded-lg border border-ink/15 px-3 text-xs font-semibold"
                >
                  <Copy className="h-3.5 w-3.5" aria-hidden />
                  {c.copy}
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                <a
                  href={googleUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white hover:bg-primary/90"
                >
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                  {c.addToGoogle}
                </a>
                <a
                  href={link.webcal}
                  className="inline-flex items-center gap-1.5 rounded-full border border-ink/15 px-4 py-2 text-xs font-semibold text-ink hover:bg-ink/5"
                >
                  {c.openInCalendarApp}
                </a>
              </div>
              <p className="text-[11px] text-ink-muted">{c.privateWarning}</p>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-2 border-t border-ink/10 pt-3">
            {!feed ? (
              <Button
                size="sm"
                disabled={busy || !layers.length}
                onClick={create}
              >
                {c.connect}
              </Button>
            ) : (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy || !layers.length}
                  onClick={() =>
                    run(() => updateCalendarFeedLayersAction(layers), c.saved)
                  }
                >
                  {c.saveLayers}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="gap-1.5"
                  disabled={busy}
                  onClick={() => window.confirm(c.rotateConfirm) && create()}
                >
                  <RefreshCw className="h-3.5 w-3.5" aria-hidden />
                  {c.newLink}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="ms-auto gap-1.5 text-rose-600"
                  disabled={busy}
                  onClick={() =>
                    window.confirm(c.disconnectConfirm) &&
                    run(() => revokeCalendarFeedAction(), c.disconnected).then(
                      () => setLink(null),
                    )
                  }
                >
                  <Unlink className="h-3.5 w-3.5" aria-hidden />
                  {c.disconnect}
                </Button>
              </>
            )}
          </div>
          {feed ? (
            <p className="text-[11px] text-ink-muted">
              {formatMessage(c.status, { since: formatDate(feed.createdAt, locale), synced: feed.lastUsedAt
                    ? formatDate(feed.lastUsedAt, locale, "time")
                    : c.never })}
            </p>
          ) : null}
        </>
      )}
    </Card>
  );
}

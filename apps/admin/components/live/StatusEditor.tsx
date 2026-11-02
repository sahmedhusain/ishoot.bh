"use client";
// Choosing a status (docs/adr/0012): available, busy, do not disturb, in a meeting, away, on leave…, with an optional
// message and when it clears. Without a choice the status follows the calendar, approved leave and activity.
import * as React from "react";
import { toast } from "sonner";
import { CalendarClock, Plane } from "lucide-react";
import { Button, Modal, PresenceDot, cn } from "@platform/ui";
import { formatMessage } from "@platform/locales";
import {
  PRESENCE_DURATIONS,
  PRESENCE_MANUAL_STATUSES,
  PRESENCE_MESSAGE_MAX,
  presenceExpiry,
  type PresenceDuration,
} from "@platform/contracts";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { errorMessage } from "../../lib/error-text";
import { clearMyStatusAction, setMyStatusAction } from "../../app/actions/presence";
import { presenceLook, useMyStatus } from "./LiveProvider";
import { statusName, statusTime } from "./status-text";

/** The current status in one line: "In a meeting · until 15:00 (from your calendar)". */
export function StatusSummary({ className }: { className?: string }) {
  const { t, locale } = useAdminLocale();
  const s = t.presence;
  const { mine } = useMyStatus();
  if (!mine) return null;
  const p = mine.presence;
  const look = presenceLook(p.status);
  const source = p.source === "calendar" ? s.fromCalendar : p.source === "leave" ? s.fromLeave : p.source === "connection" ? s.automatic : null;
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-2 text-xs text-ink-muted", className)}>
      <PresenceDot tone={look.tone} doNotDisturb={look.doNotDisturb} />
      <span className="truncate">
        <span className="font-medium text-ink">{statusName(p.status, locale)}</span>
        {p.until && ` · ${formatMessage(s.until, { time: statusTime(p.until, locale) })}`}
        {source && ` · ${source}`}
        {p.message && (
          <>
            {" · "}
            <bdi dir="auto">{p.message}</bdi>
          </>
        )}
      </span>
    </span>
  );
}

export function StatusEditor({ onDone }: { onDone?: () => void }) {
  const { t, locale } = useAdminLocale();
  const s = t.presence;
  const { mine, setMine } = useMyStatus();
  const [status, setStatus] = React.useState(mine?.chosen?.status ?? "available");
  const [message, setMessage] = React.useState(mine?.chosen?.message ?? "");
  const [duration, setDuration] = React.useState<PresenceDuration>("never");
  const [busy, setBusy] = React.useState(false);
  React.useEffect(() => {
    if (!mine?.chosen) return;
    setStatus(mine.chosen.status);
    setMessage(mine.chosen.message ?? "");
  }, [mine?.chosen]);

  const save = async () => {
    setBusy(true);
    try {
      const expires = presenceExpiry(duration);
      setMine(await setMyStatusAction({ status, message: message.trim() || null, expiresAt: expires?.toISOString() ?? null }));
      toast.success(s.saved);
      onDone?.();
    } catch (error) {
      toast.error(errorMessage(error, t, s.failed));
    } finally {
      setBusy(false);
    }
  };
  const reset = async () => {
    setBusy(true);
    try {
      setMine(await clearMyStatusAction());
      toast.success(s.resetDone);
      onDone?.();
    } catch (error) {
      toast.error(errorMessage(error, t, s.failed));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <StatusSummary />
      <fieldset className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        <legend className="mb-2 text-xs font-semibold text-ink">{s.choose}</legend>
        {PRESENCE_MANUAL_STATUSES.map((option) => {
          const look = presenceLook(option.key);
          return (
            <label
              key={option.key}
              className={cn(
                "flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2 text-sm",
                status === option.key ? "border-accent bg-accent/10 text-ink" : "border-outline-variant text-ink hover:bg-ink/5",
              )}
            >
              <input type="radio" name="presence-status" value={option.key} checked={status === option.key} onChange={() => setStatus(option.key)} className="sr-only" />
              <PresenceDot tone={look.tone} doNotDisturb={look.doNotDisturb} />
              {statusName(option.key, locale)}
            </label>
          );
        })}
      </fieldset>
      {status === "do_not_disturb" && <p className="text-xs text-ink-muted">{s.dndHint}</p>}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
        <label className="text-xs font-semibold text-ink">
          {s.message}
          <input
            type="text"
            dir="auto"
            maxLength={PRESENCE_MESSAGE_MAX}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={s.messagePlaceholder}
            className="mt-1 w-full rounded-xl border border-outline-variant bg-surface-raised px-3 py-2 text-sm font-normal text-ink focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </label>
        <label className="text-xs font-semibold text-ink">
          {s.clearAfter}
          <select
            value={duration}
            onChange={(e) => setDuration(e.target.value as PresenceDuration)}
            className="mt-1 w-full rounded-xl border border-outline-variant bg-surface-raised px-3 py-2 text-sm font-normal text-ink focus:outline-none focus:ring-2 focus:ring-accent"
          >
            {PRESENCE_DURATIONS.map((d) => (
              <option key={d} value={d}>
                {(s.durations as Record<string, string>)[d] ?? d}
              </option>
            ))}
          </select>
        </label>
      </div>
      {!!mine?.upcoming.length && (
        <div className="space-y-1.5 rounded-2xl bg-ink/[0.03] p-3">
          <p className="text-xs font-semibold text-ink">{s.upcoming}</p>
          <ul className="space-y-1 text-xs text-ink-muted">
            {mine.upcoming.slice(0, 4).map((w) => (
              <li key={`${w.source}-${w.startsAt}`} className="flex items-center gap-2">
                {w.kind === "meeting" ? <CalendarClock className="h-3.5 w-3.5" aria-hidden /> : <Plane className="h-3.5 w-3.5" aria-hidden />}
                {statusName(w.status, locale)} · {statusTime(w.startsAt, locale)} – {statusTime(w.endsAt, locale)}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="flex flex-wrap justify-end gap-2">
        {mine?.chosen && (
          <Button variant="ghost" disabled={busy} onClick={reset}>
            {s.reset}
          </Button>
        )}
        <Button disabled={busy} onClick={save}>
          {busy ? s.saving : s.save}
        </Button>
      </div>
    </div>
  );
}

/** The status editor in a dialog (from the account menu). */
export function StatusDialog({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { t } = useAdminLocale();
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t.presence.title} kind="form" closeLabel={t.shared.cancel}>
      <StatusEditor onDone={onClose} />
    </Modal>
  );
}

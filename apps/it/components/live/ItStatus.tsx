"use client";
// The IT account's status (docs/adr/0012): pick one and when it clears, or go back to automatic.
import * as React from "react";
import { toast } from "sonner";
import { PresenceDot, UserAvatar, type PresenceTone } from "@platform/ui";
import {
  PRESENCE_DURATIONS,
  PRESENCE_MANUAL_STATUSES,
  presenceExpiry,
  presenceSilences,
  presenceStatus,
  presenceTone,
  type PresenceDuration,
} from "@platform/contracts";
import { useCopy } from "../CopyProvider";
import { clearStatusAction, setStatusAction } from "../../app/live-actions";
import { useItLive } from "./ItLive";

export function ItStatus({ email }: { email: string }) {
  const { copy, locale } = useCopy();
  const c = copy.live;
  const { status, setStatus } = useItLive();
  const [open, setOpen] = React.useState(false);
  const [duration, setDuration] = React.useState<PresenceDuration>("never");
  const [busy, setBusy] = React.useState(false);
  const box = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const current = status?.presence.status ?? "offline";
  const name = (key: string) => {
    const s = presenceStatus(key);
    return s ? (locale === "ar" ? s.nameAr : s.nameEn) : key;
  };
  const choose = async (key: string | null) => {
    setBusy(true);
    try {
      const expires = key ? presenceExpiry(duration) : null;
      setStatus(key ? await setStatusAction({ status: key, expiresAt: expires?.toISOString() ?? null }) : await clearStatusAction());
      setOpen(false);
    } catch {
      toast.error(c.failed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative" ref={box}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-full border border-outline-variant py-1 ps-1 pe-3 text-xs text-ink hover:bg-surface-container"
      >
        <UserAvatar name={email.split("@")[0].replace(/[._-]+/g, " ")} size={28} tone={presenceTone(current) as PresenceTone} doNotDisturb={presenceSilences(current)} />
        <span className="hidden sm:inline">{name(current)}</span>
      </button>
      {open && (
        <div role="menu" className="absolute end-0 top-full z-50 mt-2 w-64 rounded-2xl border border-outline-variant bg-surface p-2 shadow-xl">
          <p className="px-2 pb-2 text-xs font-semibold text-ink">{c.status}</p>
          {PRESENCE_MANUAL_STATUSES.map((s) => (
            <button
              key={s.key}
              role="menuitemradio"
              aria-checked={status?.chosen?.status === s.key}
              type="button"
              disabled={busy}
              onClick={() => choose(s.key)}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-start text-sm text-ink hover:bg-surface-container"
            >
              <PresenceDot tone={presenceTone(s.key) as PresenceTone} doNotDisturb={s.silences} />
              {name(s.key)}
            </button>
          ))}
          <label className="mt-2 block px-2 text-xs text-ink-muted">
            {c.clearAfter}
            <select value={duration} onChange={(e) => setDuration(e.target.value as PresenceDuration)} className="mt-1 w-full rounded-lg border border-outline-variant bg-surface px-2 py-1 text-sm text-ink">
              {PRESENCE_DURATIONS.map((d) => (
                <option key={d} value={d}>
                  {(c.durations as Record<string, string>)[d] ?? d}
                </option>
              ))}
            </select>
          </label>
          {status?.chosen && (
            <button type="button" disabled={busy} onClick={() => choose(null)} className="mt-2 w-full rounded-lg px-2 py-1.5 text-start text-sm text-accent hover:bg-surface-container">
              {c.reset}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

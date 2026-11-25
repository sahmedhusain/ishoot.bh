"use client";

import * as React from "react";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { formatMessage } from "@platform/locales";
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
    const escape = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", escape);
    };
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
        className="flex items-center gap-2 rounded-md border border-white/20 bg-white/10 py-1 ps-1 pe-2.5 text-xs font-medium text-white hover:bg-white/20 transition-colors"
      >
        <UserAvatar
          name={email.split("@")[0].replace(/[._-]+/g, " ")}
          size={24}
          tone={presenceTone(current) as PresenceTone}
          doNotDisturb={presenceSilences(current)}
        />
        <span className="hidden sm:inline">{name(current)}</span>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute end-0 top-full z-50 mt-2 w-64 rounded-lg border border-outline-variant bg-surface text-ink p-2 shadow-xl"
        >
          <p className="px-2 pb-1.5 mb-1 border-b border-outline-variant text-[11px] font-bold uppercase tracking-wider text-ink-muted">
            {c.status}
          </p>
          <div className="space-y-0.5">
            {PRESENCE_MANUAL_STATUSES.map((s) => {
              const selected = status?.chosen?.status === s.key;
              return (
                <button
                  key={s.key}
                  role="menuitemradio"
                  aria-checked={selected}
                  type="button"
                  disabled={busy}
                  onClick={() => choose(s.key)}
                  className={`flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-start text-xs font-medium transition-colors ${
                    selected
                      ? "bg-[#0070d2]/10 text-[#0070d2] dark:bg-sky-500/15 dark:text-sky-300 font-semibold"
                      : "text-ink hover:bg-surface-raised"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <PresenceDot tone={presenceTone(s.key) as PresenceTone} doNotDisturb={s.silences} />
                    <span>{name(s.key)}</span>
                  </span>
                  {selected && <Check aria-hidden className="size-3.5 shrink-0" />}
                </button>
              );
            })}
          </div>
          <label className="mt-2 pt-2 border-t border-outline-variant block px-2 text-[11px] font-medium text-ink-muted">
            {c.clearAfter}
            <select
              value={duration}
              onChange={(e) => setDuration(e.target.value as PresenceDuration)}
              className="it-field-sunken mt-1 w-full text-xs"
            >
              {PRESENCE_DURATIONS.map((d) => {
                const raw = (c.durations as Record<string, string>)[d] ?? d;
                const label =
                  d === "30m"
                    ? formatMessage(raw, { minutes: 30 })
                    : d === "1h"
                      ? formatMessage(raw, { hours: 1 })
                      : d === "2h"
                        ? formatMessage(raw, { hours: 2 })
                        : d === "4h"
                          ? formatMessage(raw, { hours: 4 })
                          : raw;
                return (
                  <option key={d} value={d}>
                    {label}
                  </option>
                );
              })}
            </select>
          </label>
          {status?.chosen && (
            <button
              type="button"
              disabled={busy}
              onClick={() => choose(null)}
              className="mt-2 w-full rounded-md px-2.5 py-1.5 text-start text-xs font-semibold text-[#0070d2] dark:text-sky-400 hover:bg-surface-raised transition-colors"
            >
              {c.reset}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

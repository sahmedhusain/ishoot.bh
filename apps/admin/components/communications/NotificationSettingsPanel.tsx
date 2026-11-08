"use client";
// The person's notification settings (docs/adr/0012): pause everything, sound, pop-ups, desktop notifications, each
// category, and the records they muted. Changes apply when saved, on every device.
import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { BellOff, BellRing, Monitor, Play, Volume2 } from "lucide-react";
import {
  Button,
  cn,
  desktopPermission,
  playNotificationSound,
  requestDesktopPermission,
  unlockNotificationSound,
  type DesktopPermission,
} from "@platform/ui";
import { formatMessage } from "@platform/locales";
import { NOTIFICATION_SOUNDS, notificationCategory } from "@platform/contracts";
import type { NotificationPreferences } from "@platform/api-client";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { categoryDescription, categoryName, notificationHref } from "../../lib/notification-display";
import { errorMessage } from "../../lib/error-text";
import { saveNotificationPreferencesAction, unmuteNotificationRecordAction } from "../../app/actions/notifications";
import { useNotificationSettings } from "../live/LiveProvider";
import { muteUntil } from "../layout/NotificationCenter";

function Toggle({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50",
        checked ? "bg-primary" : "bg-ink/20",
      )}
    >
      <span className={cn("inline-block h-5 w-5 rounded-full bg-white shadow transition-transform", checked ? "translate-x-5 rtl:-translate-x-5" : "translate-x-0.5 rtl:-translate-x-0.5")} />
    </button>
  );
}

function Section({ title, hint, icon, children }: { title: string; hint?: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="space-y-4 rounded-3xl border border-outline-variant bg-surface-raised p-5">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 text-accent">{icon}</span>
        <div>
          <h2 className="text-sm font-semibold text-ink">{title}</h2>
          {hint && <p className="mt-1 text-xs text-ink-muted">{hint}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

const same = (a: NotificationPreferences | null, b: NotificationPreferences | null) => JSON.stringify(a) === JSON.stringify(b);

export function NotificationSettingsPanel() {
  const { t, locale } = useAdminLocale();
  const s = t.liveNotifications.settings;
  const l = t.liveNotifications;
  const { preferences, mutes, setPreferences, reload } = useNotificationSettings();
  const [draft, setDraft] = React.useState<NotificationPreferences | null>(preferences);
  const [saving, setSaving] = React.useState(false);
  const [permission, setPermission] = React.useState<DesktopPermission>("default");
  React.useEffect(() => setPermission(desktopPermission()), []);
  // Settings saved in another tab or device replace the form only while it has no unsaved changes.
  const lastSaved = React.useRef(preferences);
  React.useEffect(() => {
    setDraft((current) => (current === null || same(current, lastSaved.current) ? preferences : current));
    lastSaved.current = preferences;
  }, [preferences]);

  if (!draft) return <p className="text-sm text-ink-muted">{t.notificationMenu.loading}</p>;
  const dirty = !same(draft, preferences);
  const set = (change: Partial<NotificationPreferences>) => setDraft({ ...draft, ...change });
  const setCategory = (category: string, change: { muted?: boolean; sound?: boolean }) =>
    set({ categories: draft.categories.map((c) => (c.category === category ? { ...c, ...change } : c)) });
  const mutedUntil = draft.mutedUntil && new Date(draft.mutedUntil).getTime() > Date.now() ? draft.mutedUntil : null;

  const save = async () => {
    setSaving(true);
    try {
      const saved = await saveNotificationPreferencesAction({
        mutedUntil: draft.mutedUntil,
        soundEnabled: draft.soundEnabled,
        sound: draft.sound,
        volume: draft.volume,
        popupsEnabled: draft.popupsEnabled,
        desktopEnabled: draft.desktopEnabled,
        categories: draft.categories.map(({ category, muted, sound }) => ({ category, muted, sound })),
      });
      setPreferences(saved);
      setDraft(saved);
      toast.success(s.saved);
    } catch (error) {
      toast.error(errorMessage(error, t, s.failed));
    } finally {
      setSaving(false);
    }
  };

  const enableDesktop = async () => {
    unlockNotificationSound();
    const result = await requestDesktopPermission();
    setPermission(result);
    if (result === "granted") set({ desktopEnabled: true });
  };

  return (
    <div className="space-y-5">
      <Section icon={<BellOff className="h-5 w-5" aria-hidden />} title={s.pauseTitle} hint={s.pauseHint}>
        {mutedUntil ? (
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm text-ink">
              {new Date(mutedUntil).getUTCFullYear() >= 9999
                ? l.mutedForever
                : formatMessage(l.mutedUntil, { time: new Date(mutedUntil).toLocaleString(locale === "ar" ? "ar-u-nu-latn" : "en-GB", { dateStyle: "medium", timeStyle: "short" }) })}
            </p>
            <Button size="sm" variant="outline" onClick={() => set({ mutedUntil: null })} className="gap-1.5">
              <BellRing className="h-4 w-4" aria-hidden />
              {l.unmute}
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {(["1h", "8h", "tomorrow", "forever"] as const).map((choice) => (
              <Button key={choice} size="sm" variant="outline" onClick={() => set({ mutedUntil: muteUntil(choice) })}>
                {choice === "1h"
                  ? formatMessage(l.muteFor[choice], { hours: 1 })
                  : choice === "8h"
                    ? formatMessage(l.muteFor[choice], { hours: 8 })
                    : l.muteFor[choice]}
              </Button>
            ))}
          </div>
        )}
        <p className="text-xs text-ink-muted">{s.dndHint}</p>
      </Section>

      <Section icon={<Volume2 className="h-5 w-5" aria-hidden />} title={s.soundTitle} hint={s.soundHint}>
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm text-ink">{s.soundEnabled}</span>
          <Toggle checked={draft.soundEnabled} onChange={(v) => set({ soundEnabled: v })} label={s.soundEnabled} />
        </div>
        <fieldset disabled={!draft.soundEnabled} className="space-y-3 disabled:opacity-50">
          <legend className="sr-only">{s.soundChoice}</legend>
          <div className="flex flex-wrap gap-2">
            {NOTIFICATION_SOUNDS.map((sound) => (
              <label
                key={sound}
                className={cn(
                  "inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-sm",
                  draft.sound === sound ? "border-accent bg-accent/10 text-ink" : "border-outline-variant text-ink-muted",
                )}
              >
                <input
                  type="radio"
                  name="notification-sound"
                  value={sound}
                  checked={draft.sound === sound}
                  onChange={() => {
                    set({ sound: sound as NotificationPreferences["sound"] });
                    void playNotificationSound(sound, draft.volume);
                  }}
                  className="sr-only"
                />
                {(s.sounds as Record<string, string>)[sound] ?? sound}
              </label>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <label htmlFor="notification-volume" className="text-sm text-ink">
              {s.volume}
            </label>
            <input
              id="notification-volume"
              type="range"
              min={0}
              max={100}
              step={5}
              value={draft.volume}
              onChange={(e) => set({ volume: Number(e.target.value) })}
              className="min-w-0 flex-1"
            />
            <span className="w-10 text-end text-xs tabular-nums text-ink-muted">{draft.volume}%</span>
            <Button size="sm" variant="outline" onClick={() => void playNotificationSound(draft.sound, draft.volume)} className="gap-1.5">
              <Play className="h-4 w-4" aria-hidden />
              {s.test}
            </Button>
          </div>
        </fieldset>
      </Section>

      <Section icon={<Monitor className="h-5 w-5" aria-hidden />} title={s.alertsTitle} hint={s.alertsHint}>
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm text-ink">{s.popups}</span>
          <Toggle checked={draft.popupsEnabled} onChange={(v) => set({ popupsEnabled: v })} label={s.popups} />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-sm text-ink">{s.desktop}</span>
            <p className="text-xs text-ink-muted">
              {permission === "unsupported" ? s.desktopUnsupported : permission === "denied" ? s.desktopBlocked : s.desktopHint}
            </p>
          </div>
          {permission === "granted" ? (
            <Toggle checked={draft.desktopEnabled} onChange={(v) => set({ desktopEnabled: v })} label={s.desktop} />
          ) : (
            permission === "default" && (
              <Button size="sm" variant="outline" onClick={enableDesktop}>
                {s.desktopEnable}
              </Button>
            )
          )}
        </div>
      </Section>

      <Section icon={<BellRing className="h-5 w-5" aria-hidden />} title={s.categoriesTitle} hint={s.categoriesHint}>
        <div className="overflow-hidden rounded-2xl border border-outline-variant">
          <div className="grid grid-cols-[1fr_auto_auto] items-center gap-4 border-b border-outline-variant bg-ink/[0.03] px-4 py-2 text-xs font-semibold text-ink-muted">
            <span>{s.category}</span>
            <span className="w-14 text-center">{s.notify}</span>
            <span className="w-14 text-center">{s.sound}</span>
          </div>
          <ul className="divide-y divide-outline-variant">
            {draft.categories.map((c) => {
              const mandatory = notificationCategory(c.category)?.mandatory ?? c.mandatory;
              return (
                <li key={c.category} className="grid grid-cols-[1fr_auto_auto] items-center gap-4 px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink">{categoryName(c.category, locale)}</p>
                    <p className="text-xs text-ink-muted">{mandatory ? s.alwaysOn : categoryDescription(c.category, locale)}</p>
                  </div>
                  <span className="flex w-14 justify-center">
                    <Toggle checked={!c.muted} disabled={mandatory} onChange={(v) => setCategory(c.category, { muted: !v })} label={formatMessage(s.notifyFor, { category: categoryName(c.category, locale) })} />
                  </span>
                  <span className="flex w-14 justify-center">
                    <Toggle checked={c.sound} disabled={c.muted} onChange={(v) => setCategory(c.category, { sound: v })} label={formatMessage(s.soundFor, { category: categoryName(c.category, locale) })} />
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </Section>

      <Section icon={<BellOff className="h-5 w-5" aria-hidden />} title={s.mutedTitle} hint={s.mutedHint}>
        {!mutes.length ? (
          <p className="text-sm text-ink-muted">{s.mutedNone}</p>
        ) : (
          <ul className="divide-y divide-outline-variant rounded-2xl border border-outline-variant">
            {mutes.map((m) => {
              const href = notificationHref({ id: "", user_id: "", title: "", message: "", type: "info", is_read: true, created_at: m.createdAt, entity_type: m.entityType, entity_id: m.entityId });
              const label = `${(l.entityTypes as Record<string, string>)[m.entityType] ?? m.entityType} · ${m.entityId.slice(0, 8)}`;
              return (
                <li key={`${m.entityType}:${m.entityId}`} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                  {href ? (
                    <Link href={href} className="truncate text-ink hover:underline">
                      {label}
                    </Link>
                  ) : (
                    <span className="truncate text-ink">{label}</span>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      try {
                        await unmuteNotificationRecordAction(m.entityType, m.entityId);
                        await reload();
                        toast.success(s.unmuted);
                      } catch (error) {
                        toast.error(errorMessage(error, t, s.failed));
                      }
                    }}
                  >
                    {s.unmuteRecord}
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      <div className="sticky bottom-3 flex justify-end gap-2 rounded-2xl border border-outline-variant bg-surface-raised/95 p-3 shadow-sm backdrop-blur">
        {dirty && <span className="me-auto self-center text-xs text-ink-muted">{s.unsaved}</span>}
        <Button variant="ghost" disabled={!dirty || saving} onClick={() => setDraft(preferences)}>
          {s.discard}
        </Button>
        <Button disabled={!dirty || saving} onClick={save}>
          {saving ? s.saving : s.save}
        </Button>
      </div>
    </div>
  );
}

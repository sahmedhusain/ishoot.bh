"use client";

import * as React from "react";
import {
  BellOff,
  BellRing,
  Check,
  Languages,
  Laptop,
  Moon,
  Monitor,
  Play,
  RotateCcw,
  Save,
  Shield,
  ShieldAlert,
  Sun,
  User,
  Volume2,
  VolumeX,
} from "lucide-react";
import { toast } from "sonner";
import {
  desktopPermission,
  playNotificationSound,
  requestDesktopPermission,
  unlockNotificationSound,
  type DesktopPermission,
} from "@platform/ui";
import { formatMessage } from "@platform/locales";
import { NOTIFICATION_SOUNDS, notificationCategory } from "@platform/contracts";
import type { NotificationPreferences, StatusChoice } from "@platform/api-client";
import { setLocaleAction, signOutAction, beginItMFAAction, cancelItMFAAction, confirmItMFAAction, disableItMFAAction, getItSecurityStatusAction } from "../app/actions";
import { savePreferencesAction, unmuteRecordAction, setStatusAction, clearStatusAction } from "../app/live-actions";
import { useCopy } from "./CopyProvider";
import { useItLive } from "./live/ItLive";
import { PageTitle } from "./ticket-ui";

const FOREVER = "9999-12-31T00:00:00Z";

const IT_CATEGORIES = ["it_tickets", "it_platform", "security", "system"] as const;

function muteUntil(choice: "1h" | "8h" | "tomorrow" | "forever"): string {
  const d = new Date();
  if (choice === "1h") d.setHours(d.getHours() + 1);
  else if (choice === "8h") d.setHours(d.getHours() + 8);
  else if (choice === "tomorrow") {
    d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0);
  } else return FOREVER;
  return d.toISOString();
}

function Toggle({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50 ${
        checked ? "bg-primary" : "bg-outline-variant"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-5 rtl:-translate-x-5" : "translate-x-0.5 rtl:-translate-x-0.5"
        }`}
      />
    </button>
  );
}

function Section({
  title,
  hint,
  icon,
  children,
}: {
  title: string;
  hint?: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4 rounded-2xl border border-outline-variant bg-surface p-5 sm:p-6 shadow-sm">
      <div className="flex items-start gap-3 border-b border-outline-variant/60 pb-3">
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

function TwoFactorSettings() {
  const [loading, setLoading] = React.useState(false);
  const [mfaEnabled, setMfaEnabled] = React.useState(false);
  const [step, setStep] = React.useState<"idle" | "enrolling" | "confirming" | "disabling">("idle");
  const [password, setPassword] = React.useState("");
  const [code, setCode] = React.useState("");
  const [setupData, setSetupData] = React.useState<{ secret: string; uri: string } | null>(null);
  const [recoveryCodes, setRecoveryCodes] = React.useState<string[]>([]);

  React.useEffect(() => {
    getItSecurityStatusAction().then((res) => {
      if (res.ok) setMfaEnabled(res.mfaEnabled);
    });
  }, []);

  const handleStartEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await beginItMFAAction(password);
    setLoading(false);
    if (!res.ok) {
      toast.error(res.error === "invalid_password" ? "Invalid current password" : "Failed to start 2FA setup");
      return;
    }
    setSetupData({ secret: res.secret!, uri: res.uri! });
    setStep("confirming");
  };

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await confirmItMFAAction(password, code);
    setLoading(false);
    if (!res.ok) {
      toast.error(res.error === "invalid_code" ? "Invalid authenticator code" : "Failed to confirm 2FA");
      return;
    }
    setMfaEnabled(true);
    setRecoveryCodes(res.recoveryCodes || []);
    setStep("idle");
    setPassword("");
    setCode("");
    toast.success("Two-Factor Authentication enabled successfully!");
  };

  const handleDisable = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await disableItMFAAction(password, code);
    setLoading(false);
    if (!res.ok) {
      toast.error("Failed to disable 2FA. Check password and code.");
      return;
    }
    setMfaEnabled(false);
    setStep("idle");
    setPassword("");
    setCode("");
    toast.success("Two-Factor Authentication disabled. Password-only access restored.");
  };

  return (
    <div className="space-y-4 pt-1">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-ink">Two-Factor Authentication (MFA / TOTP)</p>
          <p className="text-xs text-ink-muted">
            {mfaEnabled
              ? "Enabled — Authenticator app (TOTP) code required at sign-in."
              : "Disabled by default — You can sign in using your password only."}
          </p>
        </div>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
            mfaEnabled ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-surface-container text-ink-muted"
          }`}
        >
          {mfaEnabled ? "Active" : "Disabled (Password Only)"}
        </span>
      </div>

      {recoveryCodes.length > 0 && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 space-y-2">
          <p className="text-xs font-bold text-emerald-800 dark:text-emerald-200">
            Save your one-time recovery codes in a secure location:
          </p>
          <div className="grid grid-cols-2 gap-2 font-mono text-xs text-emerald-900 dark:text-emerald-100">
            {recoveryCodes.map((rc, idx) => (
              <span key={idx} className="bg-white/40 dark:bg-black/20 p-1.5 rounded">{rc}</span>
            ))}
          </div>
        </div>
      )}

      {step === "idle" && (
        <div>
          {mfaEnabled ? (
            <button
              type="button"
              onClick={() => setStep("disabling")}
              className="rounded-full border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-xs font-semibold text-rose-700 dark:text-rose-300 hover:bg-rose-500/20"
            >
              Disable Two-Factor Authentication
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setStep("enrolling")}
              className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-on-primary hover:opacity-90"
            >
              Set Up Authenticator (MFA)
            </button>
          )}
        </div>
      )}

      {step === "enrolling" && (
        <form onSubmit={handleStartEnroll} className="space-y-3 max-w-sm">
          <p className="text-xs text-ink-muted">Enter your current password to begin authenticator setup:</p>
          <input
            type="password"
            placeholder="Current Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full rounded-xl border border-outline-variant bg-surface px-3 py-2 text-xs text-ink focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading || !password}
              className="rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-on-primary disabled:opacity-50"
            >
              {loading ? "Verifying..." : "Continue"}
            </button>
            <button
              type="button"
              onClick={() => { setStep("idle"); setPassword(""); }}
              className="rounded-full border border-outline-variant px-3 py-1.5 text-xs font-semibold text-ink"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {step === "confirming" && setupData && (
        <form onSubmit={handleConfirm} className="space-y-3 max-w-sm">
          <p className="text-xs text-ink-muted">
            Add this secret key to your authenticator app (Google Authenticator, 1Password, etc.):
          </p>
          <div className="rounded-xl border border-outline-variant bg-surface-container p-2 text-center font-mono text-xs select-all">
            {setupData.secret}
          </div>
          <input
            type="text"
            placeholder="6-digit code from app"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            maxLength={8}
            required
            className="w-full rounded-xl border border-outline-variant bg-surface px-3 py-2 text-xs text-ink focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading || !code}
              className="rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-on-primary disabled:opacity-50"
            >
              {loading ? "Confirming..." : "Activate 2FA"}
            </button>
            <button
              type="button"
              onClick={() => {
                cancelItMFAAction(password);
                setStep("idle");
                setPassword("");
                setCode("");
              }}
              className="rounded-full border border-outline-variant px-3 py-1.5 text-xs font-semibold text-ink"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {step === "disabling" && (
        <form onSubmit={handleDisable} className="space-y-3 max-w-sm">
          <p className="text-xs text-ink-muted">Enter your password and current 6-digit code to turn off 2FA:</p>
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full rounded-xl border border-outline-variant bg-surface px-3 py-2 text-xs text-ink"
          />
          <input
            type="text"
            placeholder="Current 6-digit code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
            className="w-full rounded-xl border border-outline-variant bg-surface px-3 py-2 text-xs text-ink"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading || !password || !code}
              className="rounded-full bg-rose-600 px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
            >
              {loading ? "Disabling..." : "Confirm Disable"}
            </button>
            <button
              type="button"
              onClick={() => { setStep("idle"); setPassword(""); setCode(""); }}
              className="rounded-full border border-outline-variant px-3 py-1.5 text-xs font-semibold text-ink"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

const same = (a: NotificationPreferences | null, b: NotificationPreferences | null) =>
  JSON.stringify(a) === JSON.stringify(b);

export function SettingsView({
  email,
  roles,
}: {
  email: string;
  roles: string[];
}) {
  const { copy, locale, role } = useCopy();
  const s = copy.settings;
  const sn = s.notifications;
  const sa = s.appearance;
  const presenceStatusLabels = sa.presenceStatuses as Record<string, string>;
  const { preferences, mutes, status, reload, setPreferences } = useItLive();

  const [activeTab, setActiveTab] = React.useState<"notifications" | "appearance" | "account">("notifications");
  const [draft, setDraft] = React.useState<NotificationPreferences | null>(preferences);
  const [saving, setSaving] = React.useState(false);
  const [permission, setPermission] = React.useState<DesktopPermission>("default");
  const [themeMode, setThemeMode] = React.useState<"light" | "dark" | "system">("system");

  React.useEffect(() => {
    setPermission(desktopPermission());
    const saved = localStorage.getItem("platform_it_theme");
    if (saved === "light" || saved === "dark" || saved === "system") {
      setThemeMode(saved);
    }
  }, []);

  const lastSaved = React.useRef(preferences);
  React.useEffect(() => {
    setDraft((current) => (current === null || same(current, lastSaved.current) ? preferences : current));
    lastSaved.current = preferences;
  }, [preferences]);

  const applyTheme = (mode: "light" | "dark" | "system") => {
    setThemeMode(mode);
    localStorage.setItem("platform_it_theme", mode);
    const isDark =
      mode === "dark" || (mode === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", isDark);
    document.documentElement.classList.toggle("light", !isDark);
  };

  if (!draft) {
    return (
      <div className="py-12 text-center text-sm text-ink-muted">
        <p>{copy.live.reconnecting}</p>
      </div>
    );
  }

  const dirty = !same(draft, preferences);
  const set = (change: Partial<NotificationPreferences>) => setDraft({ ...draft, ...change });
  const setCategory = (catKey: string, change: { muted?: boolean; sound?: boolean }) => {
    const existing = draft.categories.find((c) => c.category === catKey);
    const updatedCategories = existing
      ? draft.categories.map((c) => (c.category === catKey ? { ...c, ...change } : c))
      : [...draft.categories, { category: catKey, muted: change.muted ?? false, sound: change.sound ?? true }];
    set({ categories: updatedCategories });
  };

  const mutedUntil = draft.mutedUntil && new Date(draft.mutedUntil).getTime() > Date.now() ? draft.mutedUntil : null;
  const isForever = mutedUntil?.startsWith("9999");

  const save = async () => {
    setSaving(true);
    try {
      const saved = await savePreferencesAction({
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
    } catch {
      toast.error(s.failed);
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

  const handleTestSound = () => {
    unlockNotificationSound();
    void playNotificationSound(draft.sound ?? "chime", draft.volume ?? 70);
  };

  const handleSetStatus = async (choice: StatusChoice) => {
    try {
      await setStatusAction(choice);
      toast.success(copy.live.status);
      await reload();
    } catch {
      toast.error(copy.live.failed);
    }
  };

  const handleClearStatus = async () => {
    try {
      await clearStatusAction();
      toast.success(copy.live.status);
      await reload();
    } catch {
      toast.error(copy.live.failed);
    }
  };

  const handleUnmuteRecord = async (entityType: string, entityId: string) => {
    try {
      await unmuteRecordAction(entityType, entityId);
      toast.success(copy.live.recordMuted);
      await reload();
    } catch {
      toast.error(copy.live.failed);
    }
  };

  return (
    <div className="space-y-6">
      <PageTitle title={s.title} description={s.description} />

      {/* Tabs */}
      <div role="tablist" aria-label={s.title} className="flex border-b border-outline-variant gap-2 overflow-x-auto">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "notifications"}
          onClick={() => setActiveTab("notifications")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === "notifications"
              ? "border-primary text-primary"
              : "border-transparent text-ink-muted hover:text-ink"
          }`}
        >
          <BellRing className="size-4" aria-hidden />
          {s.tabs.notifications}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "appearance"}
          onClick={() => setActiveTab("appearance")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === "appearance"
              ? "border-primary text-primary"
              : "border-transparent text-ink-muted hover:text-ink"
          }`}
        >
          <Sun className="size-4" aria-hidden />
          {s.tabs.appearance}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "account"}
          onClick={() => setActiveTab("account")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === "account"
              ? "border-primary text-primary"
              : "border-transparent text-ink-muted hover:text-ink"
          }`}
        >
          <User className="size-4" aria-hidden />
          {s.tabs.account}
        </button>
      </div>

      {/* Tab 1: Notifications & Sound */}
      {activeTab === "notifications" && (
        <div className="space-y-6">
          {/* Pause / Mute Notifications */}
          <Section icon={<BellOff className="size-5" aria-hidden />} title={sn.pauseTitle} hint={sn.pauseHint}>
            {mutedUntil ? (
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
                <div className="flex items-center gap-2 text-sm text-amber-900 dark:text-amber-200">
                  <BellOff className="size-4 shrink-0" aria-hidden />
                  <span>
                    {isForever
                      ? sn.pauseForever
                      : formatMessage(sn.pauseActive, {
                          time: new Date(mutedUntil).toLocaleString(locale === "ar" ? "ar-u-nu-latn" : "en-GB", {
                            dateStyle: "short",
                            timeStyle: "short",
                          }),
                        })}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => set({ mutedUntil: null })}
                  className="inline-flex items-center gap-1.5 rounded-full border border-outline-variant bg-surface px-3 py-1.5 text-xs font-semibold text-ink hover:bg-surface-container"
                >
                  <BellRing className="size-3.5" aria-hidden />
                  {sn.unmute}
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs font-medium text-ink-muted">{sn.muteFor}</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => set({ mutedUntil: muteUntil("1h") })}
                    className="rounded-full border border-outline-variant px-3 py-1.5 text-xs font-medium text-ink hover:bg-surface-container"
                  >
                    {sn.muteOptions["1h"]}
                  </button>
                  <button
                    type="button"
                    onClick={() => set({ mutedUntil: muteUntil("8h") })}
                    className="rounded-full border border-outline-variant px-3 py-1.5 text-xs font-medium text-ink hover:bg-surface-container"
                  >
                    {sn.muteOptions["8h"]}
                  </button>
                  <button
                    type="button"
                    onClick={() => set({ mutedUntil: muteUntil("tomorrow") })}
                    className="rounded-full border border-outline-variant px-3 py-1.5 text-xs font-medium text-ink hover:bg-surface-container"
                  >
                    {sn.muteOptions.tomorrow}
                  </button>
                  <button
                    type="button"
                    onClick={() => set({ mutedUntil: muteUntil("forever") })}
                    className="rounded-full border border-outline-variant px-3 py-1.5 text-xs font-medium text-ink hover:bg-surface-container"
                  >
                    {sn.muteOptions.forever}
                  </button>
                </div>
              </div>
            )}
          </Section>

          {/* Sound & Volume */}
          <Section icon={<Volume2 className="size-5" aria-hidden />} title={sn.soundTitle} hint={sn.soundHint}>
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-ink">{sn.soundEnabled}</p>
                </div>
                <Toggle
                  checked={draft.soundEnabled ?? true}
                  onChange={(v) => set({ soundEnabled: v })}
                  label={sn.soundEnabled}
                />
              </div>

              {(draft.soundEnabled ?? true) && (
                <div className="space-y-4 border-t border-outline-variant/60 pt-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="sound-select" className="block text-xs font-semibold text-ink mb-1.5">
                        {sn.soundChoice}
                      </label>
                      <div className="flex items-center gap-2">
                        <select
                          id="sound-select"
                          value={draft.sound ?? "chime"}
                          onChange={(e) => set({ sound: e.target.value as NotificationPreferences["sound"] })}
                          className="flex-1 rounded-xl border border-outline-variant bg-surface px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent"
                        >
                          {NOTIFICATION_SOUNDS.map((soundKey) => (
                            <option key={soundKey} value={soundKey}>
                              {sn.sounds[soundKey as keyof typeof sn.sounds] ?? soundKey}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={handleTestSound}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-outline-variant px-3 py-2 text-xs font-semibold text-ink hover:bg-surface-container"
                          title={sn.testSound}
                        >
                          <Play className="size-3.5 text-accent" aria-hidden />
                          {sn.testSound}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label htmlFor="volume-range" className="block text-xs font-semibold text-ink mb-1.5">
                        {formatMessage(sn.volume, { volume: String(draft.volume ?? 70) })}
                      </label>
                      <input
                        id="volume-range"
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={draft.volume ?? 70}
                        onChange={(e) => set({ volume: Number(e.target.value) })}
                        className="w-full accent-primary"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Section>

          {/* Alerts & Desktop Notifications */}
          <Section icon={<Monitor className="size-5" aria-hidden />} title={sn.alertsTitle} hint={sn.alertsHint}>
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-ink">{sn.popupsEnabled}</p>
                </div>
                <Toggle
                  checked={draft.popupsEnabled ?? true}
                  onChange={(v) => set({ popupsEnabled: v })}
                  label={sn.popupsEnabled}
                />
              </div>

              <div className="flex items-center justify-between gap-4 border-t border-outline-variant/60 pt-4">
                <div>
                  <p className="text-sm font-medium text-ink">{sn.desktopEnabled}</p>
                  <p className="text-xs text-ink-muted">
                    {permission === "denied"
                      ? sn.desktopDenied
                      : permission === "granted"
                      ? sn.desktopGranted
                      : sn.alertsHint}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {permission !== "granted" && permission !== "denied" && (
                    <button
                      type="button"
                      onClick={enableDesktop}
                      className="rounded-full border border-outline-variant px-3 py-1.5 text-xs font-semibold text-ink hover:bg-surface-container"
                    >
                      {sn.desktopEnableBtn}
                    </button>
                  )}
                  <Toggle
                    checked={draft.desktopEnabled && permission === "granted"}
                    disabled={permission !== "granted"}
                    onChange={(v) => set({ desktopEnabled: v })}
                    label={sn.desktopEnabled}
                  />
                </div>
              </div>
            </div>
          </Section>

          {/* Category Preferences */}
          <Section icon={<Shield className="size-5" aria-hidden />} title={sn.categoriesTitle} hint={sn.categoriesHint}>
            <ul className="divide-y divide-outline-variant/60">
              {IT_CATEGORIES.map((catKey) => {
                const catDef = notificationCategory(catKey);
                const setting = draft.categories.find((c) => c.category === catKey);
                const isMandatory = catDef?.mandatory ?? false;
                const isMuted = !isMandatory && setting?.muted === true;
                const isSoundOn = setting?.sound !== false;
                const catName = locale === "ar" ? catDef?.nameAr ?? catKey : catDef?.nameEn ?? catKey;
                const catDesc = locale === "ar" ? catDef?.descriptionAr ?? "" : catDef?.descriptionEn ?? "";

                return (
                  <li key={catKey} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-ink">{catName}</span>
                        {isMandatory && (
                          <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300">
                            {sn.mandatoryHint}
                          </span>
                        )}
                      </div>
                      {catDesc && <p className="mt-0.5 text-xs text-ink-muted">{catDesc}</p>}
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      {!isMandatory && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-ink-muted">{isMuted ? sn.muted : sn.active}</span>
                          <Toggle
                            checked={!isMuted}
                            onChange={(on) => setCategory(catKey, { muted: !on })}
                            label={catName}
                          />
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => setCategory(catKey, { sound: !isSoundOn })}
                        title={isSoundOn ? sn.soundOn : sn.soundOff}
                        aria-label={isSoundOn ? sn.soundOn : sn.soundOff}
                        className={`rounded-lg p-2 transition-colors ${
                          isSoundOn ? "text-accent bg-accent/10" : "text-ink-muted hover:bg-surface-container"
                        }`}
                      >
                        {isSoundOn ? <Volume2 className="size-4" aria-hidden /> : <VolumeX className="size-4" aria-hidden />}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Section>

          {/* Muted Items */}
          <Section icon={<BellOff className="size-5" aria-hidden />} title={sn.mutedItemsTitle} hint={sn.mutedItemsHint}>
            {!mutes.length ? (
              <p className="text-xs text-ink-muted">{sn.noMutedItems}</p>
            ) : (
              <ul className="divide-y divide-outline-variant/60">
                {mutes.map((mute) => (
                  <li key={`${mute.entityType}:${mute.entityId}`} className="flex items-center justify-between py-2.5">
                    <div>
                      <p className="text-xs font-semibold text-ink">
                        {mute.entityType} #{mute.entityId}
                      </p>
                      {mute.until && (
                        <p className="text-[11px] text-ink-muted">
                          {formatMessage(sn.pauseActive, {
                            time: new Date(mute.until).toLocaleString(locale === "ar" ? "ar-u-nu-latn" : "en-GB"),
                          })}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleUnmuteRecord(mute.entityType, mute.entityId)}
                      className="rounded-full border border-outline-variant px-3 py-1 text-xs font-semibold text-ink hover:bg-surface-container"
                    >
                      {sn.unmuteItem}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          {/* Save button */}
          <div className="flex justify-end gap-3 sticky bottom-4 z-10 bg-surface/80 backdrop-blur p-4 rounded-2xl border border-outline-variant shadow-lg">
            <button
              type="button"
              disabled={!dirty || saving}
              onClick={save}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow transition hover:opacity-90 disabled:opacity-40"
            >
              <Save className="size-4" aria-hidden />
              {saving ? s.saving : s.save}
            </button>
          </div>
        </div>
      )}

      {/* Tab 2: Appearance & Display */}
      {activeTab === "appearance" && (
        <div className="space-y-6">
          {/* Theme selector */}
          <Section icon={<Sun className="size-5" aria-hidden />} title={sa.themeTitle} hint={sa.themeHint}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => applyTheme("light")}
                className={`flex flex-col items-center gap-2 rounded-2xl border p-4 text-center transition-all ${
                  themeMode === "light"
                    ? "border-primary bg-primary/5 text-primary font-bold shadow-sm"
                    : "border-outline-variant hover:bg-surface-container text-ink"
                }`}
              >
                <Sun className="size-6" aria-hidden />
                <span className="text-sm">{sa.light}</span>
                {themeMode === "light" && <Check className="size-4 text-primary" aria-hidden />}
              </button>

              <button
                type="button"
                onClick={() => applyTheme("dark")}
                className={`flex flex-col items-center gap-2 rounded-2xl border p-4 text-center transition-all ${
                  themeMode === "dark"
                    ? "border-primary bg-primary/5 text-primary font-bold shadow-sm"
                    : "border-outline-variant hover:bg-surface-container text-ink"
                }`}
              >
                <Moon className="size-6" aria-hidden />
                <span className="text-sm">{sa.dark}</span>
                {themeMode === "dark" && <Check className="size-4 text-primary" aria-hidden />}
              </button>

              <button
                type="button"
                onClick={() => applyTheme("system")}
                className={`flex flex-col items-center gap-2 rounded-2xl border p-4 text-center transition-all ${
                  themeMode === "system"
                    ? "border-primary bg-primary/5 text-primary font-bold shadow-sm"
                    : "border-outline-variant hover:bg-surface-container text-ink"
                }`}
              >
                <Laptop className="size-6" aria-hidden />
                <span className="text-sm">{sa.system}</span>
                {themeMode === "system" && <Check className="size-4 text-primary" aria-hidden />}
              </button>
            </div>
          </Section>

          {/* Language selection */}
          <Section icon={<Languages className="size-5" aria-hidden />} title={sa.languageTitle} hint={sa.languageHint}>
            <div className="flex flex-wrap gap-3">
              <form action={setLocaleAction.bind(null, "en")}>
                <button
                  type="submit"
                  className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                    locale === "en"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-outline-variant text-ink hover:bg-surface-container"
                  }`}
                >
                  {locale === "en" && <Check className="size-4" aria-hidden />}
                  {sa.languageEnglish}
                </button>
              </form>
              <form action={setLocaleAction.bind(null, "ar")}>
                <button
                  type="submit"
                  className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                    locale === "ar"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-outline-variant text-ink hover:bg-surface-container"
                  }`}
                >
                  {locale === "ar" && <Check className="size-4" aria-hidden />}
                  {sa.languageArabic}
                </button>
              </form>
            </div>
          </Section>

          {/* Presence status */}
          <Section icon={<User className="size-5" aria-hidden />} title={sa.statusTitle} hint={sa.statusHint}>
            <div className="space-y-3">
              {status && (
                <div className="flex items-center gap-2 text-xs text-ink-muted">
                  <span>{copy.live.status}:</span>
                  <span className="font-semibold text-ink">
                    {presenceStatusLabels[status.presence.status] ?? status.presence.status}
                  </span>
                  {status.presence.message && <span>— {status.presence.message}</span>}
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleSetStatus({ status: "available" })}
                  className="rounded-full border border-outline-variant px-3 py-1.5 text-xs font-semibold text-ink hover:bg-surface-container"
                >
                  🟢 {presenceStatusLabels.available}
                </button>
                <button
                  type="button"
                  onClick={() => handleSetStatus({ status: "busy" })}
                  className="rounded-full border border-outline-variant px-3 py-1.5 text-xs font-semibold text-ink hover:bg-surface-container"
                >
                  🔴 {presenceStatusLabels.busy}
                </button>
                <button
                  type="button"
                  onClick={() => handleSetStatus({ status: "do_not_disturb" })}
                  className="rounded-full border border-outline-variant px-3 py-1.5 text-xs font-semibold text-ink hover:bg-surface-container"
                >
                  ⛔ {presenceStatusLabels.do_not_disturb}
                </button>
                <button
                  type="button"
                  onClick={() => handleSetStatus({ status: "in_a_meeting" })}
                  className="rounded-full border border-outline-variant px-3 py-1.5 text-xs font-semibold text-ink hover:bg-surface-container"
                >
                  📅 {presenceStatusLabels.in_a_meeting}
                </button>
                <button
                  type="button"
                  onClick={() => handleSetStatus({ status: "away" })}
                  className="rounded-full border border-outline-variant px-3 py-1.5 text-xs font-semibold text-ink hover:bg-surface-container"
                >
                  🟡 {presenceStatusLabels.away}
                </button>
                <button
                  type="button"
                  onClick={handleClearStatus}
                  className="inline-flex items-center gap-1 rounded-full border border-outline-variant px-3 py-1.5 text-xs font-semibold text-ink-muted hover:bg-surface-container"
                >
                  <RotateCcw className="size-3" aria-hidden />
                  {copy.live.reset}
                </button>
              </div>
            </div>
          </Section>
        </div>
      )}

      {/* Tab 3: Account info */}
      {activeTab === "account" && (
        <div className="space-y-6">
          <Section icon={<ShieldAlert className="size-5" aria-hidden />} title={s.account.title}>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-ink-muted">{s.account.email}</p>
                <p className="text-sm font-semibold text-ink" dir="ltr">
                  {email}
                </p>
              </div>

              <div>
                <p className="text-xs text-ink-muted">{s.account.roles}</p>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {roles.map((r) => (
                    <span
                      key={r}
                      className="rounded-full bg-surface-container px-2.5 py-0.5 text-xs font-medium text-ink"
                    >
                      {role(r)}
                    </span>
                  ))}
                </div>
              </div>

              <div className="border-t border-outline-variant/60 pt-4">
                <TwoFactorSettings />
              </div>

              <div className="border-t border-outline-variant/60 pt-4">
                <form action={signOutAction}>
                  <button
                    type="submit"
                    className="rounded-full border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-xs font-semibold text-rose-700 dark:text-rose-300 hover:bg-rose-500/20"
                  >
                    {s.account.signOut}
                  </button>
                </form>
              </div>
            </div>
          </Section>
        </div>
      )}
    </div>
  );
}

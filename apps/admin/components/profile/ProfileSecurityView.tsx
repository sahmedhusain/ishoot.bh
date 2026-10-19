"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Monitor, Loader2, ShieldCheck, LogOut } from "lucide-react";
import { toast } from "sonner";
import { Button, Input, formatDate } from "@platform/ui";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import {
  changeMyPasswordAction,
  revokeMySessionAction,
  revokeOtherSessionsAction,
} from "../../app/actions/account-security";
import { errorMessage } from "../../lib/error-text";
import { SecuritySettingsView } from "../settings/SecuritySettingsView";
export type OwnSession = {
  id: string;
  createdAt: string;
  expiresAt: string;
  userAgent: string | null;
  ipAddress: string | null;
  current: boolean;
};
export function ProfileSecurityView({
  mfaEnabled,
  sessions,
  recoveryCount,
}: {
  mfaEnabled: boolean;
  sessions: OwnSession[];
  recoveryCount: number;
}) {
  const { t, locale } = useAdminLocale();
  const p = t.profileSecurity;
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [ending, setEnding] = useState<string | null>(null);
  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirm: "",
    code: "",
  });
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.newPassword !== form.confirm) {
      toast.error(p.passwordMismatch);
      return;
    }
    setBusy(true);
    try {
      await changeMyPasswordAction({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
        code: form.code || undefined,
      });
      setForm({ currentPassword: "", newPassword: "", confirm: "", code: "" });
      toast.success(p.passwordChanged);
      window.location.assign("/login");
    } catch (err) {
      toast.error(errorMessage(err, t, p.failed));
      setBusy(false);
    }
  };
  const end = async (id?: string) => {
    setEnding(id ?? "others");
    try {
      if (id) await revokeMySessionAction(id);
      else await revokeOtherSessionsAction();
      toast.success(p.sessionEnded);
      router.refresh();
    } catch (err) {
      toast.error(errorMessage(err, t, p.failed));
    } finally {
      setEnding(null);
    }
  };
  const device = (agent: string | null) =>
    agent?.includes("Edg/")
      ? p.browsers.edge
      : agent?.includes("Firefox/")
        ? p.browsers.firefox
        : agent?.includes("Chrome/")
          ? p.browsers.chrome
          : agent?.includes("Safari/")
            ? p.browsers.safari
            : p.device;
  return (
    <section id="security" className="scroll-mt-20 space-y-6">
      <header className="flex items-start gap-3">
        <ShieldCheck aria-hidden className="mt-1 h-5 w-5 text-accent" />
        <div>
          <h2 className="text-xl font-semibold text-ink">{p.title}</h2>
          <p className="mt-1 text-sm text-ink-muted">{p.subtitle}</p>
        </div>
      </header>
      <div className="grid gap-6 lg:grid-cols-2">
        <section
          id="password"
          className="scroll-mt-20 rounded-2xl border border-ink/10 bg-white p-5 dark:bg-surface-raised sm:p-6"
        >
          <h3 className="flex items-center gap-2 font-semibold text-ink">
            <KeyRound aria-hidden className="h-4 w-4 text-accent" />
            {p.changePassword}
          </h3>
          <p className="mt-2 text-sm text-ink-muted">{p.passwordHint}</p>
          <form onSubmit={submit} className="mt-5 space-y-4">
            <label className="block text-sm text-ink">
              {t.securitySettings.currentPassword}
              <Input
                type="password"
                autoComplete="current-password"
                maxLength={1024}
                required
                value={form.currentPassword}
                onChange={(e) =>
                  setForm({ ...form, currentPassword: e.target.value })
                }
              />
            </label>
            <label className="block text-sm text-ink">
              {p.newPassword}
              <Input
                type="password"
                autoComplete="new-password"
                minLength={12}
                maxLength={72}
                required
                value={form.newPassword}
                onChange={(e) =>
                  setForm({ ...form, newPassword: e.target.value })
                }
              />
            </label>
            <label className="block text-sm text-ink">
              {p.confirmPassword}
              <Input
                type="password"
                autoComplete="new-password"
                required
                value={form.confirm}
                onChange={(e) => setForm({ ...form, confirm: e.target.value })}
              />
            </label>
            {mfaEnabled && (
              <label className="block text-sm text-ink">
                {t.securitySettings.authenticationOrRecoveryCode}
                <Input
                  dir="ltr"
                  autoComplete="one-time-code"
                  maxLength={32}
                  required
                  value={form.code}
                  onChange={(e) =>
                    setForm({ ...form, code: e.target.value.trim() })
                  }
                />
              </label>
            )}
            <Button
              type="submit"
              disabled={
                busy ||
                !form.currentPassword ||
                !form.newPassword ||
                !form.confirm
              }
            >
              {busy && <Loader2 aria-hidden className="h-4 w-4 animate-spin" />}
              {p.changePassword}
            </Button>
          </form>
        </section>
        <div>
          <SecuritySettingsView
            enabled={mfaEnabled}
            embedded
            recoveryCount={recoveryCount}
          />
        </div>
      </div>
      <section
        id="sessions"
        className="scroll-mt-20 rounded-2xl border border-ink/10 bg-white p-5 dark:bg-surface-raised sm:p-6"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="font-semibold text-ink">{p.sessions}</h3>
            <p className="mt-1 text-sm text-ink-muted">{p.sessionsHint}</p>
          </div>
          {sessions.some((s) => !s.current) && (
            <Button
              variant="outline"
              disabled={ending !== null}
              onClick={() => end()}
            >
              {ending === "others" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              {p.endOthers}
            </Button>
          )}
        </div>
        <ul className="mt-4 divide-y divide-ink/10">
          {sessions.map((session) => (
            <li key={session.id} className="flex items-center gap-3 py-4">
              <Monitor
                aria-hidden
                className="h-5 w-5 shrink-0 text-ink-muted"
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-ink">
                    {device(session.userAgent)}
                  </span>
                  {session.current && (
                    <span className="rounded-md bg-accent/10 px-2 py-0.5 text-xs text-primary dark:text-mint">
                      {p.currentSession}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-ink-muted">
                  {p.signedIn} {formatDate(session.createdAt, locale, "time")}
                  {session.ipAddress ? ` · ${session.ipAddress}` : ""}
                </p>
              </div>
              {!session.current && (
                <button
                  type="button"
                  disabled={ending !== null}
                  onClick={() => end(session.id)}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink-muted hover:bg-ink/5 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  {ending === session.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <LogOut aria-hidden className="h-4 w-4" />
                  )}
                  {p.endSession}
                </button>
              )}
            </li>
          ))}
        </ul>
        {!sessions.length && (
          <p className="mt-4 text-sm text-ink-muted">{p.noSessions}</p>
        )}
      </section>
    </section>
  );
}

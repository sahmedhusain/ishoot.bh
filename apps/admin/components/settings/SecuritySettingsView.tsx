"use client";
import { formatMessage } from "@platform/locales";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ShieldCheck, Smartphone, Download, Copy, Loader2 } from "lucide-react";
import { Button, Input, ConfirmDialog } from "@platform/ui";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { errorMessage } from "../../lib/error-text";
export function SecuritySettingsView({
  enabled,
  embedded = false,
  recoveryCount = 0,
}: {
  enabled: boolean;
  embedded?: boolean;
  recoveryCount?: number;
}) {
  const { t } = useAdminLocale();
  const st = t.securitySettings;
  const p = t.profileSecurity;
  const [active, setActive] = useState(enabled);
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [secret, setSecret] = useState("");
  const [qr, setQr] = useState("");
  const [codes, setCodes] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [reauth, setReauth] = useState(false);
  const [disableConfirm, setDisableConfirm] = useState(false);
  async function submit(mode: string) {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/auth/mfa", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode, password, code }),
      });
      const data = await response.json();
      if (!response.ok) throw Error(data.error);
      if (data.secret) {
        setSecret(data.secret);
        const QRCode = (await import("qrcode")).default;
        setQr(await QRCode.toDataURL(data.uri, { width: 208, margin: 2 }));
      }
      if (data.recoveryCodes) {
        setCodes(data.recoveryCodes);
        setActive(true);
      }
      if (mode === "confirm" || mode === "disable") {
        setReauth(true);
        setActive(mode === "confirm");
        setSecret("");
        setQr("");
        setPassword("");
        setCode("");
      }
      if (mode === "cancel") {
        setSecret("");
        setQr("");
        setCode("");
        setPassword("");
      }
    } catch (err) {
      setError(errorMessage(err, t, st.failed));
    } finally {
      setLoading(false);
      setDisableConfirm(false);
    }
  }
  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      setError(p.copyFailed);
    }
  };
  const download = () => {
    const url = URL.createObjectURL(
      new Blob([codes.join("\n")], { type: "text/plain" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "recovery-codes.txt";
    a.click();
    URL.revokeObjectURL(url);
  };
  const Heading = embedded ? "h3" : "h1";
  return (
    <section className="rounded-2xl border border-outline-variant bg-surface-raised p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Heading className="flex items-center gap-2 font-semibold text-ink">
          <ShieldCheck aria-hidden className="h-4 w-4 text-accent" />
          {p.twoFactor}
        </Heading>
        <span
          className={`rounded-md px-2 py-1 text-xs font-medium ${active ? "bg-accent/10 text-primary dark:text-mint" : "bg-ink/5 text-ink-muted"}`}
        >
          {active ? st.statusOn : st.statusOff}
        </span>
      </div>
      <p className="mt-2 text-sm text-ink-muted">{st.subtitle}</p>
      {active && !reauth && (
        <p className="mt-3 text-xs text-ink-muted">
          {formatMessage(p.recoveryRemaining, { count: String(recoveryCount) })}
        </p>
      )}
      {!reauth && (
        <form
          className="mt-5 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (active) setDisableConfirm(true);
            else void submit(secret ? "confirm" : "enroll");
          }}
        >
          <label className="block text-sm text-ink">
            {st.currentPassword}
            <Input
              type="password"
              autoComplete="current-password"
              required
              maxLength={1024}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {secret && (
            <div className="space-y-3 rounded-xl bg-ink/5 p-4">
              <p className="text-sm text-ink-muted">{p.scanAuthenticator}</p>
              {qr && (
                <Image
                  unoptimized
                  src={qr}
                  alt={p.authenticatorQr}
                  width={208}
                  height={208}
                  className="mx-auto rounded-lg"
                />
              )}
              <p className="text-xs text-ink-muted">{st.addThisSetupKeyTo}</p>
              <code
                dir="ltr"
                className="block break-all select-all text-sm text-ink"
              >
                {secret}
              </code>
              <button
                type="button"
                onClick={() => copy(secret)}
                className="flex items-center gap-2 text-xs font-medium text-accent"
              >
                <Copy aria-hidden className="h-3.5 w-3.5" />
                {p.copyKey}
              </button>
            </div>
          )}
          {(active || secret) && (
            <label className="block text-sm text-ink">
              {st.authenticationOrRecoveryCode}
              <Input
                dir="ltr"
                autoComplete="one-time-code"
                required
                maxLength={32}
                value={code}
                onChange={(e) => setCode(e.target.value.trim())}
              />
            </label>
          )}
          <div className="flex flex-wrap gap-3">
            <Button
              variant={active ? "outline" : "primary"}
              type="submit"
              disabled={loading || !password || ((active || !!secret) && !code)}
            >
              {loading ? (
                <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
              ) : (
                <Smartphone aria-hidden className="h-4 w-4" />
              )}
              {active
                ? st.disableMfa
                : secret
                  ? st.confirmSetup
                  : st.setUpAuthenticator}
            </Button>
            {secret && (
              <Button
                type="button"
                variant="ghost"
                disabled={loading}
                onClick={() => submit("cancel")}
              >
                {t.actions.cancel}
              </Button>
            )}
          </div>
        </form>
      )}
      {codes.length > 0 && (
        <div className="mt-5 space-y-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
          <p className="text-sm font-medium text-ink">
            {st.saveTheseCodesSecurelyThey}
          </p>
          <div
            dir="ltr"
            className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2"
          >
            {codes.map((value) => (
              <code
                key={value}
                className="select-all break-all text-xs text-ink"
              >
                {value}
              </code>
            ))}
          </div>
          <div className="flex gap-4">
            <button
              type="button"
              onClick={download}
              className="flex items-center gap-2 text-sm text-accent"
            >
              <Download aria-hidden className="h-4 w-4" />
              {p.downloadCodes}
            </button>
            <button
              type="button"
              onClick={() => copy(codes.join("\n"))}
              className="flex items-center gap-2 text-sm text-accent"
            >
              <Copy aria-hidden className="h-4 w-4" />
              {p.copyCodes}
            </button>
          </div>
        </div>
      )}
      {error && (
        <p role="alert" className="mt-4 text-sm text-rose-600">
          {error}
        </p>
      )}
      {reauth && (
        <div role="status" className="mt-5 space-y-3">
          <p className="text-sm text-ink-muted">{st.updatedSignInAgain}</p>
          <Link
            href="/login"
            className="inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            {st.signIn}
          </Link>
        </div>
      )}
      <ConfirmDialog
        isOpen={disableConfirm}
        onClose={() => setDisableConfirm(false)}
        onConfirm={() => submit("disable")}
        title={st.disableMfa}
        description={p.disableMfaHint}
        confirmLabel={st.disableMfa}
        cancelLabel={t.actions.cancel}
        variant="warning"
      />
    </section>
  );
}

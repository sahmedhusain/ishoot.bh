"use client";
import { ROUTES } from "../../constants/routes";
import type { AuthBrandingProps } from "../../types/auth";
import { AuthBrandMark } from "./AuthBrandMark";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input, Button, Card } from "@platform/ui";
import { Lock, Mail, ArrowRight, AlertCircle, Globe } from "lucide-react";
import { useAdminLocale } from "../../hooks/useAdminLocale";

export function AdminLoginFormView(brand: AuthBrandingProps) {
  const { companyName } = brand;
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedCallback = searchParams.get("callbackUrl") || ROUTES.home;
  const callbackUrl =
    requestedCallback.startsWith("/") &&
    !requestedCallback.startsWith("//") &&
    !requestedCallback.includes("\\")
      ? requestedCallback
      : ROUTES.home;
  const { t, locale, setLocale, isRTL } = useAdminLocale();

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [otp, setOtp] = React.useState("");
  const [mfaRequired, setMfaRequired] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const handleToggleLocale = () => {
    setLocale(locale === "ar" ? "en" : "ar");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: email.trim(),
          email: email.trim(),
          password,
          otp,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        if (data.mfaRequired) setMfaRequired(true);
        setErrorMessage(
          res.status === 401
            ? t.loginView.errorInvalid
            : data.error || t.loginView.errorGeneric,
        );
        setLoading(false);
        return;
      }

      window.location.href = callbackUrl;
    } catch {
      setErrorMessage(t.loginView.errorGeneric);
      setLoading(false);
    }
  };

  return (
    <main
      dir={isRTL ? "rtl" : "ltr"}
      className="h-[100dvh] flex items-center justify-center px-6 pt-20 pb-6 bg-brand-base relative overflow-auto"
    >
      <div className="absolute top-6 end-6 z-20">
        <button
          type="button"
          onClick={handleToggleLocale}
          className="m3-state-layer flex min-h-10 items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-primary"
        >
          <Globe className="w-3.5 h-3.5 text-accent" />
          <span>{t.loginView.switchLanguage}</span>
        </button>
      </div>

      <Card
        variant="filled"
        className="relative z-10 my-auto w-full max-w-md p-8 sm:p-10 bg-surface-container-low rounded-3xl space-y-8"
      >
        <div className="text-center space-y-4">
          <AuthBrandMark {...brand} />
          <div className="space-y-1">
            <h1 className="text-xl font-bold text-ink tracking-tight font-display">
              {companyName ? (
                <span dir="auto">{companyName}</span>
              ) : (
                <span>{t.portalTitle}</span>
              )}
            </h1>
            <p className="text-xs text-ink-muted tracking-wider uppercase">
              {t.loginView.subtitle}
            </p>
          </div>
        </div>

        {errorMessage && (
          <div
            role="alert"
            id="login-error"
            className="p-3.5 rounded-xl bg-m3-error-container flex items-start gap-2.5 text-sm text-m3-on-error-container"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-1.5">
            <label
              htmlFor="login-username"
              className="text-sm font-medium text-ink-muted"
            >
              {locale === "ar" ? "اسم المستخدم" : "Username"}
            </label>
            <div className="relative" dir="ltr">
              <Mail className="pointer-events-none w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted" />
              <Input
                id="login-username"
                name="username"
                type="text"
                required
                autoComplete="username"
                placeholder={locale === "ar" ? "اسم المستخدم (مثال: BA0001)" : "Username (e.g. BA0001)"}
                className="pl-10 pr-3.5"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="login-password"
                className="text-sm font-medium text-ink-muted"
              >
                {t.loginView.passwordLabel}
              </label>
              <button
                type="button"
                onClick={() => router.push("/login/forgot")}
                className="min-h-10 text-sm text-primary hover:underline"
              >
                {t.adminLoginForm.forgotPassword}
              </button>
            </div>
            <div className="relative">
              <Lock className="pointer-events-none w-4 h-4 absolute start-3.5 top-1/2 -translate-y-1/2 text-ink-muted" />
              <Input
                id="login-password"
                aria-invalid={!!errorMessage}
                aria-describedby={errorMessage ? "login-error" : undefined}
                type="password"
                required
                autoComplete="current-password"
                placeholder={t.loginView.passwordPlaceholder}
                className="ps-10"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {mfaRequired && (
            <label className="block text-sm text-ink">
              {t.adminLoginForm.authenticationOrRecoveryCode}
              <Input
                autoComplete="one-time-code"
                value={otp}
                maxLength={32}
                onChange={(e) => setOtp(e.target.value.trim())}
                required
              />
            </label>
          )}

          <Button
            type="submit"
            disabled={loading}
            variant="primary"
            size="lg"
            className="w-full gap-2 mt-4"
          >
            <span>
              {loading ? t.loginView.authenticating : t.loginView.submit}
            </span>
            <ArrowRight className={`w-4 h-4 ${isRTL ? "rotate-180" : ""}`} />
          </Button>
        </form>

        <div className="text-center text-xs text-ink-muted">
          {t.loginView.footerNote}
        </div>
      </Card>
    </main>
  );
}

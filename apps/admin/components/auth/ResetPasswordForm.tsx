"use client";
import { errorMessage } from "../../lib/error-text";
import type { AuthBrandingProps } from "../../types/auth";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input, Button, Card } from "@platform/ui";
import { Lock, ArrowRight, AlertCircle, CheckCircle2 } from "lucide-react";
import { AuthBrandMark } from "./AuthBrandMark";

export function ResetPasswordForm(brand: AuthBrandingProps) {
  const { t } = useAdminLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const email = searchParams.get("email") || "";

  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    if (!token || !email) {
      setError(t.resetPasswordForm.invalidOrMissingPasswordReset);
    }
  }, [token, email, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !email) return;
    if (password.length < 8) {
      setError(t.resetPasswordForm.passwordMustBeAtLeast);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token, newPassword: password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessage(t.resetPasswordForm.passwordSuccessfullyResetYouCan);
      setTimeout(() => router.push("/login"), 3000);
    } catch (err: any) {
      setError(errorMessage(err, t, t.resetPasswordForm.failedToResetPassword));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-brand-base relative overflow-hidden">
      <Card className="relative z-10 w-full max-w-md p-8 sm:p-10 bg-brand-surface border border-accent/30 shadow-2xl rounded-3xl space-y-8">
        <div className="text-center space-y-4">
          <AuthBrandMark {...brand} />
          <div>
            <h1 className="text-xl font-bold text-ink tracking-tight font-display">{t.resetPasswordForm.createNewPassword}</h1>
            <p className="text-xs text-ink-muted uppercase">{t.resetPasswordForm.setAStrongPasswordFor}</p>
          </div>
        </div>

        {error && <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-xs text-rose-300"><AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /><span>{error}</span></div>}
        {message && <div className="p-3.5 rounded-xl bg-accent/15 border border-accent/30 flex items-start gap-2.5 text-xs text-accent"><CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /><span>{message}</span></div>}

        {!message && !error && (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-ink-muted">{t.resetPasswordForm.newPassword}</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute top-3.5 start-3.5 text-ink-muted" />
                <Input type="password" required placeholder={t.resetPasswordForm.min8Characters} minLength={8} className="ps-10" value={password} onChange={e => setPassword(e.target.value)} />
              </div>
            </div>
            <Button type="submit" disabled={loading} variant="primary" size="lg" className="w-full gap-2 mt-4">
              <span>{loading ? t.shared.saving : t.resetPasswordForm.resetPassword}</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}

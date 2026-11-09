"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  FileQuestion,
  ShieldAlert,
  RefreshCw,
  Home,
  Terminal,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Film,
  Sparkles,
  ShoppingBag,
  Mail,
  Info,
} from "lucide-react";
import { useTranslation } from "../../hooks/useTranslation";

export interface WebUnifiedErrorPageProps {
  statusCode?: number | string;
  title?: string;
  description?: string;
  message?: string;
  error?: (Error & { digest?: string; status?: number; statusCode?: number }) | null;
  reset?: () => void;
  showQuickLinks?: boolean;
}

export function WebUnifiedErrorPage({
  statusCode,
  title: customTitle,
  description: customDescription,
  message: customMessage,
  error,
  reset,
  showQuickLinks,
}: WebUnifiedErrorPageProps) {
  const { t, locale, isRTL, translations } = useTranslation();
  const copy = translations.errorPages;

  const [copied, setCopied] = useState(false);
  const [showStack, setShowStack] = useState(false);

  const resolvedCode = String(
    statusCode ?? (error?.status || error?.statusCode || (error ? 500 : 404)),
  );

  useEffect(() => {
    if (error) {
      console.error(`[WebUnifiedErrorPage HTTP ${resolvedCode}]:`, error);
    }
  }, [error, resolvedCode]);

  const copyDiagnostics = () => {
    const payload = JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        statusCode: resolvedCode,
        errorName: error?.name,
        errorMessage: customMessage || error?.message,
        digest: error?.digest,
        stack: error?.stack,
      },
      null,
      2,
    );
    navigator.clipboard.writeText(payload);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const titleKey = `code${resolvedCode}Title` as keyof typeof copy;
  const descKey = `code${resolvedCode}Desc` as keyof typeof copy;

  const resolvedTitle = customTitle || (copy[titleKey] as string) || copy.genericTitle;
  const resolvedDesc = customDescription || (copy[descKey] as string) || copy.genericDescription;
  const resolvedMessage = customMessage || error?.message || copy.unknownMessage;
  const resolvedBadge = copy.codePrefix.replace("{code}", resolvedCode);

  const is404 = resolvedCode === "404" || showQuickLinks;
  const isAuth = resolvedCode === "401" || resolvedCode === "403";

  const quickLinks = [
    { href: `/${locale}`, label: copy.homeLink, icon: Home },
    { href: `/${locale}/portfolio`, label: copy.portfolioLink, icon: Film },
    { href: `/${locale}/services`, label: copy.servicesLink, icon: Sparkles },
    { href: `/${locale}/store`, label: copy.storeLink, icon: ShoppingBag },
    { href: `/${locale}/about`, label: copy.aboutLink, icon: Info },
    { href: `/${locale}/contact`, label: copy.contactLink, icon: Mail },
  ];

  return (
    <main
      role="alert"
      className="min-h-[80vh] flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-brand-base text-ink"
      dir={isRTL ? "rtl" : "ltr"}
    >
      <div className="max-w-2xl w-full text-center space-y-6 bg-brand-surface/90 border border-white/10 p-6 sm:p-10 rounded-3xl shadow-2xl backdrop-blur-xl relative overflow-hidden">
        <div
          className={`absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full blur-3xl pointer-events-none ${
            is404
              ? "bg-accent/10"
              : isAuth
                ? "bg-amber-500/10"
                : "bg-rose-500/10"
          }`}
        />

        <div className="relative mx-auto">
          <div
            className={`w-20 h-20 rounded-2xl flex items-center justify-center mx-auto shadow-xl transition-transform ${
              is404
                ? "bg-accent/10 border border-accent/30 text-accent shadow-accent/10"
                : isAuth
                  ? "bg-amber-500/10 border border-amber-500/30 text-amber-400 shadow-amber-500/10"
                  : "bg-rose-500/10 border border-rose-500/30 text-rose-500 shadow-rose-500/10"
            }`}
          >
            {is404 ? (
              <FileQuestion className="w-10 h-10" />
            ) : isAuth ? (
              <ShieldAlert className="w-10 h-10" />
            ) : (
              <AlertCircle className="w-10 h-10" />
            )}
          </div>
        </div>

        <div className="space-y-3 relative z-10">
          <div
            className={`inline-flex items-center gap-2 px-3 py-1 rounded-full font-mono text-xs font-bold uppercase tracking-wider ${
              is404
                ? "bg-accent/10 border border-accent/25 text-accent"
                : isAuth
                  ? "bg-amber-500/10 border border-amber-500/25 text-amber-400"
                  : "bg-rose-500/10 border border-rose-500/25 text-rose-400"
            }`}
          >
            <span>{resolvedBadge}</span>
            {error?.name && <span>· {error.name}</span>}
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-white font-display tracking-tight">
            {resolvedTitle}
          </h1>

          <p className="text-sm text-ink-muted leading-relaxed max-w-lg mx-auto">
            {resolvedDesc}
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/60 p-4 text-left font-mono text-xs text-rose-300 break-words space-y-1.5 shadow-inner relative z-10">
          <div className="flex items-center gap-2 text-white/50 text-[11px] uppercase tracking-wider font-sans font-semibold">
            <Terminal className="w-3.5 h-3.5 text-rose-400" />
            <span>{copy.technicalMessageLabel}</span>
          </div>
          <div className="text-rose-400 font-semibold pl-1">
            {resolvedMessage}
          </div>
          {error?.digest && (
            <div className="text-[11px] text-white/40 pt-1 border-t border-white/5 pl-1">
              {copy.refPrefix} {error.digest}
            </div>
          )}
        </div>

        {is404 && (
          <div className="pt-1 text-left relative z-10">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted/70 mb-2.5 text-center">
              {copy.quickLinksHeading}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {quickLinks.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center justify-center gap-2 p-2.5 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] text-xs font-medium text-white transition-all hover:border-accent/30"
                  >
                    <Icon className="h-3.5 w-3.5 text-accent shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {error?.stack && (
          <div className="text-left relative z-10">
            <button
              type="button"
              onClick={() => setShowStack(!showStack)}
              className="text-xs text-white/40 hover:text-white/70 flex items-center gap-1 transition-colors mx-auto cursor-pointer"
            >
              {showStack ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              <span>{copy.diagnosticsToggle}</span>
            </button>

            {showStack && (
              <pre className="mt-2 p-3 rounded-xl bg-black/80 border border-white/10 text-white/60 font-mono text-[10px] overflow-x-auto max-h-40 whitespace-pre-wrap leading-relaxed">
                {error.stack}
              </pre>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2 relative z-10">
          {reset && (
            <button
              type="button"
              onClick={reset}
              className="min-h-11 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold transition-all border border-accent/40 active:scale-95 shadow-lg shadow-primary/20 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{copy.retry}</span>
            </button>
          )}

          <Link
            href={`/${locale}`}
            className="min-h-11 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold transition-colors border border-white/10 cursor-pointer"
          >
            <Home className="w-3.5 h-3.5" />
            <span>{copy.returnHome}</span>
          </Link>

          {error && (
            <button
              type="button"
              onClick={copyDiagnostics}
              className="min-h-11 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-white/50 hover:text-white hover:bg-white/5 text-xs font-medium transition-colors cursor-pointer border border-transparent hover:border-white/10"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400 font-semibold">{copy.copied}</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copy.copyDiagnostics}</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </main>
  );
}

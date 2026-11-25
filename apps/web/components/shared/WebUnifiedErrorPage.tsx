"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertCircle,
  FileQuestion,
  ShieldAlert,
  RefreshCw,
  Home,
  Flag,
  CheckCircle2,
  Loader2,
  Briefcase,
  Sparkles,
  Newspaper,
  Mail,
  Info,
} from "lucide-react";
import { formatMessage } from "@platform/locales";
import { useTranslation } from "../../hooks/useTranslation";
import { useSnackbar } from "../ui/snackbar";

export interface WebUnifiedErrorPageProps {
  statusCode?: number | string;
  title?: string;
  description?: string;
  message?: string;
  error?: (Error & { digest?: string; status?: number; statusCode?: number }) | null;
  reset?: () => void;
  showQuickLinks?: boolean;
}

function makeIncidentId(code: string): string {
  const day = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rand =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID().slice(0, 6).toUpperCase()
      : Math.random().toString(36).slice(2, 8).toUpperCase();
  return `ERR-${day}-${code}-${rand}`;
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
  const { locale, isRTL, translations, site } = useTranslation();
  const snackbar = useSnackbar();
  const copy = translations.errorPages;
  const collectionSlug = site?.collection?.slug || "work";
  const articlesSlug = site?.articles?.slug || "news";

  const resolvedCode = String(
    statusCode ?? (error?.status || error?.statusCode || (error ? 500 : 404)),
  );
  const reactId = React.useId().replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 6) || "WEB";
  const [incidentId, setIncidentId] = React.useState(`ERR-${resolvedCode}-${reactId}`);
  const [reporting, setReporting] = React.useState(false);
  const [reportedTicket, setReportedTicket] = React.useState<string | null>(null);
  const [reportError, setReportError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setIncidentId(makeIncidentId(resolvedCode));
  }, [resolvedCode]);

  React.useEffect(() => {
    if (error) {
      console.error(`[WebUnifiedErrorPage HTTP ${resolvedCode}]:`, error);
    }
  }, [error, resolvedCode]);

  const titleKey = `code${resolvedCode}Title` as keyof typeof copy;
  const descKey = `code${resolvedCode}Desc` as keyof typeof copy;

  const resolvedTitle = customTitle || (copy[titleKey] as string) || copy.genericTitle;
  const resolvedDesc = customDescription || (copy[descKey] as string) || copy.genericDescription;
  const resolvedBadge = copy.codePrefix.replace("{code}", resolvedCode);

  const is404 = resolvedCode === "404" || showQuickLinks;
  const isAuth = resolvedCode === "401" || resolvedCode === "403";

  const quickLinks = [
    { href: `/${locale}`, label: copy.homeLink, icon: Home },
    { href: `/${locale}/${collectionSlug}`, label: copy.portfolioLink, icon: Briefcase },
    { href: `/${locale}/#services`, label: copy.servicesLink, icon: Sparkles },
    { href: `/${locale}/${articlesSlug}`, label: copy.storeLink, icon: Newspaper },
    { href: `/${locale}/about`, label: copy.aboutLink, icon: Info },
    { href: `/${locale}/contact`, label: copy.contactLink, icon: Mail },
  ];

  const handleReport = async () => {
    if (reporting || reportedTicket) return;
    setReporting(true);
    setReportError(null);
    try {
      const numericStatus = Number(resolvedCode);
      const res = await fetch("/api/error-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          errorCode: resolvedCode,
          incidentId,
          statusCode: Number.isFinite(numericStatus) ? numericStatus : 500,
          route: typeof window !== "undefined" ? window.location.pathname : "/",
          url: typeof window !== "undefined" ? window.location.href : "/",
          timestamp: new Date().toISOString(),
          message: customMessage || error?.message || "",
          stack: error?.stack || "",
          digest: error?.digest || "",
          clientMeta:
            typeof window !== "undefined"
              ? {
                  viewport: `${window.innerWidth}x${window.innerHeight}`,
                  language: navigator.language || locale,
                  platform: navigator.platform || "",
                  referrer: document.referrer || "",
                }
              : undefined,
        }),
      });

      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        ticketNumber?: number | null;
        incidentId?: string;
      };
      if (!res.ok || !data.ok) {
        throw new Error(copy.reportFailed);
      }

      const refLabel = data.ticketNumber ? `#${data.ticketNumber}` : data.incidentId || incidentId;
      setReportedTicket(refLabel);
      snackbar.show({
        message: formatMessage(copy.reportSuccess, { ticket: refLabel }),
        variant: "success",
      });
    } catch {
      setReportError(copy.reportFailed);
      snackbar.show({
        message: copy.reportFailed,
        variant: "error",
      });
    } finally {
      setReporting(false);
    }
  };

  const iconContainerClass = is404
    ? "bg-m3-secondary-container text-m3-on-secondary-container"
    : isAuth
      ? "bg-m3-tertiary-container text-m3-on-tertiary-container"
      : "bg-m3-error-container text-m3-on-error-container";

  const badgeClass = is404
    ? "bg-m3-secondary-container text-m3-on-secondary-container"
    : isAuth
      ? "bg-m3-tertiary-container text-m3-on-tertiary-container"
      : "bg-m3-error-container text-m3-on-error-container";

  return (
    <main
      role="alert"
      className="min-h-[82vh] w-full flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-m3-surface text-m3-on-surface"
      dir={isRTL ? "rtl" : "ltr"}
    >
      <div className="max-w-xl w-full text-center space-y-6 bg-m3-surface-container-low border border-m3-outline-variant p-6 sm:p-10 rounded-[var(--md-sys-shape-corner-extra-large,28px)] shadow-m3-2">
        <div
          className={`w-16 h-16 rounded-[var(--md-sys-shape-corner-large,16px)] flex items-center justify-center mx-auto ${iconContainerClass}`}
        >
          {is404 ? (
            <FileQuestion aria-hidden="true" className="w-8 h-8" />
          ) : isAuth ? (
            <ShieldAlert aria-hidden="true" className="w-8 h-8" />
          ) : (
            <AlertCircle aria-hidden="true" className="w-8 h-8" />
          )}
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span
              className={`inline-flex items-center px-3.5 py-1 rounded-full font-mono text-xs font-semibold tracking-wide ${badgeClass}`}
            >
              {resolvedBadge}
            </span>
            <span
              data-testid="error-incident-id"
              dir="ltr"
              className="inline-flex items-center px-3.5 py-1 rounded-full bg-m3-surface-container border border-m3-outline-variant font-mono text-xs font-semibold text-m3-on-surface-variant"
            >
              {incidentId}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-m3-on-surface font-display tracking-tight">
            {resolvedTitle}
          </h1>

          <p className="text-sm sm:text-base text-m3-on-surface-variant leading-relaxed max-w-md mx-auto">
            {resolvedDesc}
          </p>
        </div>

        {is404 && (
          <div className="pt-1 text-start">
            <p className="text-xs font-semibold uppercase tracking-wider text-m3-on-surface-variant mb-3 text-center">
              {copy.quickLinksHeading}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {quickLinks.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="min-h-11 flex items-center justify-center gap-2 px-3 py-2.5 rounded-[var(--md-sys-shape-corner-medium,12px)] border border-m3-outline-variant bg-m3-surface-container hover:bg-m3-surface-container-high hover:border-m3-primary text-xs font-semibold text-m3-on-surface transition-colors"
                  >
                    <Icon aria-hidden="true" className="h-3.5 w-3.5 text-m3-primary shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {reportedTicket && (
          <div
            role="status"
            className="flex items-center justify-center gap-2 rounded-[var(--md-sys-shape-corner-medium,12px)] bg-m3-primary-container text-m3-on-primary-container px-4 py-3 text-xs font-semibold"
          >
            <CheckCircle2 aria-hidden="true" className="w-4 h-4 shrink-0" />
            <span>{formatMessage(copy.reportSuccess, { ticket: reportedTicket })}</span>
          </div>
        )}

        {reportError && (
          <div
            role="status"
            className="rounded-[var(--md-sys-shape-corner-medium,12px)] bg-m3-error-container text-m3-on-error-container px-4 py-3 text-xs font-semibold"
          >
            {reportError}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          {reset && (
            <button
              type="button"
              onClick={reset}
              className="min-h-11 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-m3-primary hover:brightness-95 text-m3-on-primary text-xs font-semibold transition-colors shadow-m3-1 cursor-pointer"
            >
              <RefreshCw aria-hidden="true" className="w-3.5 h-3.5" />
              <span>{copy.retry}</span>
            </button>
          )}

          <button
            type="button"
            disabled={reporting || Boolean(reportedTicket)}
            onClick={() => void handleReport()}
            className="min-h-11 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-m3-secondary-container hover:brightness-95 text-m3-on-secondary-container text-xs font-semibold transition-colors disabled:opacity-60 cursor-pointer"
          >
            {reporting ? (
              <>
                <Loader2 aria-hidden="true" className="w-3.5 h-3.5 animate-spin" />
                <span>{copy.reportingButton}</span>
              </>
            ) : reportedTicket ? (
              <>
                <CheckCircle2 aria-hidden="true" className="w-3.5 h-3.5" />
                <span>{copy.reportedButton}</span>
              </>
            ) : (
              <>
                <Flag aria-hidden="true" className="w-3.5 h-3.5" />
                <span>{copy.reportButton}</span>
              </>
            )}
          </button>

          <Link
            href={`/${locale}`}
            className="min-h-11 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full border border-m3-outline text-m3-primary hover:bg-m3-primary/[0.08] text-xs font-semibold transition-colors cursor-pointer"
          >
            <Home aria-hidden="true" className="w-3.5 h-3.5" />
            <span>{copy.returnHome}</span>
          </Link>
        </div>
      </div>
    </main>
  );
}

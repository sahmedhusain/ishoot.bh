"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Box,
  Calendar,
  CheckCircle2,
  CreditCard,
  FileQuestion,
  FileText,
  Home,
  Loader2,
  Receipt,
  RefreshCw,
  Send,
  ShieldAlert,
  Users,
} from "lucide-react";
import { formatMessage } from "@platform/locales";
import { ROUTES } from "@platform/database/constants/routes";
import { useAdminLocale } from "../../hooks/useAdminLocale";

export interface AdminErrorPageProps {
  statusCode?: number | string;
  title?: string;
  description?: string;
  message?: string;
  error?: (Error & { digest?: string; status?: number; statusCode?: number }) | null;
  reset?: () => void;
  showQuickLinks?: boolean;
}

function buildIncidentId(resolvedCode: string): string {
  const day = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const suffix =
    typeof globalThis.crypto?.randomUUID === "function"
      ? globalThis.crypto.randomUUID().replace(/-/g, "").slice(0, 6).toUpperCase()
      : Math.random().toString(36).slice(2, 8).toUpperCase().padEnd(6, "0");
  return `INC-${day}-${resolvedCode}-${suffix}`;
}

export function AdminErrorPage({
  statusCode,
  title: customTitle,
  description: customDescription,
  message: customMessage,
  error,
  reset,
  showQuickLinks,
}: AdminErrorPageProps) {
  const { t, isRTL } = useAdminLocale();
  const copy = t.errorPages;

  const resolvedCode = String(
    statusCode ?? error?.statusCode ?? error?.status ?? 500,
  );
  const numericCode = Number.parseInt(resolvedCode, 10) || 500;
  const errorCode = `HTTP-${resolvedCode}`;

  const [incidentId, setIncidentId] = React.useState(`INC-${resolvedCode}`);
  const [reportState, setReportState] = React.useState<
    | { status: "idle" }
    | { status: "submitting" }
    | { status: "reported"; ticketNumber: number; ticketId: string }
    | { status: "failed" }
  >({ status: "idle" });

  React.useEffect(() => {
    setIncidentId(buildIncidentId(resolvedCode));
  }, [resolvedCode]);

  React.useEffect(() => {
    if (error && numericCode >= 500) {
      console.error(`[AdminErrorPage ${errorCode} ${incidentId}]:`, error);
    }
  }, [error, errorCode, incidentId, numericCode]);

  const is404 = numericCode === 404;
  const is403 = numericCode === 403 || numericCode === 401;

  let displayTitle = customTitle;
  let displayDescription = customDescription;

  if (!displayTitle || !displayDescription) {
    switch (numericCode) {
      case 400:
        displayTitle ||= copy.code400Title;
        displayDescription ||= copy.code400Desc;
        break;
      case 401:
        displayTitle ||= copy.code401Title;
        displayDescription ||= copy.code401Desc;
        break;
      case 403:
        displayTitle ||= copy.code403Title;
        displayDescription ||= copy.code403Desc;
        break;
      case 404:
        displayTitle ||= copy.code404Title;
        displayDescription ||= copy.code404Desc;
        break;
      case 502:
        displayTitle ||= copy.code502Title;
        displayDescription ||= copy.code502Desc;
        break;
      case 503:
        displayTitle ||= copy.code503Title;
        displayDescription ||= copy.code503Desc;
        break;
      default:
        displayTitle ||= copy.code500Title;
        displayDescription ||= copy.code500Desc;
        break;
    }
  }

  const handleReport = async () => {
    if (reportState.status === "submitting" || reportState.status === "reported") {
      return;
    }
    setReportState({ status: "submitting" });
    try {
      const route =
        typeof window !== "undefined" ? window.location.pathname || "/dashboard" : "/dashboard";
      const url = typeof window !== "undefined" ? window.location.href : route;
      const response = await fetch("/api/error-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          errorCode,
          incidentId,
          statusCode: numericCode,
          route,
          url,
          timestamp: new Date().toISOString(),
          message: error?.message || customMessage || displayTitle,
          stack: error?.stack,
          digest: error?.digest,
          clientMeta:
            typeof window !== "undefined"
              ? {
                  viewport: `${window.innerWidth}x${window.innerHeight}`,
                  language: navigator.language,
                  platform: navigator.platform,
                  referrer: document.referrer || undefined,
                }
              : undefined,
        }),
      });
      if (!response.ok) {
        setReportState({ status: "failed" });
        return;
      }
      const data = (await response.json()) as {
        ok?: boolean;
        ticketNumber?: number;
        ticketId?: string;
      };
      if (!data.ok || typeof data.ticketNumber !== "number") {
        setReportState({ status: "failed" });
        return;
      }
      setReportState({
        status: "reported",
        ticketNumber: data.ticketNumber,
        ticketId: data.ticketId ?? "",
      });
    } catch {
      setReportState({ status: "failed" });
    }
  };

  const quickLinks = [
    { href: ROUTES.invoices.list, label: copy.invoices, icon: FileText },
    { href: ROUTES.quotations.list, label: copy.quotations, icon: Receipt },
    { href: ROUTES.moms.list, label: copy.moms, icon: Calendar },
    { href: ROUTES.payments.list, label: copy.payments, icon: CreditCard },
    { href: ROUTES.assets.list(), label: copy.assets, icon: Box },
    { href: ROUTES.hr.employees, label: copy.directory, icon: Users },
  ];

  const iconContainerClass = is404
    ? "bg-secondary-container text-on-secondary-container"
    : is403
      ? "bg-tertiary-container text-on-tertiary-container"
      : "bg-m3-error-container text-m3-on-error-container";

  const codePillClass = is404
    ? "bg-secondary-container text-on-secondary-container"
    : is403
      ? "bg-tertiary-container text-on-tertiary-container"
      : "bg-m3-error-container text-m3-on-error-container";

  const Icon = is404 ? FileQuestion : is403 ? ShieldAlert : AlertTriangle;

  return (
    <div
      dir={isRTL ? "rtl" : "ltr"}
      className="min-h-[70vh] flex items-center justify-center p-4 sm:p-8"
    >
      <section
        aria-labelledby="admin-error-title"
        className="w-full max-w-xl rounded-3xl border border-outline-variant bg-surface-container-low text-on-surface shadow-m3-2 overflow-hidden"
      >
        <div className="p-6 sm:p-8 space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div
              className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${iconContainerClass}`}
            >
              <Icon className="h-7 w-7" aria-hidden="true" />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span
                data-testid="error-code-badge"
                className={`inline-flex items-center rounded-full px-3 py-1 font-mono text-xs font-semibold tracking-wide ${codePillClass}`}
              >
                {formatMessage(copy.codePrefix, { code: resolvedCode })}
              </span>
              <span
                data-testid="error-incident-id"
                dir="ltr"
                className="inline-flex items-center gap-1.5 rounded-full border border-outline-variant bg-surface-container-high px-3 py-1 font-mono text-xs font-medium text-on-surface-variant"
              >
                <span>{copy.incidentLabel}:</span>
                <strong className="text-on-surface">{incidentId}</strong>
              </span>
            </div>
          </div>

          <div className="space-y-2.5">
            <h1
              id="admin-error-title"
              className="text-2xl sm:text-3xl font-bold tracking-tight text-on-surface font-display"
            >
              {displayTitle}
            </h1>
            <p className="text-sm sm:text-base leading-relaxed text-on-surface-variant">
              {displayDescription}
            </p>
            {customMessage && (
              <p className="rounded-2xl border border-outline-variant bg-surface-container px-4 py-3 text-sm text-on-surface">
                {customMessage}
              </p>
            )}
            <p className="text-xs text-on-surface-variant">{copy.supportHint}</p>
          </div>

          {reportState.status === "reported" && (
            <div
              role="status"
              data-testid="error-report-success"
              className="flex items-start gap-3 rounded-2xl border border-outline-variant bg-primary-container px-4 py-3.5 text-on-primary-container"
            >
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
              <div className="space-y-0.5 text-sm">
                <p className="font-semibold">{copy.reportedTitle}</p>
                <p className="text-xs opacity-90">
                  {formatMessage(copy.reportedWithTicket, {
                    number: String(reportState.ticketNumber),
                    incidentId,
                  })}
                </p>
              </div>
            </div>
          )}

          {reportState.status === "failed" && (
            <div
              role="alert"
              data-testid="error-report-error"
              className="flex items-start gap-3 rounded-2xl border border-outline-variant bg-m3-error-container px-4 py-3.5 text-m3-on-error-container text-sm"
            >
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
              <p>{copy.reportFailed}</p>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-1">
            {reset && (
              <button
                type="button"
                onClick={reset}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-m3-on-primary shadow-m3-1 transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                <span>{copy.retry}</span>
              </button>
            )}

            <Link
              href={ROUTES.home}
              className={`inline-flex h-10 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                reset
                  ? "bg-secondary-container text-on-secondary-container hover:opacity-90"
                  : "bg-primary text-m3-on-primary shadow-m3-1 hover:opacity-90"
              }`}
            >
              <Home className="h-4 w-4" aria-hidden="true" />
              <span>{copy.returnHome}</span>
            </Link>

            <button
              type="button"
              data-testid="error-report-button"
              onClick={() => void handleReport()}
              disabled={reportState.status === "submitting" || reportState.status === "reported"}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-outline bg-surface-container px-5 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container-high focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-50"
            >
              {reportState.status === "submitting" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  <span>{copy.reporting}</span>
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" aria-hidden="true" />
                  <span>{copy.reportButton}</span>
                </>
              )}
            </button>
          </div>

          {(showQuickLinks || is404) && (
            <div className="border-t border-outline-variant pt-5 space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                {copy.quickLinksHeading}
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {quickLinks.map((item) => {
                  const ItemIcon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="flex items-center gap-2.5 rounded-2xl border border-outline-variant bg-surface-container px-3.5 py-2.5 text-xs font-medium text-on-surface transition-colors hover:bg-secondary-container hover:text-on-secondary-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <ItemIcon className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

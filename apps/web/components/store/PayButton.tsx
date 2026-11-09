"use client";

import * as React from "react";
import { Lock } from "lucide-react";
import { useTranslation } from "../../hooks/useTranslation";
import { primaryButton } from "../account/ui";

interface Widget {
  scriptUrl: string;
  integrity?: string;
  brands: string;
}

export function PayButton({ token, locale, autoStart }: { token: string; locale: string; autoStart: boolean }) {
  const { t } = useTranslation();
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const [hosted, setHosted] = React.useState<{ widget: Widget; returnUrl: string; testMode: boolean } | null>(null);
  const started = React.useRef(false);
  const known = (path: string) => (t(path) === path ? t("account.errors.generic") : t(path));

  const start = React.useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/store/pay", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, locale }) });
      const data = (await response.json().catch(() => ({ error: "generic" }))) as { redirectUrl?: string; widget?: Widget; returnUrl?: string; testMode?: boolean; error?: string };
      if (!response.ok) throw new Error(data.error || "generic");
      if (data.redirectUrl) {
        window.location.assign(data.redirectUrl);
        return;
      }
      if (data.widget && data.returnUrl) setHosted({ widget: data.widget, returnUrl: data.returnUrl, testMode: !!data.testMode });
      setBusy(false);
    } catch (err) {
      setError(known(`account.errors.${err instanceof Error ? err.message : "generic"}`));
      setBusy(false);
    }
  }, [token, locale]);

  React.useEffect(() => {
    if (autoStart && !started.current) {
      started.current = true;
      void start();
    }
  }, [autoStart, start]);

  React.useEffect(() => {
    if (!hosted) return;
    const script = document.createElement("script");
    script.src = hosted.widget.scriptUrl;
    script.async = true;
    script.crossOrigin = "anonymous";
    if (hosted.widget.integrity) script.integrity = hosted.widget.integrity;
    document.body.appendChild(script);
    return () => script.remove();
  }, [hosted]);

  if (hosted)
    return (
      <div className="space-y-3 rounded-2xl border border-white/10 bg-m3-surface-container-low p-4 text-ink" data-testid="pay-widget">
        {hosted.testMode && <p className="text-xs font-semibold text-amber-700">{t("store.testMode")}</p>}
        <form action={hosted.returnUrl} className="paymentWidgets" data-brands={hosted.widget.brands} />
      </div>
    );

  return (
    <div className="space-y-3">
      <button type="button" onClick={() => void start()} disabled={busy} className={`${primaryButton} w-full gap-2`} data-testid="pay-now">
        <Lock className="w-4 h-4" aria-hidden="true" />
        {busy ? t("store.redirecting") : t("store.payNow")}
      </button>
      <p className="text-xs text-ink-muted">{t("store.payCardHint")}</p>
      {error && <p role="alert" className="text-sm text-m3-error">{error}</p>}
    </div>
  );
}

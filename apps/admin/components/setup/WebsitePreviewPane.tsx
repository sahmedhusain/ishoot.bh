"use client";

import * as React from "react";
import { ExternalLink, Monitor, Smartphone } from "lucide-react";
import { Skeleton } from "@platform/ui";
import type { BrandTheme } from "@platform/database/constants/theme";
import { setupPreviewAction } from "../../app/actions/setup";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { errorMessage } from "../../lib/error-text";

const SIZES = { desktop: { width: 1280, height: 860 }, phone: { width: 390, height: 780 } } as const;
type Size = keyof typeof SIZES;

/**
 * The real website beside the wizard's Brand and Website steps. The theme being edited is sent to the page as
 * it changes (nothing saved); `revision` goes up after the wizard saves the draft website, which reloads it.
 */
export function WebsitePreviewPane({ theme, revision }: { theme: BrandTheme; revision: number }) {
  const { t, locale } = useAdminLocale();
  const copy = t.setupWizard.preview;
  const [link, setLink] = React.useState("");
  const [error, setError] = React.useState("");
  const [size, setSize] = React.useState<Size>("desktop");
  const [ready, setReady] = React.useState(false);
  const [box, setBox] = React.useState(0);
  const frame = React.useRef<HTMLIFrameElement>(null);
  const holder = React.useRef<HTMLDivElement>(null);
  const origin = React.useMemo(() => (link ? new URL(link).origin : ""), [link]);

  React.useEffect(() => {
    let live = true;
    setupPreviewAction(locale).then(
      (url) => live && setLink(url),
      (err) => live && setError(errorMessage(err, t)),
    );
    return () => {
      live = false;
    };
    // A new link only when the interface language changes; t follows the same switch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale]);

  React.useEffect(() => {
    const element = holder.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setBox(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const send = React.useCallback((message: unknown) => {
    if (origin) frame.current?.contentWindow?.postMessage(message, origin);
  }, [origin]);

  React.useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin === origin && event.data?.type === "platform:ready") {
        setReady(true);
        send({ type: "platform:theme", theme });
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [origin, send, theme]);

  React.useEffect(() => {
    if (ready) send({ type: "platform:theme", theme });
  }, [ready, send, theme]);

  const first = React.useRef(true);
  React.useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    send({ type: "platform:refresh" });
  }, [revision, send]);

  const { width, height } = SIZES[size];
  const scale = box ? Math.min(1, box / width) : 0;

  return (
    <aside className="space-y-3 lg:sticky lg:top-6" aria-label={copy.title} data-testid="website-preview">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">{copy.title}</h3>
        <div className="flex items-center gap-1">
          {(["desktop", "phone"] as const).map((option) => {
            const Icon = option === "desktop" ? Monitor : Smartphone;
            return (
              <button key={option} type="button" aria-pressed={size === option} aria-label={copy[option]} title={copy[option]} onClick={() => setSize(option)} className={`rounded-lg p-1.5 transition-colors ${size === option ? "bg-accent/15 text-accent" : "text-slate-500 hover:bg-ink/5"}`}>
                <Icon className="h-4 w-4" />
              </button>
            );
          })}
          {link ? (
            <a href={link} target="_blank" rel="noopener noreferrer" aria-label={copy.open} title={copy.open} className="rounded-lg p-1.5 text-slate-500 hover:bg-ink/5">
              <ExternalLink className="h-4 w-4" />
            </a>
          ) : null}
        </div>
      </div>
      <div ref={holder} className="flex justify-center">
        <div className="overflow-hidden rounded-xl border border-ink/15 bg-ink/5 shadow-sm transition-[width,height] duration-300 motion-reduce:transition-none" style={{ width: width * scale, height: height * scale }}>
          {error ? (
            <p role="alert" className="p-4 text-xs text-rose-600">{error}</p>
          ) : link && scale ? (
            <iframe ref={frame} src={link} title={copy.title} className="origin-top-left border-0 bg-white rtl:origin-top-right" style={{ width, height, transform: `scale(${scale})` }} />
          ) : (
            <div aria-busy="true" className="h-full p-4 space-y-3"><Skeleton className="h-1/3 w-full" /><Skeleton className="h-4 w-2/3" /><Skeleton className="h-4 w-1/2" /><div className="grid grid-cols-3 gap-3"><Skeleton className="h-20" /><Skeleton className="h-20" /><Skeleton className="h-20" /></div></div>
          )}
        </div>
      </div>
      <p className="text-xs text-slate-500 dark:text-ink-muted">{copy.hint}</p>
    </aside>
  );
}

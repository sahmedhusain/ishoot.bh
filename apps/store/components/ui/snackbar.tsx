"use client";

import * as React from "react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";

export type SnackbarTone = "default" | "success" | "error" | "info";

export interface SnackbarOptions {
  message: string;
  tone?: SnackbarTone;
  actionLabel?: string;
  onAction?: () => void;
  durationMs?: number;
}

interface SnackbarItem extends SnackbarOptions {
  id: string;
}

const SNACKBAR_EVENT = "store-m3-snackbar";

export function showSnackbar(options: SnackbarOptions) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<SnackbarOptions>(SNACKBAR_EVENT, { detail: options }));
}

const SnackbarContext = React.createContext<{
  show: (options: SnackbarOptions) => void;
  dismiss: (id: string) => void;
}>({
  show: showSnackbar,
  dismiss: () => {},
});

export function useSnackbar() {
  return React.useContext(SnackbarContext);
}

export function SnackbarProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<SnackbarItem[]>([]);
  const timers = React.useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = React.useCallback((id: string) => {
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const scheduleDismiss = React.useCallback(
    (id: string, durationMs: number) => {
      const existing = timers.current.get(id);
      if (existing) clearTimeout(existing);
      const timer = setTimeout(() => dismiss(id), durationMs);
      timers.current.set(id, timer);
    },
    [dismiss],
  );

  const show = React.useCallback(
    (options: SnackbarOptions) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const durationMs = options.durationMs ?? (options.tone === "error" ? 6500 : 4200);
      setItems((prev) => [...prev.slice(-2), { ...options, id, durationMs }]);
      scheduleDismiss(id, durationMs);
    },
    [scheduleDismiss],
  );

  React.useEffect(() => {
    const onEvent = (event: Event) => {
      const detail = (event as CustomEvent<SnackbarOptions>).detail;
      if (detail?.message) show(detail);
    };
    window.addEventListener(SNACKBAR_EVENT, onEvent);
    return () => {
      window.removeEventListener(SNACKBAR_EVENT, onEvent);
      for (const timer of timers.current.values()) clearTimeout(timer);
      timers.current.clear();
    };
  }, [show]);

  return (
    <SnackbarContext.Provider value={{ show, dismiss }}>
      {children}
      {items.length > 0 && (
        <div
          aria-label="Notifications"
          className="fixed bottom-20 md:bottom-6 inset-x-4 sm:inset-x-auto sm:start-6 z-[110] flex flex-col gap-2.5 max-w-md w-auto pointer-events-none"
        >
          {items.map((item) => {
            const isError = item.tone === "error";
            const Icon =
              item.tone === "success"
                ? CheckCircle2
                : item.tone === "error"
                  ? AlertCircle
                  : item.tone === "info"
                    ? Info
                    : null;

            return (
              <div
                key={item.id}
                role={isError ? "alert" : "status"}
                aria-live={isError ? "assertive" : "polite"}
                data-testid="store-snackbar"
                onMouseEnter={() => {
                  const timer = timers.current.get(item.id);
                  if (timer) clearTimeout(timer);
                }}
                onMouseLeave={() => scheduleDismiss(item.id, item.durationMs ?? 4200)}
                className={`pointer-events-auto m3-snackbar flex items-center gap-3 min-h-12 px-4 py-3 text-sm border ${
                  isError
                    ? "bg-m3-error-container text-m3-on-error-container border-m3-error/30"
                    : "bg-m3-inverse-surface text-m3-inverse-on-surface border-m3-outline-variant/20"
                }`}
              >
                {Icon && (
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isError
                        ? "text-m3-error"
                        : item.tone === "success"
                          ? "text-m3-inverse-primary"
                          : "text-m3-inverse-primary"
                    }`}
                    aria-hidden="true"
                  />
                )}
                <p className="flex-1 min-w-0 font-medium leading-snug">{item.message}</p>
                {item.actionLabel && item.onAction && (
                  <button
                    type="button"
                    onClick={() => {
                      item.onAction?.();
                      dismiss(item.id);
                    }}
                    className={`shrink-0 px-2.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-opacity hover:opacity-85 cursor-pointer ${
                      isError ? "text-m3-error" : "text-m3-inverse-primary"
                    }`}
                  >
                    {item.actionLabel}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => dismiss(item.id)}
                  aria-label="Dismiss notification"
                  className="shrink-0 w-8 h-8 rounded-full grid place-items-center opacity-75 hover:opacity-100 transition-opacity cursor-pointer"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </SnackbarContext.Provider>
  );
}

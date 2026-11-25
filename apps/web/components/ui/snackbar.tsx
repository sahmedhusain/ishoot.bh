"use client";

import * as React from "react";
import { AlertCircle, CheckCircle2, Info, TriangleAlert, X } from "lucide-react";
import { cn } from "./utils";

export type SnackbarVariant = "default" | "success" | "error" | "warning" | "info";

export interface SnackbarItem {
  id: string;
  message: string;
  variant?: SnackbarVariant;
  action?: {
    label: string;
    onClick: () => void;
  };
  durationMs?: number;
}

interface SnackbarContextValue {
  show: (options: Omit<SnackbarItem, "id">) => string;
  dismiss: (id: string) => void;
  clear: () => void;
}

const SnackbarContext = React.createContext<SnackbarContextValue | null>(null);

const EVENT_NAME = "m3-web-snackbar-show";

export function dispatchSnackbar(options: Omit<SnackbarItem, "id">) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: options }));
  }
}

export function useSnackbar(): SnackbarContextValue {
  const ctx = React.useContext(SnackbarContext);
  return React.useMemo(
    () =>
      ctx ?? {
        show: (options) => {
          dispatchSnackbar(options);
          return "external";
        },
        dismiss: () => {},
        clear: () => {},
      },
    [ctx],
  );
}

const VARIANT_ICON: Record<SnackbarVariant, typeof Info> = {
  default: Info,
  info: Info,
  success: CheckCircle2,
  warning: TriangleAlert,
  error: AlertCircle,
};

const VARIANT_STYLE: Record<SnackbarVariant, string> = {
  default:
    "bg-m3-inverse-surface text-m3-inverse-on-surface border-m3-outline-variant/20",
  info:
    "bg-m3-inverse-surface text-m3-inverse-on-surface border-m3-outline-variant/20",
  success:
    "bg-m3-inverse-surface text-m3-inverse-on-surface border-m3-inverse-primary/40",
  warning:
    "bg-m3-tertiary-container text-m3-on-tertiary-container border-m3-tertiary/30",
  error:
    "bg-m3-error-container text-m3-on-error-container border-m3-error/35",
};

export function SnackbarProvider({
  children,
  closeLabel = "Dismiss",
}: {
  children: React.ReactNode;
  closeLabel?: string;
}) {
  const [items, setItems] = React.useState<SnackbarItem[]>([]);
  const timersRef = React.useRef<Map<string, number>>(new Map());

  const dismiss = React.useCallback((id: string) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      window.clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const show = React.useCallback(
    (options: Omit<SnackbarItem, "id">) => {
      const id =
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const duration = options.durationMs ?? (options.variant === "error" ? 6500 : 4200);
      setItems((prev) => [...prev.slice(-2), { ...options, id }]);
      if (duration > 0 && typeof window !== "undefined") {
        const timer = window.setTimeout(() => dismiss(id), duration);
        timersRef.current.set(id, timer);
      }
      return id;
    },
    [dismiss],
  );

  const clear = React.useCallback(() => {
    for (const timer of timersRef.current.values()) {
      window.clearTimeout(timer);
    }
    timersRef.current.clear();
    setItems([]);
  }, []);

  React.useEffect(() => {
    const onExternal = (event: Event) => {
      const detail = (event as CustomEvent<Omit<SnackbarItem, "id">>).detail;
      if (detail?.message) show(detail);
    };
    window.addEventListener(EVENT_NAME, onExternal);
    return () => {
      window.removeEventListener(EVENT_NAME, onExternal);
      clear();
    };
  }, [show, clear]);

  return (
    <SnackbarContext.Provider value={{ show, dismiss, clear }}>
      {children}
      {items.length > 0 && (
        <div
          data-ui="snackbar-region"
          aria-live="polite"
          aria-atomic="false"
          className="fixed bottom-4 inset-x-4 sm:inset-x-auto sm:start-6 z-[95] flex flex-col gap-2.5 max-w-md pointer-events-none"
        >
          {items.map((item) => {
            const variant = item.variant ?? "default";
            const Icon = VARIANT_ICON[variant];
            const isError = variant === "error";
            const isWarning = variant === "warning";
            return (
              <div
                key={item.id}
                role={isError ? "alert" : "status"}
                data-ui="snackbar"
                data-variant={variant}
                className={cn(
                  "pointer-events-auto flex items-center gap-3 min-h-12 px-4 py-3 rounded-[var(--md-sys-shape-corner-small,8px)] border shadow-m3-3 text-sm font-medium animate-in fade-in slide-in-from-bottom-2 duration-200",
                  VARIANT_STYLE[variant],
                )}
              >
                <Icon
                  aria-hidden="true"
                  className={cn(
                    "w-4 h-4 shrink-0",
                    isError || isWarning ? "text-current" : "text-m3-inverse-primary",
                  )}
                />
                <span className="flex-1 min-w-0 leading-snug">{item.message}</span>
                {item.action && (
                  <button
                    type="button"
                    onClick={() => {
                      item.action?.onClick();
                      dismiss(item.id);
                    }}
                    className={cn(
                      "min-h-9 px-2.5 rounded-[var(--md-sys-shape-corner-extra-small,4px)] text-xs font-semibold shrink-0 transition-colors cursor-pointer",
                      isError || isWarning
                        ? "hover:bg-black/10 text-current"
                        : "text-m3-inverse-primary hover:bg-white/10",
                    )}
                  >
                    {item.action.label}
                  </button>
                )}
                <button
                  type="button"
                  aria-label={closeLabel}
                  onClick={() => dismiss(item.id)}
                  className="min-w-9 min-h-9 -me-1.5 rounded-full flex items-center justify-center opacity-80 hover:opacity-100 transition-opacity cursor-pointer shrink-0"
                >
                  <X aria-hidden="true" className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </SnackbarContext.Provider>
  );
}

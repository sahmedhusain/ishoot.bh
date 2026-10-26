"use client";

import * as React from "react";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { ConfirmDialog } from "@platform/ui";
import { useAdminLocale } from "./useAdminLocale";

type Guard = () => boolean;
interface NavigationGuard {
  register: (guard: Guard) => () => void;
  requestNavigation: () => Promise<boolean>;
  navigateConfirmed: (href: string, replace?: boolean) => void;
}
const Context = React.createContext<NavigationGuard | null>(null);
const HISTORY_KEY = "__admin_unsaved_position";

export function UnsavedChangesProvider({ children }: { children: React.ReactNode }) {
  const router = React.useContext(AppRouterContext);
  if (!router) throw new Error();
  const { t } = useAdminLocale();
  const guards = React.useRef(new Set<Guard>());
  const resolve = React.useRef<((approved: boolean) => void) | null>(null);
  const replayingClick = React.useRef(false);
  const restoringHistory = React.useRef(false);
  const [open, setOpen] = React.useState(false);
  const hasChanges = React.useCallback(() => Array.from(guards.current).some(guard => guard()), []);
  const register = React.useCallback((guard: Guard) => {
    guards.current.add(guard);
    return () => { guards.current.delete(guard); };
  }, []);
  const ask = React.useCallback(() => {
    if (replayingClick.current || !hasChanges()) return Promise.resolve(true);
    if (resolve.current) return Promise.resolve(false);
    return new Promise<boolean>(done => { resolve.current = done; setOpen(true); });
  }, [hasChanges]);
  const requestNavigation = React.useCallback(() => restoringHistory.current ? Promise.resolve(false) : ask(), [ask]);
  const finish = (approved: boolean) => {
    const done = resolve.current;
    resolve.current = null;
    setOpen(false);
    done?.(approved);
  };
  const navigateConfirmed = React.useCallback((href: string, replace = false) => {
    if (replace) router.replace(href); else router.push(href);
  }, [router]);
  const guardedRouter = React.useMemo(() => {
    const navigate = (method: "push" | "replace", href: string, options?: Parameters<typeof router.push>[1]) => {
      const target = new URL(href, window.location.href);
      const sameDocument = target.origin === window.location.origin && target.pathname === window.location.pathname && target.search === window.location.search;
      if (replayingClick.current || sameDocument || !hasChanges()) { router[method](href, options); return; }
      void requestNavigation().then(approved => { if (approved) router[method](href, options); });
    };
    return { ...router, push: (href: string, options?: Parameters<typeof router.push>[1]) => navigate("push", href, options), replace: (href: string, options?: Parameters<typeof router.replace>[1]) => navigate("replace", href, options) };
  }, [router, hasChanges, requestNavigation]);
  const value = React.useMemo(() => ({ register, requestNavigation, navigateConfirmed }), [register, requestNavigation, navigateConfirmed]);

  React.useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (replayingClick.current || !hasChanges()) return;
      event.preventDefault();
      event.returnValue = "";
    };
    const click = (event: MouseEvent) => {
      if (replayingClick.current || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(anchor instanceof HTMLAnchorElement) || anchor.hasAttribute("download") || (anchor.target && anchor.target !== "_self")) return;
      const target = new URL(anchor.href, window.location.href);
      if (target.origin !== window.location.origin || (target.pathname === window.location.pathname && target.search === window.location.search) || !hasChanges()) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      void requestNavigation().then(approved => {
        if (!approved || !anchor.isConnected) return;
        replayingClick.current = true;
        try { anchor.click(); } finally { replayingClick.current = false; }
      });
    };
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", click, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", click, true);
    };
  }, [hasChanges, requestNavigation]);

  React.useEffect(() => {
    const session = crypto.randomUUID();
    let position = 0;
    let lastURL = window.location.href;
    let lastState = window.history.state;
    let active = true;
    let pending: { target: number; asking: boolean } | null = null;
    let allowed: number | null = null;
    const push = window.history.pushState;
    const replace = window.history.replaceState;
    const tagged = (data: unknown, index: number) => ({ ...(data && typeof data === "object" ? data : {}), [HISTORY_KEY]: { session, index } });
    const indexOf = (state: Record<string, { session?: string; index?: number }> | null) => {
      const marker = state?.[HISTORY_KEY];
      return marker?.session === session && Number.isSafeInteger(marker.index) ? marker.index! : null;
    };
    const pushState: History["pushState"] = function (this: History, data, unused, url) {
      if (!active) { push.call(this, data, unused, url); return; }
      const next = position + 1;
      push.call(this, tagged(data, next), unused, url);
      position = next;
      lastURL = window.location.href;
      lastState = window.history.state;
    };
    const replaceState: History["replaceState"] = function (this: History, data, unused, url) {
      replace.call(this, active ? tagged(data, position) : data, unused, url);
      if (active) { lastURL = window.location.href; lastState = window.history.state; }
    };
    window.history.pushState = pushState;
    window.history.replaceState = replaceState;
    replaceState.call(window.history, window.history.state, "");
    const pop = (event: PopStateEvent) => {
      let target = indexOf(event.state);
      const previous = new URL(lastURL);
      const current = new URL(window.location.href);
      const samePage = previous.pathname === current.pathname && previous.search === current.search;
      // Native fragment links create entries without calling pushState.
      if (!pending && samePage && lastURL !== current.href && (target === null || target === position)) {
        position++;
        replaceState.call(window.history, { ...lastState, ...(event.state && typeof event.state === "object" ? event.state : {}) }, "");
        return;
      }
      // Entries belonging to another document use the browser's beforeunload guard.
      if (target === null) return;
      if (allowed === target) { allowed = null; position = target; lastURL = current.href; lastState = event.state; return; }
      if (!pending && (!hasChanges() || target === position || samePage)) { position = target; lastURL = current.href; lastState = event.state; return; }
      event.stopImmediatePropagation();
      if (!pending) { pending = { target, asking: false }; restoringHistory.current = true; }
      if (target !== position) { window.history.go(position - target); return; }
      if (pending.asking) return;
      pending.asking = true;
      const destination = pending.target;
      void ask().then(approved => {
        pending = null;
        restoringHistory.current = false;
        if (approved) { allowed = destination; window.history.go(destination - position); }
      });
    };
    window.addEventListener("popstate", pop, true);
    return () => {
      active = false;
      restoringHistory.current = false;
      if (window.history.pushState === pushState) window.history.pushState = push;
      if (window.history.replaceState === replaceState) window.history.replaceState = replace;
      window.removeEventListener("popstate", pop, true);
      resolve.current?.(false);
      resolve.current = null;
    };
  }, [ask, hasChanges]);

  return (
    <Context.Provider value={value}>
      {/* shortcut: pinned Next router context; recheck its contract when upgrading Next. */}
      <AppRouterContext.Provider value={guardedRouter}>{children}</AppRouterContext.Provider>
      <ConfirmDialog isOpen={open} title={t.unsavedChanges.title} description={t.unsavedChanges.body} variant="warning" confirmLabel={t.unsavedChanges.discard} cancelLabel={t.unsavedChanges.stay} onConfirm={() => finish(true)} onClose={() => finish(false)} />
    </Context.Provider>
  );
}

export function useNavigationGuard() {
  const guard = React.useContext(Context);
  if (!guard) throw new Error();
  return guard;
}

export function useUnsavedChanges(value: unknown, enabled = true) {
  const { register } = useNavigationGuard();
  const current = React.useRef(value);
  const baseline = React.useRef<string | undefined>(undefined);
  const savedBeforeRender = React.useRef(false);
  const attached = React.useRef(false);
  current.current = value;
  savedBeforeRender.current = false;
  React.useEffect(() => {
    if (!enabled) return;
    attached.current = true;
    baseline.current = JSON.stringify(current.current);
    const unregister = register(() => !savedBeforeRender.current && JSON.stringify(current.current) !== baseline.current);
    return () => { attached.current = false; unregister(); };
  }, [register, enabled]);
  return React.useCallback((saved?: unknown) => {
    if (!attached.current) return false;
    baseline.current = JSON.stringify(saved === undefined ? current.current : saved);
    savedBeforeRender.current = saved !== undefined;
    return true;
  }, []);
}

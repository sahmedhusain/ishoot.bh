"use client";
import { useUiCopy } from "./copy/use-ui-copy";

import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "./utils";
import { X } from "lucide-react";
import { Button } from "./button";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  id?: string;
  children: React.ReactNode;
  className?: string;
  description?: React.ReactNode;
  footer?: React.ReactNode;
  busy?: boolean;
  kind?: "form" | "confirmation" | "command" | "picker";
  icon?: React.ReactNode;
  ariaLabel?: string;
  /** Accessible name of the close button (localise it in the calling app). */
  closeLabel?: string;
}

const ModalFooterContext = React.createContext<HTMLElement | null | undefined>(
  undefined,
);

/** A modular form can keep its own action state while placing controls in the dialog footer. */
export function ModalFooter({ children }: { children: React.ReactNode }) {
  const host = React.useContext(ModalFooterContext);
  if (host === undefined) return <>{children}</>;
  return host ? createPortal(children, host) : null;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Dialog behaviour for any overlay: focuses the first field, keeps Tab inside, closes on Escape,
 * restores focus to the opener and locks page scroll. Spread the returned props on the dialog card.
 */
const openDialogs: HTMLElement[] = [];
let bodyOverflow = "";

export function useDialog(isOpen: boolean, onClose: () => void) {
  const scope = React.useId();
  const ref = React.useRef<HTMLElement | null>(null);
  const onCloseRef = React.useRef(onClose);
  React.useLayoutEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  React.useLayoutEffect(() => {
    if (!isOpen) return;
    // Capture before editor animation frames or other passive effects can move focus.
    const opener = document.activeElement as HTMLElement | null;
    const card = ref.current;
    if (!card) return;
    if (!openDialogs.length) bodyOverflow = document.body.style.overflow;
    // Register first so an underlying dialog does not reclaim the new dialog's focus.
    openDialogs.push(card);
    document.body.style.overflow = "hidden";
    const first = Array.from(
      card.querySelectorAll<HTMLElement>(
        `[data-dialog-body] :is(${FOCUSABLE})`,
      ),
    ).find(
      (element) =>
        element.getClientRects().length &&
        element.tabIndex >= 0 &&
        !element.closest("[hidden], [inert]"),
    );
    (first ?? card)?.focus();

    const isTop = () => openDialogs.at(-1) === card;
    const onFocus = (event: FocusEvent) => {
      const owned =
        (event.target as HTMLElement)
          .closest?.("[data-dialog-scope-owner]")
          ?.getAttribute("data-dialog-scope-owner") === scope;
      if (isTop() && !card.contains(event.target as Node) && !owned)
        card.focus();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (!isTop()) return;
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab" || !card) return;
      const items = Array.from(
        card.querySelectorAll<HTMLElement>(FOCUSABLE),
      ).filter(
        (el) =>
          el.getClientRects().length > 0 &&
          el.tabIndex >= 0 &&
          !el.closest("[hidden], [inert]"),
      );
      if (!items.length) {
        event.preventDefault();
        card.focus();
        return;
      }
      const firstItem = items[0],
        lastItem = items[items.length - 1];
      if (
        event.shiftKey &&
        (document.activeElement === firstItem ||
          !items.includes(document.activeElement as HTMLElement))
      ) {
        event.preventDefault();
        lastItem.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === lastItem ||
          !items.includes(document.activeElement as HTMLElement))
      ) {
        event.preventDefault();
        firstItem.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("focusin", onFocus);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("focusin", onFocus);
      const index = openDialogs.indexOf(card);
      const wasTop = isTop();
      if (index !== -1) openDialogs.splice(index, 1);
      if (!openDialogs.length) document.body.style.overflow = bodyOverflow;
      if (wasTop) (opener?.isConnected ? opener : openDialogs.at(-1))?.focus();
    };
  }, [isOpen, scope]);

  return {
    ref: ref as React.RefObject<any>,
    "data-dialog-scope": scope,
    role: "dialog" as const,
    "aria-modal": true as const,
    tabIndex: -1,
  };
}

/** Accessible dialog shell: labelled by its title, with the behaviour of useDialog plus backdrop click. */
export function Modal({
  isOpen,
  onClose,
  title,
  children,
  className,
  closeLabel,
  description,
  footer,
  busy = false,
  ariaLabel,
  id,
  kind = "form",
  icon,
}: ModalProps) {
  const copy = useUiCopy();
  const [footerHost, setFooterHost] = React.useState<HTMLDivElement | null>(
    null,
  );
  closeLabel ??= copy.close;
  const titleId = React.useId();
  const descriptionId = React.useId();
  const [closing, setClosing] = React.useState(false);
  const closeTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  React.useEffect(() => {
    setClosing(false);
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, [isOpen]);
  const close = () => {
    if (busy || closing) return;
    const motion = document.documentElement.dataset.motion;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (motion === "none" || reduced) {
      onClose();
      return;
    }
    setClosing(true);
    closeTimer.current = setTimeout(onClose, motion === "reduced" ? 80 : 160);
  };
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  const dialog = useDialog(isOpen && mounted, close);

  if (!isOpen || !mounted) return null;

  const headline = title ?? ariaLabel ?? copy.dialog;
  return createPortal(
    <div
      data-modal-container
      data-kind={kind}
      data-state={closing ? "closing" : "open"}
      className="fixed inset-0 flex items-center justify-center p-4"
    >
      <div
        data-modal-backdrop
        className="absolute inset-0"
        onClick={close}
        aria-hidden="true"
      />
      <div
        {...dialog}
        id={id}
        data-modal-card
        inert={closing}
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        aria-busy={busy}
        className={cn(
          "relative z-10 w-full max-w-2xl min-w-0 flex flex-col overflow-hidden focus:outline-none",
          className,
        )}
      >
        <ModalFooterContext.Provider value={footerHost}>
          <header role="presentation" data-modal-header>
            <div className="flex min-w-0 items-start gap-3">
              {icon && (
                <span
                  aria-hidden
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-m3-secondary-container text-m3-on-secondary-container"
                >
                  {icon}
                </span>
              )}
              <h2 id={titleId}>{headline}</h2>
            </div>
            <button
              type="button"
              onClick={close}
              aria-label={closeLabel}
              disabled={busy}
              className="flex items-center justify-center m3-state-layer"
            >
              <X aria-hidden className="h-4 w-4" />
            </button>
          </header>
          <div data-dialog-body>
            {description && (
              <div
                id={descriptionId}
                className="mb-5 text-sm leading-relaxed text-m3-on-surface-variant"
              >
                {description}
              </div>
            )}
            {children}
          </div>
          <footer role="presentation" data-modal-footer>
            <div ref={setFooterHost} data-modal-footer-slot>
              {footer === undefined ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={close}
                >
                  {closeLabel}
                </Button>
              ) : (
                footer
              )}
            </div>
          </footer>
        </ModalFooterContext.Provider>
      </div>
    </div>,
    document.body,
  );
}

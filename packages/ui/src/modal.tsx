"use client";
import { useUiCopy } from "./copy/use-ui-copy";

import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "./utils";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
  description?: React.ReactNode;
  footer?: React.ReactNode;
  busy?: boolean;
  ariaLabel?: string;
  /** Accessible name of the close button (localise it in the calling app). */
  closeLabel?: string;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Dialog behaviour for any overlay: focuses the first field, keeps Tab inside, closes on Escape,
 * restores focus to the opener and locks page scroll. Spread the returned props on the dialog card.
 */
const openDialogs: HTMLElement[] = [];
let bodyOverflow = "";

export function useDialog(isOpen: boolean, onClose: () => void) {
  const ref = React.useRef<HTMLElement | null>(null);
  const onCloseRef = React.useRef(onClose);
  React.useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  React.useEffect(() => {
    if (!isOpen) return;
    const opener = document.activeElement as HTMLElement | null;
    const card = ref.current;
    const first = card?.querySelector<HTMLElement>(`[data-dialog-body] :is(${FOCUSABLE})`) ?? card?.querySelector<HTMLElement>("input, select, textarea");
    (first ?? card)?.focus();
    if (!card) return;
    if (!openDialogs.length) bodyOverflow = document.body.style.overflow;
    openDialogs.push(card);
    document.body.style.overflow = "hidden";

    const isTop = () => openDialogs.at(-1) === card;
    const onFocus = (event: FocusEvent) => {
      if (isTop() && !card.contains(event.target as Node)) card.focus();
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
      const items = Array.from(card.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.getClientRects().length > 0 && !el.closest("[hidden], [inert]"));
      if (!items.length) {
        event.preventDefault();
        card.focus();
        return;
      }
      const firstItem = items[0], lastItem = items[items.length - 1];
      if (event.shiftKey && (document.activeElement === firstItem || !items.includes(document.activeElement as HTMLElement))) {
        event.preventDefault();
        lastItem.focus();
      } else if (!event.shiftKey && (document.activeElement === lastItem || !items.includes(document.activeElement as HTMLElement))) {
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
      if (wasTop && opener?.isConnected) opener.focus();
    };
  }, [isOpen]);

  return {
    ref: ref as React.RefObject<any>,
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
}: ModalProps) {
  const copy = useUiCopy();
  closeLabel ??= copy.close;
  const titleId = React.useId();
  const descriptionId = React.useId();
  const close = () => { if (!busy) onClose(); };
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  const dialog = useDialog(isOpen && mounted, close);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      data-modal-container
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 modal-scrim"
    >
      <div data-modal-backdrop className="fixed inset-0" onClick={close} aria-hidden="true" />
      <div
        {...dialog}
        data-modal-card
        aria-labelledby={title ? titleId : undefined}
        aria-label={title ? undefined : ariaLabel ?? closeLabel}
        aria-describedby={description ? descriptionId : undefined}
        aria-busy={busy}
        className={cn(
          "relative w-full max-w-3xl bg-white border border-slate-200 text-slate-800 dark:bg-tone-10 dark:border-white/10 dark:text-ink flex flex-col overflow-hidden z-10 max-h-[90dvh] rounded-t-2xl sm:rounded-2xl focus:outline-none",
          className,
        )}
      >
        {title && (
          <div
            data-modal-header
            className="flex shrink-0 items-center justify-between gap-3 px-6 py-4"
          >
            <h3 id={titleId} className="text-base sm:text-lg font-bold font-display text-slate-900 dark:text-ink">{title}</h3>
            <button
              type="button"
              onClick={close}
              aria-label={closeLabel}
              disabled={busy}
              className="w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/10 text-xl leading-none transition-colors"
            >
              <span aria-hidden="true">×</span>
            </button>
          </div>
        )}
        <div data-dialog-body className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {description && <div id={descriptionId} className="mb-4 text-sm text-ink-muted">{description}</div>}
          {children}
        </div>
        {footer && <div className="shrink-0 border-t border-ink/10 px-6 py-4">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

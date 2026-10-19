"use client";
import { useUiCopy } from "./copy/use-ui-copy";

import * as React from "react";
import { cn } from "./utils";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
  /** Accessible name of the close button (localise it in the calling app). */
  closeLabel?: string;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Dialog behaviour for any overlay: focuses the first field, keeps Tab inside, closes on Escape,
 * restores focus to the opener and locks page scroll. Spread the returned props on the dialog card.
 */
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
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab" || !card) return;
      const items = Array.from(card.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null);
      if (!items.length) return;
      const firstItem = items[0], lastItem = items[items.length - 1];
      if (event.shiftKey && document.activeElement === firstItem) {
        event.preventDefault();
        lastItem.focus();
      } else if (!event.shiftKey && document.activeElement === lastItem) {
        event.preventDefault();
        firstItem.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      opener?.focus?.();
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
}: ModalProps) {
  const copy = useUiCopy();
  closeLabel ??= copy.close;
  const titleId = React.useId();
  const dialog = useDialog(isOpen, onClose);

  if (!isOpen) return null;

  return (
    <div
      data-modal-container
      className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-scrim"
    >
      <div data-modal-backdrop className="fixed inset-0" onClick={onClose} aria-hidden="true" />
      <div
        {...dialog}
        data-modal-card
        aria-labelledby={title ? titleId : undefined}
        className={cn(
          "relative w-full max-w-3xl bg-white border border-slate-200 text-slate-800 dark:bg-[#121B19] dark:border-white/10 dark:text-[#F2F6F5] flex flex-col overflow-hidden z-10 max-h-[90vh] focus:outline-none",
          className,
        )}
      >
        {title && (
          <div
            data-modal-header
            className="flex shrink-0 items-center justify-between gap-3 px-6 py-4"
          >
            <h3 id={titleId} className="text-base sm:text-lg font-bold font-display text-slate-900 dark:text-[#F2F6F5]">{title}</h3>
            <button
              type="button"
              onClick={onClose}
              aria-label={closeLabel}
              className="w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/10 text-xl leading-none transition-colors"
            >
              <span aria-hidden="true">×</span>
            </button>
          </div>
        )}
        <div data-dialog-body className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

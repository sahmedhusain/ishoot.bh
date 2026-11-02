"use client";
import * as React from "react";
import { createPortal } from "react-dom";
import {
  autoUpdate,
  flip,
  offset,
  shift,
  size,
  useFloating,
} from "@floating-ui/react-dom";
import { cn } from "./utils";
import "./floating-surface.css";

interface FloatingSurfaceProps extends React.HTMLAttributes<HTMLElement> {
  anchor: HTMLElement | null;
  onClose: () => void;
  element?: "div" | "ul";
}

export const FloatingSurface = React.forwardRef<
  HTMLElement,
  FloatingSurfaceProps
>(function FloatingSurface(
  {
    anchor,
    onClose,
    element: Tag = "div",
    className,
    children,
    onKeyDown,
    onMouseDown,
    ...props
  },
  forwardedRef,
) {
  const panel = React.useRef<HTMLElement | null>(null);
  const { refs, floatingStyles } = useFloating({
    elements: { reference: anchor },
    strategy: "fixed",
    transform: false,
    placement: "bottom-start",
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(6),
      flip({ padding: 12 }),
      shift({ padding: 12 }),
      size({
        padding: 12,
        apply({ availableHeight, availableWidth, rects, elements }) {
          Object.assign(elements.floating.style, {
            width: `${Math.min(Math.max(rects.reference.width, 240), availableWidth)}px`,
            maxHeight: `${Math.min(400, availableHeight)}px`,
          });
        },
      }),
    ],
  });
  React.useEffect(() => {
    const outside = (event: PointerEvent) => {
      if (
        !anchor?.contains(event.target as Node) &&
        !panel.current?.contains(event.target as Node)
      )
        onClose();
    };
    document.addEventListener("pointerdown", outside, true);
    return () => document.removeEventListener("pointerdown", outside, true);
  }, [anchor, onClose]);
  if (!anchor) return null;
  return createPortal(
    <Tag
      {...props}
      ref={(node: HTMLElement | null) => {
        panel.current = node;
        refs.setFloating(node);
        if (typeof forwardedRef === "function") forwardedRef(node);
        else if (forwardedRef) forwardedRef.current = node;
      }}
      style={floatingStyles}
      dir={getComputedStyle(anchor).direction === "rtl" ? "rtl" : "ltr"}
      data-dialog-scope-owner={
        anchor
          .closest("[data-dialog-scope], [data-dialog-scope-owner]")
          ?.getAttribute("data-dialog-scope") ??
        anchor
          .closest("[data-dialog-scope-owner]")
          ?.getAttribute("data-dialog-scope-owner") ??
        undefined
      }
      className={cn("m3-floating-surface", className)}
      onMouseDown={(event) => {
        event.stopPropagation();
        onMouseDown?.(event);
      }}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        if (event.defaultPrevented) return;
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          onClose();
          anchor.focus();
          return;
        }
        const items = Array.from(
          panel.current?.querySelectorAll<HTMLElement>(
            'button:not([disabled]), a[href], [role="option"]',
          ) ?? [],
        ).filter((item) => item.getClientRects().length > 0);
        const index = items.indexOf(document.activeElement as HTMLElement);
        if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
          event.preventDefault();
          event.stopPropagation();
          (event.key === "Home"
            ? items[0]
            : event.key === "End"
              ? items.at(-1)
              : items[
                  (index +
                    (event.key === "ArrowDown" ? 1 : -1) +
                    items.length) %
                    items.length
                ]
          )?.focus();
        }
        if (event.key === "Tab") {
          event.preventDefault();
          event.stopPropagation();
          onClose();
          const scope = anchor.closest("[data-dialog-scope]") ?? document.body;
          const controls = Array.from(
            scope.querySelectorAll<HTMLElement>(
              'input, button, select, textarea, a[href], [tabindex="0"]',
            ),
          ).filter(
            (item) =>
              item.getClientRects().length &&
              item.tabIndex >= 0 &&
              !item.matches(":disabled") &&
              !item.closest("[hidden], [inert], .m3-floating-surface"),
          );
          (
            controls[controls.indexOf(anchor) + (event.shiftKey ? -1 : 1)] ??
            anchor
          ).focus();
        }
      }}
    >
      {children}
    </Tag>,
    document.body,
  );
});

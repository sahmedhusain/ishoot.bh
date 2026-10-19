"use client";
import * as React from "react";
/** Keyboard access, focus restoration and one open header menu at a time. */
export function useHeaderPopover(name: string) {
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const other = (event: Event) => {
      if ((event as CustomEvent).detail !== name) setOpen(false);
    };
    document.addEventListener("ishoot:header-menu", other);
    return () => document.removeEventListener("ishoot:header-menu", other);
  }, [name]);
  React.useEffect(() => {
    if (!open) return;
    document.dispatchEvent(
      new CustomEvent("ishoot:header-menu", { detail: name }),
    );
    const frame = requestAnimationFrame(() =>
      panelRef.current
        ?.querySelector<HTMLElement>(
          "a,button:not(:disabled),input:not(:disabled)",
        )
        ?.focus(),
    );
    const outside = (e: Event) => {
      if (e.target instanceof Node && !containerRef.current?.contains(e.target))
        setOpen(false);
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("focusin", outside);
    document.addEventListener("keydown", escape);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("focusin", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open, name]);
  const onKeyDown = (event: React.KeyboardEvent) => {
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    const items = Array.from(
      panelRef.current?.querySelectorAll<HTMLElement>(
        "a,button:not(:disabled)",
      ) ?? [],
    );
    if (!items.length) return;
    event.preventDefault();
    const at = items.indexOf(document.activeElement as HTMLElement);
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? items.length - 1
          : event.key === "ArrowDown"
            ? (at + 1) % items.length
            : (at - 1 + items.length) % items.length;
    items[next].focus();
  };
  return { open, setOpen, containerRef, triggerRef, panelRef, onKeyDown };
}

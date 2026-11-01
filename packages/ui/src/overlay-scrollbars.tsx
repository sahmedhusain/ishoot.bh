"use client";
import * as React from "react";
import {
  ClickScrollPlugin,
  OverlayScrollbars,
  type OverlayScrollbars as Instance,
} from "overlayscrollbars";
import "overlayscrollbars/overlayscrollbars.css";
import "./overlay-scrollbars.css";

OverlayScrollbars.plugin(ClickScrollPlugin);

const TARGETS =
  'main, .admin-main, .admin-settings-nav, [role=tablist], .m3-floating-surface, .m3-surface-body, .m3-select-options, .admin-sidebar nav, [data-dialog-body], .admin-popover-body, [data-overlay-scroll], [class*="overflow-auto"], [class*="overflow-y-auto"], [class*="overflow-x-auto"], [class*="overflow-scroll"]';

/** Existing elements remain the native viewport, so React children, refs and scroll events stay intact. */
export function OverlayScrollbarsProvider() {
  React.useEffect(() => {
    // The root provider can mount while Next is still streaming/hydrating a
    // dashboard page. Wait for that page's commit before inserting scrollbars.
    let ready = !!document.querySelector("[data-overlay-scroll-ready]");
    const instances = new Map<HTMLElement, Instance>();
    const initialize = (element: HTMLElement) => {
      if (
        !ready ||
        instances.has(element) ||
        element.closest(".os-scrollbar, [data-print-target]") ||
        ["SELECT", "TEXTAREA", "TABLE", "TBODY", "THEAD"].includes(
          element.tagName,
        )
      )
        return;
      const style = getComputedStyle(element);
      if (!/(auto|scroll)/.test(style.overflowX + style.overflowY)) return;
      if (style.position === "static") {
        element.style.position = "relative";
      }
      const axis = (value: string) =>
        value === "hidden" || value === "clip"
          ? ("hidden" as const)
          : value === "visible"
            ? ("visible" as const)
            : ("scroll" as const);
      const instance = OverlayScrollbars(
        {
          target: element,
          elements: { viewport: element, padding: false, content: false },
        },
        {
          overflow: { x: axis(style.overflowX), y: axis(style.overflowY) },
          scrollbars: {
            theme: "os-theme-material",
            autoHide: "scroll",
            autoHideDelay: 1200,
            clickScroll: true,
          },
        },
      );
      instances.set(element, instance);
    };
    const scan = (root: Element) => {
      if (root instanceof HTMLElement && root.matches(TARGETS))
        initialize(root);
      root.querySelectorAll<HTMLElement>(TARGETS).forEach(initialize);
    };
    scan(document.body);
    let frame = 0;
    const added = new Set<Element>();
    const observer = new MutationObserver((records) => {
      if (!ready && document.querySelector("[data-overlay-scroll-ready]")) {
        ready = true;
        added.add(document.body);
      }
      let removed = false;
      for (const record of records) {
        if (record.removedNodes.length) removed = true;
        if ((record.target as Element).closest?.(".os-scrollbar")) continue;
        if (record.type === "attributes") added.add(record.target as Element);
        else
          for (const node of Array.from(record.addedNodes))
            if (node instanceof Element && !node.matches(".os-scrollbar"))
              added.add(node);
      }
      if ((!added.size && !removed) || frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        added.forEach(scan);
        added.clear();
        instances.forEach((instance, element) => {
          if (!element.isConnected) {
            instance.destroy();
            instances.delete(element);
          }
        });
      });
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "data-overlay-scroll-ready"],
    });
    const direction = new MutationObserver(() =>
      instances.forEach((instance) => instance.update(true)),
    );
    direction.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["dir", "class"],
    });
    return () => {
      observer.disconnect();
      direction.disconnect();
      cancelAnimationFrame(frame);
      instances.forEach((instance) => instance.destroy());
    };
  }, []);
  return null;
}

"use client";
import * as React from "react";
import { usePathname } from "next/navigation";
import { useAdminTheme } from "../../hooks/useAdminTheme";

export function WorkspaceInteractions() {
  const pathname = usePathname();
  const { appearance } = useAdminTheme();
  React.useEffect(() => {
    const navigateTabs = (event: KeyboardEvent) => {
      if (
        event.defaultPrevented ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey
      )
        return;
      const tab = (event.target as HTMLElement).closest<HTMLElement>(
        '[role="tab"]',
      );
      const list = tab?.closest<HTMLElement>('[role="tablist"]');
      if (
        !tab ||
        !list ||
        !["ArrowLeft", "ArrowRight", "Home", "End", " "].includes(event.key)
      )
        return;
      const tabs = Array.from(
        list.querySelectorAll<HTMLElement>('[role="tab"]'),
      ).filter(
        (item) =>
          item.closest('[role="tablist"]') === list &&
          !item.matches(":disabled") &&
          item.getClientRects().length,
      );
      const step =
        (event.key === "ArrowRight" ? 1 : -1) *
        (getComputedStyle(list).direction === "rtl" ? -1 : 1);
      const next =
        event.key === "Home"
          ? tabs[0]
          : event.key === "End"
            ? tabs.at(-1)
            : event.key === " "
              ? tab
              : tabs[(tabs.indexOf(tab) + step + tabs.length) % tabs.length];
      if (!next) return;
      event.preventDefault();
      next.focus();
      next.click();
      next.scrollIntoView({ block: "nearest", inline: "nearest" });
    };
    document.addEventListener("keydown", navigateTabs);
    return () => document.removeEventListener("keydown", navigateTabs);
  }, []);
  const positions = React.useRef(new Map<string, number>());
  React.useLayoutEffect(() => {
    const savedPositions = positions.current;
    const main = document.getElementById("admin-main");
    const content = main?.querySelector<HTMLElement>(".admin-page");
    if (!main || !content) return;
    main.scrollTop = savedPositions.get(pathname) ?? 0;
    const reduced =
      appearance.motion !== "system" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const animation = !reduced
      ? content.animate(
          [
            { opacity: 0.45, transform: "translateY(8px)" },
            { opacity: 1, transform: "none" },
          ],
          { duration: 240, easing: "cubic-bezier(.2,0,0,1)" },
        )
      : undefined;
    return () => {
      savedPositions.set(pathname, main.scrollTop);
      animation?.cancel();
    };
  }, [pathname, appearance.motion]);
  return null;
}

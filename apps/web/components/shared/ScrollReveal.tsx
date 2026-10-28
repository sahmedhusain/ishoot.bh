"use client";
import { useSiteReducedMotion } from "../site/SiteTheme";
import { useEffect } from "react";

/**
 * Sections marked `data-reveal` that start below the fold fade and rise into place as they scroll into view
 * (for whole sections without a Reveal of their own; plain CSS, so long pages stay light).
 * Nothing is hidden by the server or above the fold, so the page reads the same without JavaScript, and with
 * "reduce motion" nothing moves.
 */
export function ScrollReveal() {
  const reduced = useSiteReducedMotion();
  useEffect(() => {
    if (reduced || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.removeAttribute("data-reveal-pending");
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.05 },
    );
    const elements = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    for (const element of elements) {
      if (element.getBoundingClientRect().top < window.innerHeight) continue;
      element.setAttribute("data-reveal-pending", "");
      observer.observe(element);
    }
    return () => {
      observer.disconnect();
      for (const element of elements) element.removeAttribute("data-reveal-pending");
    };
  }, [reduced]);
  return null;
}

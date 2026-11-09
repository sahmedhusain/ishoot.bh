"use client";
import { useSiteReducedMotion } from "../site/SiteTheme";
import { useEffect } from "react";

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

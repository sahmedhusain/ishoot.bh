"use client";
import { useSiteReducedMotion } from "../site/SiteTheme";
import * as React from "react";
import Lenis from "lenis";
import { MotionConfig } from "framer-motion";
export function SmoothScroll({ children }: { children: React.ReactNode }) {
  const reduced = useSiteReducedMotion();
  React.useEffect(() => {
    if (reduced !== false || !window.matchMedia("(pointer: fine)").matches)
      return;
    const lenis = new Lenis({ duration: 0.8, smoothWheel: true });
    let frame = 0;
    function raf(time: number) {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    }
    frame = requestAnimationFrame(raf);
    return () => {
      cancelAnimationFrame(frame);
      lenis.destroy();
    };
  }, [reduced]);
  return (
    <MotionConfig reducedMotion={reduced ? "always" : "user"} transition={{ duration: reduced ? 0 : 0.3 }}>
      {children}
    </MotionConfig>
  );
}

"use client";
import * as React from "react";
import Lenis from "lenis";
import { MotionConfig, useReducedMotion } from "framer-motion";
export function SmoothScroll({ children }: { children: React.ReactNode }) {
  const reduced = useReducedMotion();
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
    <MotionConfig reducedMotion="user" transition={{ duration: 0.3 }}>
      {children}
    </MotionConfig>
  );
}

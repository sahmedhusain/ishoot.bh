"use client";

import * as React from "react";

export function FloatingScrollbar() {
  const [scrollProgress, setScrollProgress] = React.useState(0);
  const [thumbHeight, setThumbHeight] = React.useState(70);
  const [isHovered, setIsHovered] = React.useState(false);
  const [isScrolling, setIsScrolling] = React.useState(false);
  const [isDragging, setIsDragging] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);

  const scrollTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const trackRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setMounted(true);

    const updateScrollMetrics = () => {
      const scrollHeight = document.documentElement.scrollHeight;
      const clientHeight = window.innerHeight;
      const totalScroll = scrollHeight - clientHeight;

      if (totalScroll <= 0) {
        setScrollProgress(0);
        return;
      }

      const currentScroll = window.scrollY;
      const progress = Math.min(1, Math.max(0, currentScroll / totalScroll));
      setScrollProgress(progress);

      const ratio = clientHeight / scrollHeight;
      const height = Math.max(48, Math.min(240, clientHeight * ratio));
      setThumbHeight(height);

      setIsScrolling(true);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = setTimeout(() => {
        setIsScrolling(false);
      }, 1200);
    };

    window.addEventListener("scroll", updateScrollMetrics, { passive: true });
    window.addEventListener("resize", updateScrollMetrics, { passive: true });
    updateScrollMetrics();

    return () => {
      window.removeEventListener("scroll", updateScrollMetrics);
      window.removeEventListener("resize", updateScrollMetrics);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
    setIsDragging(true);

    const startY = e.clientY;
    const startScroll = window.scrollY;
    const scrollHeight = document.documentElement.scrollHeight;
    const clientHeight = window.innerHeight;
    const totalScroll = scrollHeight - clientHeight;
    const availableTrack = clientHeight - thumbHeight - 16;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      moveEvent.preventDefault();
      const deltaY = moveEvent.clientY - startY;
      const scrollRatio = deltaY / Math.max(1, availableTrack);
      const targetScroll = Math.min(
        totalScroll,
        Math.max(0, startScroll + scrollRatio * totalScroll),
      );
      window.scrollTo({ top: targetScroll, behavior: "instant" });
    };

    const handlePointerUp = (upEvent: PointerEvent) => {
      setIsDragging(false);
      try {
        (e.target as HTMLElement).releasePointerCapture(upEvent.pointerId);
      } catch {}
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };

    window.addEventListener("pointermove", handlePointerMove, {
      passive: false,
    });
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
  };

  const handleTrackClick = (e: React.MouseEvent) => {
    if (e.target !== trackRef.current) return;
    const clickY = e.clientY;
    const clientHeight = window.innerHeight;
    const totalScroll = document.documentElement.scrollHeight - clientHeight;
    const targetProgress = Math.min(
      1,
      Math.max(0, (clickY - thumbHeight / 2) / (clientHeight - thumbHeight)),
    );
    window.scrollTo({
      top: targetProgress * totalScroll,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
  };

  if (!mounted) return null;

  const isVisible = isHovered || isScrolling || isDragging;
  const availableDistance =
    typeof window !== "undefined" ? window.innerHeight - thumbHeight - 16 : 0;
  const translateY = scrollProgress * availableDistance + 8;

  return (
    <aside
      ref={trackRef}
      onClick={handleTrackClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      aria-hidden="true"
      className="fixed top-0 bottom-0 end-1 z-[90] w-4 flex justify-center pointer-events-auto select-none touch-none"
      style={{
        background: "transparent",
      }}
    >
      <div
        onPointerDown={handlePointerDown}
        className={`w-1.5 rounded-full cursor-grab active:cursor-grabbing transition-all duration-300 ease-out will-change-transform touch-none ${
          isVisible
            ? "opacity-100 scale-x-100"
            : "opacity-0 scale-x-50 pointer-events-none"
        } ${
          isDragging
            ? "bg-[#09937F] shadow-[0_0_12px_rgba(9,147,127,0.9)] scale-x-125"
            : isHovered
              ? "bg-[#09937F]/90 shadow-[0_0_8px_rgba(9,147,127,0.6)] scale-x-110"
              : "bg-white/30"
        }`}
        style={{
          height: `${thumbHeight}px`,
          transform: `translateY(${translateY}px)`,
        }}
      />
    </aside>
  );
}

"use client";
import * as React from "react";

export interface CountUpProps {
  value: number;
  /** How the number is shown (currency, percent…); defaults to the number with its decimals. */
  render?: (value: number) => React.ReactNode;
  /** Decimal places while counting (the final value is always exact). */
  decimals?: number;
  duration?: number;
}

export function prefersReducedMotion() {
  if (typeof window === "undefined") return false;
  const motion = document.documentElement.dataset.motion;
  return (
    motion === "reduced" ||
    motion === "none" ||
    !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * A figure that counts up to its value when it first appears and when it changes. The server renders the final
 * value, so it reads correctly without JavaScript; with "reduce motion" it never moves.
 */
export function CountUp({
  value,
  render,
  decimals = 0,
  duration = 700,
}: CountUpProps) {
  const [shown, setShown] = React.useState(value);
  const from = React.useRef(0);
  React.useEffect(() => {
    if (
      !Number.isFinite(value) ||
      prefersReducedMotion() ||
      value === from.current
    ) {
      setShown(value);
      from.current = value;
      return;
    }
    const start = performance.now();
    const origin = from.current;
    const factor = 10 ** decimals;
    let frame = 0;
    const tick = (now: number) => {
      const progress = prefersReducedMotion()
        ? 1
        : Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - progress) ** 3;
      setShown(
        progress >= 1
          ? value
          : Math.round((origin + (value - origin) * eased) * factor) / factor,
      );
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    from.current = value;
    return () => cancelAnimationFrame(frame);
  }, [value, decimals, duration]);
  return <>{render ? render(shown) : shown.toFixed(decimals)}</>;
}

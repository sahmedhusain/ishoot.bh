"use client";

import type { ReactNode } from "react";
import { motion, useAnimationControls, useReducedMotion } from "framer-motion";

/** One-time entrance; content stays visible until motion preferences resolve. */
export function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduced = useReducedMotion();
  const controls = useAnimationControls();
  return (
    <motion.div
      initial={false}
      animate={controls}
      onViewportEnter={() => {
        if (reduced === false) {
          void controls.start({ opacity: [0, 1], y: [16, 0] });
        }
      }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{
        // The shared motion tokens: --motion-slow and --ease-emphasized.
        duration: reduced ? 0 : 0.32,
        delay: reduced ? 0 : delay,
        ease: [0.16, 1, 0.3, 1],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

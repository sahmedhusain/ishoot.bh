"use client";
import { useSiteReducedMotion } from "../site/SiteTheme";

import type { ReactNode } from "react";
import { motion, useAnimationControls } from "framer-motion";

export function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduced = useSiteReducedMotion();
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

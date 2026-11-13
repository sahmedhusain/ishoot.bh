import * as React from "react";
import { cn } from "./utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?:
    "default" | "emerald" | "amber" | "blue" | "rose" | "purple" | "outline";
}

export function Badge({
  className,
  variant = "default",
  ...props
}: BadgeProps) {
  const variants = {
    default:
      "bg-m3-surface-container-high text-m3-on-surface border-m3-outline-variant/40 dark:bg-m3-surface-container-high dark:text-m3-on-surface dark:border-m3-outline-variant/30",
    emerald:
      "bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30",
    amber:
      "bg-amber-500/15 text-amber-800 border-amber-500/30 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30",
    blue: "bg-blue-500/15 text-blue-700 border-blue-500/30 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/30",
    rose: "bg-rose-500/15 text-rose-700 border-rose-500/30 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/30",
    purple:
      "bg-purple-500/15 text-purple-700 border-purple-500/30 dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-500/30",
    outline:
      "bg-transparent text-m3-on-surface-variant border-m3-outline-variant",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1 rounded-[var(--md-sys-shape-corner-small)] text-xs font-semibold border",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}

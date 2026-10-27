import * as React from "react";
import { cn } from "./utils";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "elevated" | "filled" | "outlined";
}

export function Card({ className, variant = "outlined", ...props }: CardProps) {
  const variantStyles = {
    // M3 Elevated Card: Level 1 elevation shadow on surface-container-low
    elevated:
      "bg-m3-surface-container-low text-m3-on-surface border border-m3-outline-variant/30 shadow-m3-1 dark:bg-m3-surface-container-low dark:border-m3-outline-variant/20 dark:text-m3-on-surface",
    // M3 Filled Card: flat surface-container-highest tonal background
    filled:
      "bg-m3-surface-container-highest text-m3-on-surface border-0 dark:bg-m3-surface-container-highest dark:text-m3-on-surface",
    // M3 Outlined Card: surface background with outline-variant border
    outlined:
      "bg-m3-surface border border-m3-outline-variant text-m3-on-surface dark:bg-m3-surface dark:border-m3-outline-variant dark:text-m3-on-surface",
  };

  return (
    <div
      data-ui="card"
      data-variant={variant}
      className={cn(
        "rounded-[var(--md-sys-shape-corner-medium)] p-6 transition-[box-shadow,background-color] duration-base ease-standard",
        variantStyles[variant],
        className,
      )}
      {...props}
    />
  );
}

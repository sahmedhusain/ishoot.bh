import * as React from "react";
import { cn } from "./utils";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "elevated" | "filled" | "outlined";
}

export function Card({ className, variant = "outlined", ...props }: CardProps) {
  const variantStyles: Record<NonNullable<CardProps["variant"]>, string> = {
    elevated:
      "bg-m3-surface-container-low text-m3-on-surface border border-m3-outline-variant/40 shadow-m3-1",
    filled:
      "bg-m3-surface-container-highest text-m3-on-surface border border-transparent",
    outlined:
      "bg-m3-surface text-m3-on-surface border border-m3-outline-variant",
  };

  return (
    <div
      data-ui="card"
      data-variant={variant}
      className={cn(
        "rounded-[var(--md-sys-shape-corner-medium)] p-6 transition-[box-shadow,background-color,border-color] duration-base ease-standard",
        variantStyles[variant],
        className,
      )}
      {...props}
    />
  );
}

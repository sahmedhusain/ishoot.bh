import * as React from "react";
import { cn } from "./utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?:
    | "default"
    | "primary"
    | "secondary"
    | "tertiary"
    | "error"
    | "emerald"
    | "amber"
    | "blue"
    | "rose"
    | "purple"
    | "outline";
}

export function Badge({
  className,
  variant = "default",
  ...props
}: BadgeProps) {
  const variants: Record<NonNullable<BadgeProps["variant"]>, string> = {
    default:
      "bg-m3-surface-container-high text-m3-on-surface border-m3-outline-variant",
    primary:
      "bg-m3-primary-container text-m3-on-primary-container border-m3-primary/25",
    secondary:
      "bg-m3-secondary-container text-m3-on-secondary-container border-m3-outline-variant/60",
    tertiary:
      "bg-m3-tertiary-container text-m3-on-tertiary-container border-m3-tertiary/25",
    error:
      "bg-m3-error-container text-m3-on-error-container border-m3-error/30",
    emerald:
      "bg-m3-primary-container text-m3-on-primary-container border-m3-primary/30",
    amber:
      "bg-m3-tertiary-container text-m3-on-tertiary-container border-m3-tertiary/30",
    blue:
      "bg-m3-secondary-container text-m3-on-secondary-container border-m3-secondary/30",
    rose:
      "bg-m3-error-container text-m3-on-error-container border-m3-error/30",
    purple:
      "bg-m3-tertiary-container text-m3-on-tertiary-container border-m3-tertiary/30",
    outline:
      "bg-transparent text-m3-on-surface-variant border-m3-outline",
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

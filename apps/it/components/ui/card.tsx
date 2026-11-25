import * as React from "react";
import { cn } from "./utils";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "elevated" | "filled" | "outlined";
}

export function Card({ className, variant = "outlined", ...props }: CardProps) {
  const variantStyles = {
    elevated:
      "bg-surface text-ink border border-outline-variant shadow-sm",
    filled:
      "bg-surface-raised text-ink border border-outline-variant",
    outlined:
      "bg-surface text-ink border border-outline-variant shadow-[0_1px_3px_0_rgba(0,0,0,0.04)]",
  };

  return (
    <div
      data-ui="card"
      data-variant={variant}
      className={cn(
        "rounded-lg p-5 transition-[box-shadow,background-color] duration-150",
        variantStyles[variant],
        className,
      )}
      {...props}
    />
  );
}

import * as React from "react";
import { cn } from "./utils";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "elevated" | "filled" | "outlined";
}

export function Card({
  className,
  variant = "elevated",
  ...props
}: CardProps) {
  const variantStyles = {
    elevated:
      "bg-white border border-ink/10 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_1px_3px_1px_rgba(0,0,0,0.03)] text-slate-800 dark:bg-surface-raised dark:border-white/[0.08] dark:shadow-none dark:text-[#F2F6F5]",
    filled:
      "bg-surface-sunken border border-transparent text-slate-800 dark:bg-surface-sunken dark:text-[#F2F6F5]",
    outlined:
      "bg-transparent border border-ink/20 text-slate-800 dark:text-[#F2F6F5]",
  };

  return (
    <div
      className={cn(
        "rounded-[20px] p-6 transition-[box-shadow,background-color] duration-200",
        variantStyles[variant],
        className,
      )}
      {...props}
    />
  );
}

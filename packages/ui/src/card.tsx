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
      "bg-white border border-slate-200/80 shadow-sm hover:shadow-md text-slate-800 dark:bg-[#121B19] dark:border-white/10 dark:text-[#F2F6F5] dark:shadow-xl",
    filled:
      "bg-slate-50 border border-slate-100 text-slate-800 dark:bg-[#0B1312] dark:border-white/5 dark:text-[#F2F6F5]",
    outlined:
      "bg-transparent border border-slate-300 text-slate-800 dark:border-white/15 dark:text-[#F2F6F5]",
  };

  return (
    <div
      className={cn(
        "rounded-2xl p-6 transition-all duration-200",
        variantStyles[variant],
        className,
      )}
      {...props}
    />
  );
}

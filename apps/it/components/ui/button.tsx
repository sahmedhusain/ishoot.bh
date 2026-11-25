import * as React from "react";
import { cn } from "./utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | "primary"
    | "secondary"
    | "ghost"
    | "outline"
    | "danger"
    | "fab"
    | "elevated";
  size?: "sm" | "md" | "lg" | "icon" | "fab";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", children, ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center justify-center whitespace-nowrap font-semibold select-none relative overflow-hidden transition-[background-color,border-color,color,box-shadow,transform] duration-150 ease-standard motion-safe:active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

    const variants = {
      primary:
        "bg-[#0070d2] hover:bg-[#005fb2] dark:bg-[#0284c7] dark:hover:bg-[#0369a1] text-white border border-transparent shadow-sm",
      secondary:
        "bg-surface-muted hover:bg-surface-container-high text-ink border border-outline-variant shadow-sm",
      ghost:
        "bg-transparent hover:bg-surface-muted text-ink-muted hover:text-ink border border-transparent",
      outline:
        "bg-surface hover:bg-surface-raised border border-outline-variant text-ink shadow-sm",
      elevated:
        "bg-surface hover:bg-surface-raised border border-outline-variant text-ink shadow",
      danger:
        "bg-rose-600 hover:bg-rose-700 dark:bg-rose-600 dark:hover:bg-rose-700 text-white border border-transparent shadow-sm",
      fab: "bg-[#0070d2] hover:bg-[#005fb2] text-white rounded-lg shadow-md",
    };

    const sizes = {
      sm: "text-xs min-h-8 px-3 py-1.5 gap-1.5",
      md: "text-xs min-h-9 px-4 py-2 gap-2",
      lg: "text-sm min-h-10 px-5 py-2.5 gap-2",
      icon: "w-9 h-9 p-0 rounded-md",
      fab: "h-12 px-5 text-xs font-semibold gap-2",
    };

    return (
      <button
        ref={ref}
        data-ui="button"
        data-variant={variant}
        data-size={size}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {children}
      </button>
    );
  },
);
Button.displayName = "Button";

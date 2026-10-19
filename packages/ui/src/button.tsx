import * as React from "react";
import { cn } from "./utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "outline" | "danger" | "fab";
  size?: "sm" | "md" | "lg" | "icon" | "fab";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    const baseStyles =
      // Material 3 Expressive: pill shape that squares off slightly while pressed, visible keyboard focus.
      "inline-flex items-center justify-center font-medium select-none transition-[background-color,border-color,color,box-shadow,border-radius,transform] duration-200 ease-out disabled:opacity-50 disabled:pointer-events-none rounded-full active:rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-surface";

    const variants = {
      primary:
        "bg-primary hover:bg-primary-light active:bg-primary-dark text-white shadow-sm hover:shadow-md dark:bg-tone-60 dark:hover:bg-tone-70 dark:active:bg-tone-50 dark:text-tone-5",
      // Filled tonal
      secondary:
        "bg-tone-90 hover:bg-tone-80 text-tone-5 dark:bg-tone-15 dark:hover:bg-tone-20 dark:text-tone-80",
      ghost:
        "bg-transparent hover:bg-ink/[0.08] active:bg-ink/[0.12] text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white",
      outline:
        "bg-transparent border border-ink/25 hover:bg-primary/[0.06] hover:border-ink/40 text-primary dark:text-accent dark:hover:bg-accent/10",
      danger:
        "bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:hover:bg-rose-900/40 dark:text-rose-300 dark:border-rose-800/40",
      fab:
        "bg-accent hover:bg-accent-hover text-white rounded-2xl shadow-lg hover:shadow-xl hover:scale-[1.02]",
    };

    const sizes = {
      sm: "text-xs min-h-8 px-3.5 py-1.5 gap-1.5",
      md: "text-sm min-h-10 px-5 py-2 gap-2",
      lg: "text-base min-h-12 px-7 py-3 gap-2.5 font-semibold",
      icon: "w-10 h-10 p-0",
      fab: "h-14 px-6 text-sm font-semibold gap-3",
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

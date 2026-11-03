import * as React from "react";
import { cn } from "./utils";
import { Ripple } from "./ripple";

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
      "m3-button inline-flex items-center justify-center whitespace-nowrap font-medium select-none relative overflow-hidden transition-[background-color,border-color,color,box-shadow,border-radius,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] motion-safe:active:scale-[0.97] disabled:pointer-events-none disabled:shadow-none rounded-[var(--brand-button-radius,9999px)] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-[3px] focus-visible:outline-m3-primary";

    const variants = {
      primary: "bg-m3-primary text-m3-on-primary hover:shadow-m3-1",
      secondary:
        "bg-m3-secondary-container text-m3-on-secondary-container hover:shadow-m3-1",
      ghost: "bg-transparent text-m3-primary",
      outline: "bg-transparent border border-m3-outline text-m3-primary",
      elevated:
        "bg-m3-surface-container-low text-m3-primary shadow-m3-1 hover:shadow-m3-2",
      danger: "bg-m3-error-container text-m3-on-error-container",
      fab: "bg-m3-primary-container text-m3-on-primary-container rounded-[var(--md-sys-shape-corner-large)] shadow-m3-3 hover:shadow-m3-4",
    };

    const sizes = {
      sm: "text-xs min-h-[40px] px-4 py-1.5 gap-1.5",
      md: "text-sm min-h-[40px] px-5 py-2 gap-2",
      lg: "text-base min-h-[48px] px-6 py-2.5 gap-2.5 font-semibold",
      icon: "w-10 h-10 p-0 rounded-full",
      fab: "h-14 px-6 text-sm font-semibold gap-3",
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
        <Ripple disabled={props.disabled} />
        {children}
      </button>
    );
  },
);
Button.displayName = "Button";

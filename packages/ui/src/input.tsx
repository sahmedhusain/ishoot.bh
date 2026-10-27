import * as React from "react";
import { cn } from "./utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        data-ui="text-field"
        type={type}
        className={cn(
          "flex min-h-14 w-full rounded-[var(--md-sys-shape-corner-extra-small)] bg-transparent text-m3-on-surface border border-m3-outline hover:border-m3-on-surface placeholder:text-m3-on-surface-variant focus:outline-none focus:border-m3-primary focus:ring-1 focus:ring-m3-primary px-4 py-3 text-base sm:text-sm transition-colors duration-base ease-standard disabled:opacity-[0.38] disabled:cursor-not-allowed aria-[invalid=true]:border-m3-error aria-[invalid=true]:ring-m3-error",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

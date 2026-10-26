import * as React from "react";
import { cn } from "./utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> { }

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-xl bg-white text-slate-800 border border-ink/25 hover:border-ink/40 placeholder:text-slate-400 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 dark:bg-surface dark:border-white/20 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-accent dark:focus:ring-accent/30 px-4 py-2 text-sm transition-all duration-base ease-standard disabled:opacity-50",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

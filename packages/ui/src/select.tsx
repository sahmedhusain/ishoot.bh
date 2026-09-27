import * as React from "react";
import { cn } from "./utils";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <select
        className={cn(
          "flex h-11 w-full rounded-xl bg-white text-slate-800 border border-slate-300 focus:outline-none focus:border-[#09937F] focus:ring-2 focus:ring-[#09937F]/20 dark:bg-[#121B19] dark:border-white/15 dark:text-slate-100 dark:focus:border-[#09937F] dark:focus:ring-[#09937F]/30 px-4 py-2 text-sm transition-all disabled:opacity-50 appearance-none cursor-pointer shadow-sm",
          className,
        )}
        ref={ref}
        {...props}
      >
        {children}
      </select>
    );
  },
);
Select.displayName = "Select";

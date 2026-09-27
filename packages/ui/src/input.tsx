import * as React from "react";
import { cn } from "./utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-xl bg-[#0B1210] border border-white/10 px-4 py-2 text-sm text-[#F2F6F5] placeholder:text-[#9EADA9]/60 focus:outline-none focus:border-[#09937F] focus:ring-1 focus:ring-[#09937F] transition-all disabled:opacity-50",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

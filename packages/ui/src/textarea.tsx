import * as React from "react";
import { cn } from "./utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[100px] w-full rounded-xl bg-[#0B1210] border border-white/10 px-4 py-3 text-sm text-[#F2F6F5] placeholder:text-[#9EADA9]/60 focus:outline-none focus:border-[#09937F] focus:ring-1 focus:ring-[#09937F] transition-all disabled:opacity-50 resize-y",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Textarea.displayName = "Textarea";

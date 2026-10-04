import * as React from "react";
import { cn } from "./utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[100px] w-full rounded-xl bg-white text-slate-800 border border-slate-300 placeholder:text-slate-400 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 dark:bg-[#121B19] dark:border-white/15 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-accent dark:focus:ring-accent/30 px-4 py-3 text-sm transition-all disabled:opacity-50 resize-y shadow-sm",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Textarea.displayName = "Textarea";

import * as React from "react";
import { cn } from "./utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> { }

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[100px] w-full rounded-xl bg-white text-slate-800 border border-ink/25 hover:border-ink/40 placeholder:text-slate-400 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 dark:bg-surface dark:border-white/20 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-accent dark:focus:ring-accent/30 px-4 py-3 text-sm transition-all disabled:opacity-50 resize-y",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Textarea.displayName = "Textarea";

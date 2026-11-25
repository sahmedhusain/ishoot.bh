import * as React from "react";
import { cn } from "./utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        data-ui="text-field"
        className={cn(
          "flex min-h-[100px] w-full rounded-md bg-surface text-ink border border-outline-variant hover:border-outline placeholder:text-ink-muted focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 px-3 py-2.5 text-sm transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed aria-[invalid=true]:border-rose-500 aria-[invalid=true]:ring-rose-500/20 resize-y",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Textarea.displayName = "Textarea";

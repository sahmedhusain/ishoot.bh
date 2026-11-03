import * as React from "react";
import { cn } from "./utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        data-ui="text-field"
        className={cn(
          "flex min-h-[100px] w-full rounded-[var(--md-sys-shape-corner-extra-small)] bg-transparent text-m3-on-surface border border-m3-outline hover:border-m3-on-surface placeholder:text-m3-on-surface-variant focus:outline-none focus:border-m3-primary focus:ring-1 focus:ring-m3-primary px-4 py-3 text-base sm:text-sm transition-colors duration-base ease-standard disabled:opacity-[0.38] disabled:cursor-not-allowed aria-[invalid=true]:border-m3-error aria-[invalid=true]:ring-m3-error resize-y",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Textarea.displayName = "Textarea";

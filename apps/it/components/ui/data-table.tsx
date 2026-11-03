import * as React from "react";
import { cn } from "./utils";

/** Semantic table surface. Callers retain their headers, sorting, links and empty states. */
export function DataTable({
  className,
  children,
  ...props
}: React.ComponentPropsWithoutRef<"table">) {
  return (
    <div className="max-w-full overflow-x-auto rounded-lg border border-outline-variant">
      <table
        {...props}
        className={cn(
          "w-full text-start text-sm text-ink [&_thead]:bg-surface-container [&_th]:text-start [&_th]:font-semibold [&_th]:text-ink-muted [&_th]:px-4 [&_th]:py-3 [&_td]:px-4 [&_td]:py-3 [&_tbody_tr]:border-t [&_tbody_tr]:border-outline-variant [&_tbody_tr:hover]:bg-surface-container/50",
          className,
        )}
      >
        {children}
      </table>
    </div>
  );
}

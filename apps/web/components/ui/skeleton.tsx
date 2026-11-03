import { cn } from "./utils";

/** A shimmering placeholder in the shape of the content that is loading (still with "reduce motion"). */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("skeleton rounded-lg", className)} />;
}

import { cn } from "./utils";

export function Separator({ className }: { className?: string }) {
  return <div className={cn("h-px w-full bg-m3-outline-variant/70 my-6", className)} />;
}

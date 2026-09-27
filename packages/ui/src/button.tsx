import * as React from "react";
import { cn } from "./utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "outline" | "danger" | "fab";
  size?: "sm" | "md" | "lg" | "icon" | "fab";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center justify-center font-medium transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none rounded-xl active:scale-[0.98]";

    const variants = {
      primary:
        "bg-[#014842] hover:bg-[#02665D] active:bg-[#003631] text-white shadow-sm hover:shadow-md",
      secondary:
        "bg-[#E8F5F3] hover:bg-[#D5EFEA] text-[#014842] dark:bg-[#162925] dark:hover:bg-[#1D3631] dark:text-[#64DFC9] border border-[#09937F]/20",
      ghost:
        "bg-transparent hover:bg-slate-100 text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white",
      outline:
        "bg-transparent border border-slate-300 hover:border-[#09937F] hover:bg-slate-50 text-slate-700 hover:text-[#014842] dark:border-white/20 dark:text-slate-200 dark:hover:border-[#09937F] dark:hover:bg-white/5",
      danger:
        "bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:hover:bg-rose-900/40 dark:text-rose-300 dark:border-rose-800/40",
      fab:
        "bg-[#09937F] hover:bg-[#0BB49B] text-white rounded-2xl shadow-lg hover:shadow-xl hover:scale-[1.02]",
    };

    const sizes = {
      sm: "text-xs px-3.5 py-1.5 gap-1.5",
      md: "text-sm px-5 py-2.5 gap-2",
      lg: "text-base px-7 py-3.5 gap-2.5 font-semibold",
      icon: "w-10 h-10 p-0",
      fab: "h-14 px-6 text-sm font-semibold gap-3",
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

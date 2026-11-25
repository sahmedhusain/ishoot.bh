"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "./utils";

export interface SegmentedOption<T extends string = string> {
  value: T;
  label: React.ReactNode;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface SegmentedButtonProps<T extends string = string> {
  value: T;
  onChange: (value: T) => void;
  options: readonly SegmentedOption<T>[];
  label: string;
  className?: string;
  size?: "sm" | "md";
}

export function SegmentedButton<T extends string = string>({
  value,
  onChange,
  options,
  label,
  className,
  size = "md",
}: SegmentedButtonProps<T>) {
  const name = React.useId();
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        "inline-flex max-w-full rounded-md border border-outline-variant bg-surface overflow-hidden",
        className,
      )}
    >
      {options.map((option, index) => (
        <label
          key={option.value}
          className="relative min-w-0 flex-1 cursor-pointer"
        >
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={option.value === value}
            disabled={option.disabled}
            onChange={() => onChange(option.value)}
            className="peer absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
          />
          <span
            className={cn(
              "flex min-h-9 h-full items-center justify-center gap-1.5 px-3 py-1.5 text-center font-medium text-ink transition-colors duration-150 hover:bg-surface-raised peer-checked:bg-[#0070d2]/10 peer-checked:text-[#0070d2] dark:peer-checked:bg-[#0284c7]/20 dark:peer-checked:text-sky-300 peer-checked:font-semibold peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-[-2px] peer-focus-visible:outline-primary peer-disabled:opacity-50 peer-disabled:cursor-not-allowed",
              size === "sm" ? "text-xs" : "text-sm",
              index > 0 && "border-s border-outline-variant",
            )}
          >
            <span
              aria-hidden
              className="flex h-3.5 w-3.5 shrink-0 items-center justify-center [&>svg]:h-3.5 [&>svg]:w-3.5"
            >
              {option.value === value ? <Check /> : option.icon}
            </span>
            <span>{option.label}</span>
          </span>
        </label>
      ))}
    </div>
  );
}

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
        "inline-flex max-w-full rounded-full border border-m3-outline",
        className,
      )}
    >
      {options.map((option, index) => (
        <label
          key={option.value}
          className="relative min-w-0 flex-1 cursor-pointer first:rounded-s-full last:rounded-e-full"
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
              "m3-segment flex min-h-10 h-full items-center justify-center gap-2 px-4 py-2 text-center font-medium text-m3-on-surface rounded-[inherit] transition-colors duration-base ease-standard peer-checked:bg-m3-secondary-container peer-checked:text-m3-on-secondary-container peer-focus-visible:outline peer-focus-visible:outline-[3px] peer-focus-visible:outline-offset-[3px] peer-focus-visible:outline-m3-primary peer-disabled:opacity-[0.38] peer-disabled:cursor-not-allowed",
              size === "sm" ? "text-xs" : "text-sm",
              index > 0 && "border-s border-m3-outline",
            )}
          >
            <span
              aria-hidden
              className="flex h-4 w-4 shrink-0 items-center justify-center [&>svg]:h-4 [&>svg]:w-4"
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

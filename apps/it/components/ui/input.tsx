"use client";

import * as React from "react";
import { cn } from "./utils";
import { useUiCopy } from "./copy/use-ui-copy";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const STRICT_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, dir, onChange, onBlur, ...props }, forwardedRef) => {
    const copy = useUiCopy();
    const innerRef = React.useRef<HTMLInputElement>(null);
    React.useImperativeHandle(forwardedRef, () => innerRef.current!);
    const isEmail = type === "email";
    const isTel = type === "tel";
    const resolvedDir = dir ?? (isEmail || isTel ? "ltr" : undefined);

    const validateEmailElement = React.useCallback(
      (el: HTMLInputElement | null) => {
        if (!el || !isEmail) return;
        const val = el.value.trim();
        if (val && !STRICT_EMAIL_PATTERN.test(val)) {
          el.setCustomValidity((copy as Record<string, string>).invalidEmail ?? "Enter a valid email address.");
        } else {
          el.setCustomValidity("");
        }
      },
      [isEmail, copy],
    );

    React.useEffect(() => {
      validateEmailElement(innerRef.current);
    }, [props.value, props.defaultValue, validateEmailElement]);

    return (
      <input
        data-ui="text-field"
        type={type}
        dir={resolvedDir}
        className={cn(
          "flex min-h-9 w-full rounded-md bg-surface text-ink border border-outline-variant hover:border-outline placeholder:text-ink-muted focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 px-3 py-2 text-sm transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed aria-[invalid=true]:border-rose-500 aria-[invalid=true]:ring-rose-500/20",
          (isEmail || isTel) && "text-start",
          className,
        )}
        ref={innerRef}
        onChange={(e) => {
          if (isEmail) validateEmailElement(e.currentTarget);
          onChange?.(e);
        }}
        onBlur={(e) => {
          if (isEmail) validateEmailElement(e.currentTarget);
          onBlur?.(e);
        }}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

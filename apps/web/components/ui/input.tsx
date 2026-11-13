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
          el.setCustomValidity((copy as Record<string, string>).invalidEmail);
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
          "flex min-h-12 w-full rounded-[var(--admin-field-radius,var(--md-sys-shape-corner-extra-small,8px))] bg-transparent text-m3-on-surface border border-m3-outline hover:border-m3-on-surface placeholder:text-m3-on-surface-variant focus:outline-none focus:border-m3-primary focus:ring-1 focus:ring-m3-primary px-3.5 py-2.5 text-base sm:text-sm transition-colors duration-base ease-standard disabled:opacity-[0.38] disabled:cursor-not-allowed aria-[invalid=true]:border-m3-error aria-[invalid=true]:ring-m3-error",
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

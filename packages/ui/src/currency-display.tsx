"use client";
import { useEffect, useRef, useState } from "react";
import {
  getCurrencySymbol,
  getCurrencyDecimals,
} from "@ishoot/config/currency";
export { CURRENCY_SYMBOLS } from "@ishoot/config/currency";

export interface CurrencyDisplayProps {
  amount: number | string;
  currency?: string;
  locale?: string;
  className?: string;
}

export function formatCurrencyValue(
  amount: number | string,
  currency: string = "BHD",
  _isAr: boolean = false,
  unicode: boolean = true,
): string {
  const num = typeof amount === "number" ? amount : parseFloat(amount) || 0;
  const code = currency.trim().toUpperCase();
  const decimals = getCurrencyDecimals(code);
  const formattedNum = num.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  const symbol = getCurrencySymbol(code, unicode);
  return `${formattedNum} ${symbol}`;
}

export function CurrencyDisplay({
  amount,
  currency = "BHD",
  locale = "en",
  className = "",
}: CurrencyDisplayProps) {
  const isAr = locale === "ar";
  const element = useRef<HTMLSpanElement>(null);
  const [unicode, setUnicode] = useState(true);
  useEffect(() => {
    let cancelled = false;
    setUnicode(true);
    const symbol = getCurrencySymbol(currency);
    // New currency signs may precede the operating system's font coverage.
    if (!/[\u20c0-\u20c4]/.test(symbol)) return;
    void document.fonts.ready.then(() => {
      if (cancelled || !element.current) return;
      const canvas = document.createElement("canvas");
      canvas.width = 48;
      canvas.height = 48;
      const context = canvas.getContext("2d");
      if (!context) return;
      context.font = `24px ${getComputedStyle(element.current).fontFamily}`;
      const pixels = (text: string) => {
        context.clearRect(0, 0, 48, 48);
        context.fillText(text, 4, 32);
        return context.getImageData(0, 0, 48, 48).data;
      };
      const actual = pixels(symbol);
      const missing = pixels("\uffff");
      setUnicode(actual.some((pixel, i) => pixel !== missing[i]));
    });
    return () => {
      cancelled = true;
    };
  }, [currency]);
  return (
    <span
      ref={element}
      dir="ltr"
      title={currency.toUpperCase()}
      className={`font-mono font-medium tabular-nums ${className}`}
    >
      {formatCurrencyValue(amount, currency, isAr, unicode)}
    </span>
  );
}

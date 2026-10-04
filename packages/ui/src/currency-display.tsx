
export interface CurrencyDisplayProps {
  amount: number | string;
  currency?: string;
  locale?: string;
  className?: string;
}

export function formatCurrencyValue(
  amount: number | string,
  currency: string = "BHD",
  isAr: boolean = false,
): string {
  const num = typeof amount === "number" ? amount : parseFloat(amount) || 0;
  const decimals =
    currency === "BHD" || currency === "KWD" || currency === "OMR" ? 3 : 2;

  const formattedNum = num.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  const symbols: Record<string, { en: string; ar: string }> = {
    BHD: { en: "BHD", ar: "د.ب" },
    SAR: { en: "SAR", ar: "ر.س" },
    AED: { en: "AED", ar: "د.إ" },
    KWD: { en: "KWD", ar: "د.ك" },
    OMR: { en: "OMR", ar: "ر.ع" },
    QAR: { en: "QAR", ar: "ر.ق" },
    USD: { en: "USD", ar: "$" },
  };

  const symbol = symbols[currency]
    ? isAr
      ? symbols[currency].ar
      : symbols[currency].en
    : currency;
  return `${formattedNum} ${symbol}`;
}

export function CurrencyDisplay({
  amount,
  currency = "BHD",
  locale = "en",
  className = "",
}: CurrencyDisplayProps) {
  const isAr = locale === "ar";
  return (
    <span className={`font-mono font-medium tabular-nums ${className}`}>
      {formatCurrencyValue(amount, currency, isAr)}
    </span>
  );
}

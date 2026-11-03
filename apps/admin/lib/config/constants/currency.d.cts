export const CURRENCY_SYMBOLS: Record<string, string>;
export function getCurrencySymbol(code: string, unicode?: boolean): string;
export function getCurrencyDecimals(code: string): number;
export const ARABIC_CURRENCY_LABELS: Record<string, string>;
export function getCurrencyLabel(
  code: string,
  isArabic?: boolean,
  unicode?: boolean,
): string;

export const CURRENCY_CODES: readonly string[];
export function isCurrencyCode(code: unknown): code is string;

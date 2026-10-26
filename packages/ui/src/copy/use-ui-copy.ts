"use client";
import { useCurrencyLocale } from "../currency-display";
import en from "@platform/locales/ui/en";
import ar from "@platform/locales/ui/ar";
export function useUiCopy() {
  return useCurrencyLocale().startsWith("ar") ? ar : en;
}

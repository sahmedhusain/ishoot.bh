"use client";
import { useCurrencyLocale } from "../currency-display";
import en from "./en.json";
import ar from "./ar.json";
export function useUiCopy() {
  return useCurrencyLocale().startsWith("ar") ? ar : en;
}

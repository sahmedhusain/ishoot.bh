"use client";
import { useCurrencyLocale } from "../currency-display";
import { getUiTranslations } from "@platform/locales/additional";
export function useUiCopy() { return getUiTranslations(useCurrencyLocale()); }

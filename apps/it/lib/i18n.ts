// The interface language: the person's choice (cookie), else the configured default. Arabic and English.
import { cookies } from "next/headers";
import en from "../locales/en";
import ar from "../locales/ar";
import { config } from "./config";

export type Copy = typeof en;
export type ItLocale = "en" | "ar";

export async function getLocale(): Promise<ItLocale> {
  const saved = (await cookies()).get(config.localeCookie())?.value;
  if (saved === "en" || saved === "ar") return saved;
  return config.defaultLocale() === "en" ? "en" : "ar";
}

export const copyFor = (locale: ItLocale): Copy => (locale === "ar" ? ar : en);

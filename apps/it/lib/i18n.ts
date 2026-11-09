
import en from "../locales/en.json";

export type Copy = typeof en;
export type ItLocale = "en" | "ar";

export async function getLocale(): Promise<ItLocale> {
  return "en";
}

export const copyFor = (_locale?: string): Copy => en;

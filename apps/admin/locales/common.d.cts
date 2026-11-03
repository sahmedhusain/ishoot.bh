import type commonEnglish from "./common/en.json";
import type bindings from "./common-bindings.json";

export type CommonTranslations = typeof commonEnglish;
type BoundCopy<T> = { [K in keyof T]: T[K] extends string ? string : BoundCopy<T[K]> };
export const commonEn: CommonTranslations;
export const commonAr: CommonTranslations;
export function resolveCommonTranslations(locale: string, overrides?: unknown): CommonTranslations;
export function withCommonCopy<T, N extends keyof typeof bindings>(
  dictionary: T,
  scope: N,
  common: CommonTranslations,
): T & BoundCopy<(typeof bindings)[N]>;

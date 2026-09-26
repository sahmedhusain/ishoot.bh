export const defaultLocale = 'ar';
export const locales = ['en', 'ar'] as const;
export type Locale = (typeof locales)[number];

export function isValidLocale(locale: string): locale is Locale {
  return locales.includes(locale as Locale);
}

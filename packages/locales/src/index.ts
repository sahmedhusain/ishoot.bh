import en from './en.json';
import ar from './ar.json';

export type Locale = 'en' | 'ar';
export type TranslationKeys = typeof en;

const translations: Record<Locale, TranslationKeys> = { en, ar };

export function getTranslations(locale: Locale): TranslationKeys {
  return translations[locale] || translations.en;
}

// Dot notation nested key resolver
export function getNestedTranslation(obj: any, path: string): string {
  if (!obj || !path) return '';
  const keys = path.split('.');
  let current: any = obj;
  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = current[key];
    } else {
      return path;
    }
  }
  return current !== undefined ? current : path;
}

export { en, ar };

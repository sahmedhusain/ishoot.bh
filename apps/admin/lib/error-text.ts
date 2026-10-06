import { adminTranslations } from "./translations-bilingual";

type Translations = (typeof adminTranslations)["en"];

/** English message → key, and templated messages as patterns (built once). */
let index: { exact: Map<string, string>; patterns: Array<{ key: string; re: RegExp }> } | null = null;
function buildIndex() {
  const { messages, templates } = adminTranslations.en.serverErrors;
  const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return {
    exact: new Map(Object.entries(messages).map(([key, text]) => [text as string, key])),
    // Most specific first: "Invalid input for {0}" must win over "Invalid {0}".
    patterns: Object.entries(templates)
      .sort(([, a], [, b]) => (b as string).replace(/\{\d+\}/g, "").length - (a as string).replace(/\{\d+\}/g, "").length)
      .map(([key, text]) => ({
        key,
        re: new RegExp(`^${escape(text as string).replace(/\\\{\d+\\\}/g, "(.+?)")}$`),
      })),
  };
}

/**
 * The message to show for a failed action, in the interface language. Server messages are written
 * in English; known ones are translated (status words included), anything else falls back to the
 * caller's localized message so Arabic screens never show English text.
 */
export function errorMessage(error: unknown, t: Translations, fallback?: string): string {
  const message = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  const errors = t.serverErrors;
  index ??= buildIndex();
  const exactKey = index.exact.get(message.trim());
  if (exactKey) return (errors.messages as Record<string, string>)[exactKey] ?? message;
  for (const { key, re } of index.patterns) {
    const match = re.exec(message.trim());
    if (!match) continue;
    const statuses = t.statusLabels as Record<string, string>;
    return ((errors.templates as Record<string, string>)[key] ?? "").replace(/\{(\d+)\}/g, (_, n) => {
      const value = match[Number(n) + 1] ?? "";
      return statuses[value] ?? value;
    });
  }
  // Already in the interface language (e.g. validation written in Arabic), or an English UI.
  const isArabicUi = t === (adminTranslations.ar as unknown as Translations);
  if (message && (!isArabicUi || /[؀-ۿ]/.test(message))) return message;
  return fallback ?? errors.generic;
}

import { adminTranslations } from "./translations-bilingual";

type Translations = (typeof adminTranslations)["en"];

let index: {
  exact: Map<string, string>;
  patterns: Array<{ key: string; re: RegExp }>;
} | null = null;
function buildIndex() {
  const { messages, templates } = adminTranslations.en.serverErrors;
  const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return {
    exact: new Map(
      Object.entries(messages).map(([key, text]) => [text as string, key]),
    ),
    patterns: Object.entries(templates)
      .sort(
        ([, a], [, b]) =>
          (b as string).replace(/\{\d+\}/g, "").length -
          (a as string).replace(/\{\d+\}/g, "").length,
      )
      .map(([key, text]) => ({
        key,
        re: new RegExp(
          `^${escape(text as string).replace(/\\\{\d+\\\}/g, "(.+?)")}$`,
        ),
      })),
  };
}

export function errorMessage(
  error: unknown,
  t: Translations,
  fallback?: string,
): string {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";
  const errors = t.serverErrors;
  const digest =
    error instanceof Error && "digest" in error ? error.digest : undefined;
  if (typeof digest === "string" && digest.startsWith("platform:")) {
    const key = digest.slice("platform:".length);
    if (Object.hasOwn(errors.messages, key))
      return (errors.messages as Record<string, string>)[key];
  }
  index ??= buildIndex();
  const exactKey = index.exact.get(message.trim());
  if (exactKey)
    return (errors.messages as Record<string, string>)[exactKey] ?? message;
  for (const { key, re } of index.patterns) {
    const match = re.exec(message.trim());
    if (!match) continue;
    const statuses = t.statusLabels as Record<string, string>;
    return ((errors.templates as Record<string, string>)[key] ?? "").replace(
      /\{(\d+)\}/g,
      (_, n) => {
        const value = match[Number(n) + 1] ?? "";
        return statuses[value] ?? value;
      },
    );
  }
  const isArabicUi =
    errors.generic === adminTranslations.ar.serverErrors.generic;
  if (message && (!isArabicUi || /[؀-ۿ]/.test(message))) return message;
  return fallback ?? errors.generic;
}

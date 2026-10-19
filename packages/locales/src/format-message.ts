export type MessageValues = Record<
  string,
  string | number | boolean | null | undefined
>;

/** Named values are substituted once, globally; inserted text is never parsed as another template. */
export function formatMessage(template: string, values: MessageValues): string {
  return template.replace(/\{([A-Za-z0-9_]+)\}/g, (_match, key: string) => {
    if (!Object.prototype.hasOwnProperty.call(values, key))
      throw new Error(`Missing message value: ${key}`);
    return values[key] == null ? "" : String(values[key]);
  });
}

export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends readonly unknown[]
    ? T[K]
    : T[K] extends object
      ? DeepPartial<T[K]>
      : T[K];
};

export function deepMerge<T>(
  base: T,
  ...layers: (DeepPartial<T> | undefined)[]
): T {
  const out = { ...base } as Record<string, unknown>;
  for (const layer of layers) {
    if (!layer) continue;
    for (const [key, value] of Object.entries(layer)) {
      if (value === undefined || value === "") continue;
      const current = out[key];
      out[key] =
        value &&
        typeof value === "object" &&
        !Array.isArray(value) &&
        current &&
        typeof current === "object" &&
        !Array.isArray(current)
          ? deepMerge(current, value as never)
          : value;
    }
  }
  return out as T;
}

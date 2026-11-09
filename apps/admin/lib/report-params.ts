export function reportPeriod(
  query: { from?: string | null; to?: string | null },
  now = new Date(),
) {
  const valid = (v: string | null | undefined) =>
    v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : "";
  const today = now.toISOString().slice(0, 10);
  let from = valid(query.from) || `${today.slice(0, 8)}01`;
  let to = valid(query.to) || today;
  if (from > to) [from, to] = [to, from];
  return { from, to };
}

/** Quantities are exact to six decimal places. Identity counts are always whole units. */
const SCALE = BigInt(1_000_000);
export function quantityUnits(value: string): bigint {
  if (!/^\d{1,8}(?:\.\d{1,6})?$/.test(value))
    throw new Error("Invalid stock quantity");
  const [whole, fraction = ""] = value.split(".");
  return BigInt(whole) * SCALE + BigInt(fraction.padEnd(6, "0"));
}
export function convertPackagingQuantity(
  quantity: string,
  factor: string,
  indivisible: boolean,
): string {
  const entered = quantityUnits(quantity),
    conversion = quantityUnits(factor);
  if (
    entered <= BigInt(0) ||
    conversion <= BigInt(0) ||
    (indivisible && entered % SCALE !== BigInt(0))
  )
    throw new Error("Invalid packaging quantity");
  const product = entered * conversion;
  if (product % SCALE !== BigInt(0))
    throw new Error("Packaging conversion loses stock precision");
  const units = product / SCALE;
  if (units > BigInt(99_999_999) * SCALE)
    throw new Error("Stock quantity is too large");
  return `${units / SCALE}.${String(units % SCALE).padStart(6, "0")}`;
}
export interface SerialRange {
  prefix: string;
  start: string;
  end: string;
}
/** Expand only a declared fixed-width numeric range; actual membership still needs validation. */
export function expandSerialRange(input: SerialRange, limit = 1000): string[] {
  if (
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 10000 ||
    !/^[A-Za-z0-9._-]{0,40}$/.test(input.prefix) ||
    !/^\d{1,18}$/.test(input.start) ||
    !/^\d{1,18}$/.test(input.end) ||
    input.start.length !== input.end.length
  )
    throw new Error("Invalid serial range");
  const start = BigInt(input.start),
    end = BigInt(input.end),
    length = end - start + BigInt(1);
  if (length <= BigInt(0) || length > BigInt(limit))
    throw new Error("Serial range exceeds the permitted quantity");
  return Array.from(
    { length: Number(length) },
    (_, index) =>
      `${input.prefix}${String(start + BigInt(index)).padStart(input.start.length, "0")}`,
  );
}
export function uniqueSerials(values: string[]): string[] {
  if (!values.length || values.length > 10000)
    throw new Error("Invalid serial quantity");
  const normalized = values.map((value) => value.trim());
  if (
    normalized.some((value) => !/^[A-Za-z0-9._/-]{1,100}$/.test(value)) ||
    new Set(normalized).size !== normalized.length
  )
    throw new Error("Duplicate or invalid serial identifier");
  return normalized;
}
export function compareSerialManifest(expected: string[], scanned: string[]) {
  const wanted = new Set(uniqueSerials(expected));
  const found = new Set(scanned.length ? uniqueSerials(scanned) : []);
  return {
    missing: Array.from(wanted).filter((code) => !found.has(code)),
    unexpected: Array.from(found).filter((code) => !wanted.has(code)),
  };
}
export function assertPackageParent(
  packageId: string,
  parentId: string | null,
  parents: ReadonlyMap<string, string | null>,
) {
  const seen = new Set([packageId]);
  let current = parentId;
  while (current) {
    if (seen.has(current))
      throw new Error("Package nesting cannot contain a cycle");
    if (!parents.has(current)) throw new Error("Package parent does not exist");
    seen.add(current);
    current = parents.get(current) ?? null;
  }
}
export interface StockLabelTemplate {
  widthMm: number;
  heightMm: number;
  gapMm: number;
  copies: number;
}
export function validateStockLabelTemplate(
  template: StockLabelTemplate,
): StockLabelTemplate {
  if (
    ![template.widthMm, template.heightMm, template.gapMm].every(
      Number.isFinite,
    ) ||
    template.widthMm < 25 ||
    template.widthMm > 210 ||
    template.heightMm < 15 ||
    template.heightMm > 297 ||
    template.gapMm < 0 ||
    template.gapMm > 20 ||
    !Number.isInteger(template.copies) ||
    template.copies < 1 ||
    template.copies > 10
  )
    throw new Error("Invalid label dimensions or copy count");
  return template;
}
/** Wall-clock business date in the branch timezone, including shifts across midnight/DST. */
export function branchBusinessDate(
  at: Date,
  timeZone: string,
  startMinute: number,
): string {
  if (
    !Number.isInteger(startMinute) ||
    startMinute < 0 ||
    startMinute > 1439 ||
    !Number.isFinite(at.getTime())
  )
    throw new Error("Invalid business-day boundary");
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(at)
      .map((part) => [part.type, part.value]),
  );
  const day = new Date(`${parts.year}-${parts.month}-${parts.day}T00:00:00Z`);
  if (Number(parts.hour) * 60 + Number(parts.minute) < startMinute)
    day.setUTCDate(day.getUTCDate() - 1);
  return day.toISOString().slice(0, 10);
}

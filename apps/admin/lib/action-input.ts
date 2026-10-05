import contracts from "./action-schemas.json";
import { safeWebsiteUrl } from "@ishoot/database/website-config";
type Schema = {
  kind: string;
  optional?: boolean;
  fields?: Record<string, Schema>;
  element?: Schema;
  variants?: Schema[];
  value?: unknown;
};
function valid(
  value: unknown,
  schema: Schema,
  key: string,
  depth = 0,
): boolean {
  if (value === undefined) return schema.optional === true;
  if (depth > 12) return false;
  if (schema.kind === "union")
    return schema.variants!.some((s) => valid(value, s, key, depth + 1));
  if (schema.kind === "literal") return value === schema.value;
  if (schema.kind === "unknown") return true; // WebsiteConfig is separately parsed by validateWebsiteConfig.
  if (schema.kind === "array")
    return (
      Array.isArray(value) &&
      value.length <= 200 &&
      value.every((v) => valid(v, schema.element!, key, depth + 1))
    );
  if (schema.kind === "record") {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    const entries = Object.entries(value);
    return entries.length <= 500 && entries.every(([field, entry]) =>
      !["__proto__", "constructor", "prototype"].includes(field) && valid(entry, schema.element!, field, depth + 1));
  }
  if (schema.kind === "object") {
    if (
      !value ||
      typeof value !== "object" ||
      Array.isArray(value) ||
      (Object.getPrototypeOf(value) !== null &&
        Object.getPrototypeOf(Object.getPrototypeOf(value)) !== null)
    )
      return false;
    const fields = schema.fields!;
    if (Object.keys(value).some((field) => !Object.hasOwn(fields, field)))
      return false;
    return Object.entries(fields).every(([field, shape]) =>
      valid((value as Record<string, unknown>)[field], shape, field, depth + 1),
    );
  }
  if (schema.kind === "boolean") return typeof value === "boolean";
  if (schema.kind === "number") {
    if (
      typeof value !== "number" ||
      !Number.isFinite(value) ||
      Math.abs(value) > 1e9
    )
      return false;
    if (/^(amount|quantity)$/.test(key) && value <= 0) return false;
    if (
      /^(basicSalary|housingAllowance|transportAllowance|otherAllowances|value|unit_price|line_total|default_rate|discount_value|fileSize|file_size)$/.test(
        key,
      ) &&
      value < 0
    )
      return false;
    if (
      /^(probability|vat_percentage)$/.test(key) &&
      (value < 0 || value > 100)
    )
      return false;
    if (
      /^(rating)$/.test(key) &&
      (!Number.isInteger(value) || value < 1 || value > 5)
    )
      return false;
    if (
      /^(revision|display_order|sortOrder|fileSize|file_size|year|currency_decimals|invoice_next_number|receipt_next_number|payment_terms_days)$/.test(
        key,
      ) &&
      !Number.isInteger(value)
    )
      return false;
    return true;
  }
  if (schema.kind === "string") {
    if (
      typeof value !== "string" ||
      value.length > 20000 ||
      value.includes("\u0000")
    )
      return false;
    if (
      /^(id|assetKey|moduleKey|role)$|(?:_id|Id)$/.test(key) &&
      ((schema.optional !== true && !value.trim()) || value.length > 150)
    )
      return false;
    if (
      /^(full_name|fullName|first_name|title|title_en|titleEn|company_name_en|company_name_ar)$/.test(
        key,
      ) &&
      !value.trim()
    )
      return false;
    if (
      /email$/i.test(key) &&
      value &&
      (value.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
    )
      return false;
    if (/(?:_url|Url)$/.test(key) || /^(url|website|cta_link)$/.test(key)) {
      if (value && !safeWebsiteUrl(value)) return false;
    }
    if (
      /^(meetingDate|dueDate|start_date|end_date|issue_date|due_date|shoot_date|target_close_date|expense_date|payment_date|valid_from|valid_until)$/.test(
        key,
      ) &&
      value &&
      !Number.isFinite(Date.parse(value))
    )
      return false;
    return true;
  }
  return false;
}
export function validateActionArguments(
  name: keyof typeof contracts,
  values: Record<string, unknown>,
) {
  let bytes: number;
  try {
    bytes = Buffer.byteLength(JSON.stringify(values));
  } catch {
    throw new Error("Invalid action input");
  }
  if (bytes > 250000 || !valid(values, contracts[name] as Schema, name))
    throw new Error(`Invalid input for ${name}`);
}

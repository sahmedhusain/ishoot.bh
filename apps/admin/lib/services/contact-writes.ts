import { serverMessages } from "@platform/locales";
import { formatPhoneE164 } from "../constants/phone";
import { isValidEmail, normalizeEmail } from "../constants/validation";

type ModelField = { name: string; kind: string; type: string };
export type ContactModels = ReadonlyMap<string, readonly ModelField[]>;
const emailField = /^(?:email|emailNorm)$|Email$/;
const phoneField = /^(?:phone|phoneE164|mobile|whatsappPhone)$|(?:Phone|Mobile|PhoneNumber)$/;

export async function normalizeContactWrites(models: ContactModels, model: string, input: unknown, getCountry: () => Promise<string>): Promise<void> {
  if (Array.isArray(input)) {
    for (const row of input) await normalizeContactWrites(models, model, row, getCountry);
    return;
  }
  if (!input || typeof input !== "object") return;
  const data = input as Record<string, unknown>;
  for (const field of models.get(model) ?? []) {
    const value = data[field.name];
    if (field.kind === "scalar" && field.type === "String" && (emailField.test(field.name) || phoneField.test(field.name))) {
      const holder = value && typeof value === "object" && "set" in value ? value as Record<string, unknown> : data;
      const key = holder === data ? field.name : "set";
      const raw = holder[key];
      if (typeof raw !== "string" || !raw.trim()) continue;
      if (emailField.test(field.name)) {
        if (!isValidEmail(raw)) throw new Error(serverMessages.customerEmailInvalid);
        holder[key] = normalizeEmail(raw);
      } else {
        const phone = formatPhoneE164(raw) || formatPhoneE164(raw, undefined, await getCountry());
        if (!phone) throw new Error(serverMessages.invalidPhoneNumber);
        holder[key] = phone;
      }
    } else if (field.kind === "object" && value && typeof value === "object") {
      const relation = value as Record<string, unknown>;
      for (const operation of ["create", "update", "upsert", "connectOrCreate", "createMany", "updateMany"]) {
        const writes = relation[operation];
        for (const row of Array.isArray(writes) ? writes : [writes]) {
          if (!row || typeof row !== "object") continue;
          if (operation === "upsert" || operation === "connectOrCreate") {
            await normalizeContactWrites(models, field.type, row.create, getCountry);
            await normalizeContactWrites(models, field.type, row.update, getCountry);
          } else await normalizeContactWrites(models, field.type, row.data ?? row, getCountry);
        }
      }
    }
  }
}

"use server";
import { revalidatePath } from "next/cache";
import { serverMessages } from "@platform/locales";
import { getCurrencyDecimals } from "@platform/config/currency";
import {
  completeCompanySetup,
  createActivityLog,
  db,
  ensureDefaultFeatureModules,
  measureOperation,
  runAtomicMutation,
  updateCompanySettings,
  updateCompanyTheme,
  updateFeatureToggle,
} from "@platform/database";
import type { SupportedCurrency } from "@platform/database/types";
import type { BrandTheme } from "@platform/database/constants/theme";
import { requirePermission } from "../../lib/auth";
import { validateActionArguments } from "../../lib/action-input";

/** Step 1: who the company is. */
export interface SetupCompanyInput {
  companyNameEn: string;
  companyNameAr: string;
  crNumber?: string;
  vatId?: string;
  addressEn?: string;
  addressAr?: string;
  phone?: string;
  email?: string;
  website?: string;
}

export interface SetupModuleChoice {
  moduleKey: string;
  isEnabled: boolean;
}

/** Step 4: how the company works (currency, tax, document numbers, modules). */
export interface SetupConfigInput {
  defaultCurrency: SupportedCurrency;
  vatEnabled: boolean;
  vatPercentage: number;
  invoicePrefix: string;
  invoiceNextNumber: number;
  receiptPrefix: string;
  receiptNextNumber: number;
  paymentTermsDays: number;
  modules: SetupModuleChoice[];
}

const PREFIX = /^[A-Z0-9-]{1,10}$/;

function revalidateEverywhere() {
  revalidatePath("/", "layout");
}

export async function saveSetupCompanyAction(input: SetupCompanyInput) {
  return measureOperation("action:saveSetupCompanyAction", async () => {
    const user = await requirePermission("settings", "write");
    validateActionArguments("saveSetupCompanyAction", { input });
    const trim = (value?: string) => value?.trim() ?? "";
    await runAtomicMutation(async () => {
      await updateCompanySettings({
        company_name_en: trim(input.companyNameEn),
        company_name_ar: trim(input.companyNameAr),
        cr_number: trim(input.crNumber),
        vat_id: trim(input.vatId),
        address_en: trim(input.addressEn),
        address_ar: trim(input.addressAr),
        phone: trim(input.phone),
        email: trim(input.email),
        website: trim(input.website),
      });
      await createActivityLog({ user_id: user.id, action: "update", entity_type: "settings", entity_id: "setup", details: { step: "company" } });
    });
    revalidateEverywhere();
    return { success: true };
  });
}

export async function saveSetupThemeAction(theme: BrandTheme) {
  return measureOperation("action:saveSetupThemeAction", async () => {
    const user = await requirePermission("settings", "write");
    validateActionArguments("saveSetupThemeAction", { theme });
    const saved = await runAtomicMutation(async () => {
      const company = await updateCompanyTheme(theme);
      await createActivityLog({ user_id: user.id, action: "update", entity_type: "settings", entity_id: "theme", details: { primary: company.theme.primary, accent: company.theme.accent } });
      return company.theme;
    });
    revalidateEverywhere();
    return { success: true, theme: saved };
  });
}

export async function saveSetupConfigAction(input: SetupConfigInput) {
  return measureOperation("action:saveSetupConfigAction", async () => {
    const user = await requirePermission("settings", "write");
    validateActionArguments("saveSetupConfigAction", { input });
    const invoicePrefix = input.invoicePrefix.trim().toUpperCase();
    const receiptPrefix = input.receiptPrefix.trim().toUpperCase();
    if (!PREFIX.test(invoicePrefix) || !PREFIX.test(receiptPrefix)) throw new Error(serverMessages.setupPrefixInvalid);
    if (!(input.vatPercentage >= 0 && input.vatPercentage <= 100)) throw new Error(serverMessages.setupVatInvalid);
    if (!Number.isInteger(input.paymentTermsDays) || input.paymentTermsDays < 0 || input.paymentTermsDays > 365) throw new Error(serverMessages.setupPaymentTermsInvalid);
    await runAtomicMutation(async () => {
      await updateCompanySettings({
        default_currency: input.defaultCurrency,
        currency_decimals: getCurrencyDecimals(input.defaultCurrency),
        vat_enabled: input.vatEnabled,
        vat_percentage: input.vatPercentage,
        invoice_prefix: invoicePrefix,
        invoice_next_number: input.invoiceNextNumber,
        receipt_prefix: receiptPrefix,
        receipt_next_number: input.receiptNextNumber,
        payment_terms_days: input.paymentTermsDays,
      });
      const known = new Set((await ensureDefaultFeatureModules()).map((m) => m.moduleKey));
      for (const choice of input.modules) if (known.has(choice.moduleKey)) await updateFeatureToggle(choice.moduleKey, choice.isEnabled);
      await createActivityLog({ user_id: user.id, action: "update", entity_type: "settings", entity_id: "setup", details: { step: "configuration" } });
    });
    revalidateEverywhere();
    return { success: true };
  });
}

export async function completeSetupAction() {
  return measureOperation("action:completeSetupAction", async () => {
    const user = await requirePermission("settings", "write");
    validateActionArguments("completeSetupAction", {});
    await runAtomicMutation(async () => {
      const company = await db.companySetting.findUniqueOrThrow({ where: { singleton: 1 }, select: { logoUrl: true, darkLogoUrl: true } });
      if (!company.logoUrl && !company.darkLogoUrl) throw new Error(serverMessages.setupLogoRequired);
      await completeCompanySetup();
      await createActivityLog({ user_id: user.id, action: "update", entity_type: "settings", entity_id: "setup", details: { step: "complete" } });
    });
    revalidateEverywhere();
    return { success: true };
  });
}

"use server";
import { revalidatePath } from "next/cache";
import { createHmac } from "node:crypto";
import { serverMessages } from "@platform/locales";
import { getCurrencyDecimals } from "@platform/config/currency";
import {
  applyActivityDealPipeline,
  applyActivityDepartments,
  completeCompanySetup,
  createActivityLog,
  db,
  ensureDefaultFeatureModules,
  getCompanySettings,
  getWebsiteEditor,
  isFeatureEnabled,
  measureOperation,
  runAtomicMutation,
  updateCompanySettings,
  updateCompanyTheme,
  updateFeatureToggle,
} from "@platform/database";
import type { SupportedCurrency } from "@platform/database/types";
import {
  mirrorBilingual,
  normalizeLanguages,
  normalizePrimaryLanguage,
} from "@platform/database/constants/languages";
import {
  isBusinessActivity,
  type BusinessActivity,
} from "@platform/database/website-presets";
import { isDepartmentKey } from "@platform/database/constants/departments";
import {
  safeWebsiteUrl,
  validateWebsiteConfig,
  type WebsiteConfig,
} from "@platform/database/website-config";
import { publishWebsiteAction } from "./website";
import { revalidatePublicSite } from "../../lib/revalidate-web";
import { publicSitePaths } from "../../lib/public-paths";
import type { BrandTheme } from "@platform/database/constants/theme";
import { requirePermission } from "../../lib/auth";
import { validateActionArguments } from "../../lib/action-input";

/** Step 1: who the company is, what it does and which languages it writes in. */
export interface SetupCompanyInput {
  /** "ar", "en" or both. */
  contentLanguages: string[];
  primaryLanguage: string;
  /** website-presets.ts BUSINESS_ACTIVITIES */
  businessActivity: string;
  companyNameEn: string;
  companyNameAr: string;
  taglineEn?: string;
  taglineAr?: string;
  foundedYear?: string;
  city?: string;
  country?: string;
  whatsappPhone?: string;
  instagramUrl?: string;
  linkedinUrl?: string;
  youtubeUrl?: string;
  mapUrl?: string;
  crNumber?: string;
  vatId?: string;
  addressEn?: string;
  addressAr?: string;
  phone?: string;
  email?: string;
  website?: string;
}

interface SetupModuleChoice {
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
  /** Catalogue departments to create (existing ones are kept; nothing is removed). */
  departments: string[];
}

const PREFIX = /^[A-Z0-9-]{1,10}$/;

function revalidateEverywhere() {
  revalidatePath("/", "layout");
}

/** Languages, names and the website switch show on the public site straight away. */
async function refreshPublicSite() {
  await revalidatePublicSite(
    ["website", "company"],
    ["/en", "/ar", ...(await publicSitePaths())],
  );
}

export async function saveSetupCompanyAction(input: SetupCompanyInput) {
  return measureOperation("action:saveSetupCompanyAction", async () => {
    const user = await requirePermission("settings", "write");
    validateActionArguments("saveSetupCompanyAction", { input });
    const trim = (value?: string) => value?.trim() ?? "";
    if (!isBusinessActivity(input.businessActivity))
      throw new Error(serverMessages.businessActivityInvalid);
    const languages = normalizeLanguages(input.contentLanguages);
    if (
      !input.contentLanguages.length ||
      languages.length !== new Set(input.contentLanguages).size
    )
      throw new Error(serverMessages.contentLanguagesInvalid);
    const year = trim(input.foundedYear);
    const url = (value?: string) =>
      trim(value) ? safeWebsiteUrl(trim(value)) || trim(value) : "";
    const previousActivity = (await getCompanySettings()).business_activity;
    await runAtomicMutation(async () => {
      await updateCompanySettings({
        content_languages: languages,
        primary_language: normalizePrimaryLanguage(
          input.primaryLanguage,
          languages,
        ),
        business_activity: input.businessActivity as BusinessActivity,
        company_name_en: trim(input.companyNameEn),
        company_name_ar: trim(input.companyNameAr),
        tagline_en: trim(input.taglineEn),
        tagline_ar: trim(input.taglineAr),
        founded_year: year ? Number(year) : null,
        city: trim(input.city),
        country: trim(input.country),
        whatsapp_phone: trim(input.whatsappPhone),
        instagram_url: url(input.instagramUrl),
        linkedin_url: url(input.linkedinUrl),
        youtube_url: url(input.youtubeUrl),
        map_url: trim(input.mapUrl),
        cr_number: trim(input.crNumber),
        vat_id: trim(input.vatId),
        address_en: trim(input.addressEn),
        address_ar: trim(input.addressAr),
        phone: trim(input.phone),
        email: trim(input.email),
        website: trim(input.website),
      });
      // A new activity brings its own sales pipeline; stages that hold deals are kept.
      if (previousActivity !== input.businessActivity) {
        await applyActivityDealPipeline(input.businessActivity);
      }
      await createActivityLog({
        user_id: user.id,
        action: "update",
        entity_type: "settings",
        entity_id: "setup",
        details: { step: "company" },
      });
    });
    revalidateEverywhere();
    await refreshPublicSite();
    return { success: true };
  });
}

export async function saveSetupThemeAction(theme: BrandTheme) {
  return measureOperation("action:saveSetupThemeAction", async () => {
    const user = await requirePermission("settings", "write");
    validateActionArguments("saveSetupThemeAction", { theme });
    const saved = await runAtomicMutation(async () => {
      const company = await updateCompanyTheme(theme);
      await createActivityLog({
        user_id: user.id,
        action: "update",
        entity_type: "settings",
        entity_id: "theme",
        details: {
          primary: company.theme.primary,
          accent: company.theme.accent,
        },
      });
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
    if (!PREFIX.test(invoicePrefix) || !PREFIX.test(receiptPrefix))
      throw new Error(serverMessages.setupPrefixInvalid);
    if (!(input.vatPercentage >= 0 && input.vatPercentage <= 100))
      throw new Error(serverMessages.setupVatInvalid);
    if (
      !Number.isInteger(input.paymentTermsDays) ||
      input.paymentTermsDays < 0 ||
      input.paymentTermsDays > 365
    )
      throw new Error(serverMessages.setupPaymentTermsInvalid);
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
      const known = new Set(
        (await ensureDefaultFeatureModules()).map((m) => m.moduleKey),
      );
      for (const choice of input.modules)
        if (known.has(choice.moduleKey))
          await updateFeatureToggle(choice.moduleKey, choice.isEnabled);
      await applyActivityDepartments(
        null,
        input.departments.filter(isDepartmentKey),
      );
      await createActivityLog({
        user_id: user.id,
        action: "update",
        entity_type: "settings",
        entity_id: "setup",
        details: { step: "configuration" },
      });
    });
    revalidateEverywhere();
    return { success: true };
  });
}

/** Step: whether the company has a public website, and how it is set up for what the company does. */
export interface SetupWebsiteInput {
  enabled: boolean;
  /** A WebsiteConfig, checked by validateWebsiteConfig. */
  config: unknown;
}

export async function saveSetupWebsiteAction(input: SetupWebsiteInput) {
  return measureOperation("action:saveSetupWebsiteAction", async () => {
    const user = await requirePermission("settings", "write");
    validateActionArguments("saveSetupWebsiteAction", { input });
    const company = await getCompanySettings();
    // A company writing in one language fills each pair once; the website reads either side.
    const config = input.enabled
      ? validateWebsiteConfig(
          mirrorBilingual(
            input.config as WebsiteConfig,
            company.content_languages,
          ),
        )
      : null;
    await runAtomicMutation(async () => {
      await ensureDefaultFeatureModules();
      await updateFeatureToggle("cms", input.enabled);
      if (config) {
        await getWebsiteEditor();
        await db.websiteContent.update({
          where: { id: "main" },
          data: {
            draft: JSON.parse(JSON.stringify(config)),
            revision: { increment: 1 },
          },
        });
      }
      await createActivityLog({
        user_id: user.id,
        action: "update",
        entity_type: "settings",
        entity_id: "setup",
        details: {
          step: "website",
          enabled: input.enabled,
          purpose: config?.purpose ?? null,
        },
      });
    });
    revalidateEverywhere();
    await refreshPublicSite();
    return { success: true };
  });
}

export async function completeSetupAction(options: {
  publishWebsite: boolean;
}) {
  return measureOperation("action:completeSetupAction", async () => {
    const user = await requirePermission("settings", "write");
    validateActionArguments("completeSetupAction", { options });
    await runAtomicMutation(async () => {
      const company = await db.companySetting.findUniqueOrThrow({
        where: { singleton: 1 },
        select: { logoUrl: true, darkLogoUrl: true },
      });
      if (!company.logoUrl && !company.darkLogoUrl)
        throw new Error(serverMessages.setupLogoRequired);
      await completeCompanySetup();
      await createActivityLog({
        user_id: user.id,
        action: "update",
        entity_type: "settings",
        entity_id: "setup",
        details: { step: "complete" },
      });
    });
    let websitePublished = false;
    if (options.publishWebsite && (await isFeatureEnabled("cms"))) {
      const content = await getWebsiteEditor();
      await publishWebsiteAction(content.revision);
      websitePublished = true;
    }
    revalidateEverywhere();
    return { success: true, websitePublished };
  });
}

/** A short-lived link to the draft website for the wizard's live preview (works before the website module is on). */
export async function setupPreviewAction(locale: string) {
  return measureOperation("action:setupPreviewAction", async () => {
    await requirePermission("settings", "write");
    validateActionArguments("setupPreviewAction", { locale });
    const secret = process.env.REVALIDATION_SECRET;
    const web = process.env.WEB_URL;
    if (!secret || !web)
      throw new Error(serverMessages.websitePreviewNotConfigured);
    const expires = String(Date.now() + 10 * 60 * 1000);
    const token = createHmac("sha256", secret)
      .update(`website-preview:${expires}`)
      .digest("hex");
    return `${web}/api/preview?expires=${expires}&token=${token}&locale=${locale === "ar" ? "ar" : "en"}`;
  });
}

/** Saves the website settings as a draft while the wizard previews them; the module switch waits for Next. */
export async function saveSetupWebsiteDraftAction(config: unknown) {
  return measureOperation("action:saveSetupWebsiteDraftAction", async () => {
    await requirePermission("settings", "write");
    validateActionArguments("saveSetupWebsiteDraftAction", { config });
    const company = await getCompanySettings();
    const draft = validateWebsiteConfig(
      mirrorBilingual(config as WebsiteConfig, company.content_languages),
    );
    await getWebsiteEditor();
    await db.websiteContent.update({
      where: { id: "main" },
      data: {
        draft: JSON.parse(JSON.stringify(draft)),
        revision: { increment: 1 },
      },
    });
    return { success: true };
  });
}

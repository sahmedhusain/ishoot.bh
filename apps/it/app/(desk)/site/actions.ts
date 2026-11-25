"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import {
  getContentSnapshotForIT,
  saveContentDraftForIT,
  publishContentSnapshotForIT,
  updateCompanyConfigurationForIT,
  type CompanyConfigurationPatch,
  type CMSSocialLink,
} from "@platform/api-client";
import { asUser, requireAllowed } from "../../../lib/session";
import { revalidatePublicSite } from "../../../lib/revalidate-web";
import { apiTimeoutMs, apiUrl } from "../../../lib/api/config";
import { serviceToken } from "../../../lib/api/service-token";

function normalizeLinks(raw: unknown): CMSSocialLink[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item: any, idx) => ({
    id: String(item?.id ?? randomUUID()),
    platform: String(item?.platform ?? ""),
    url: String(item?.url ?? ""),
    icon: typeof item?.icon === "string" ? item.icon : undefined,
    is_active: item?.is_active ?? item?.isActive ?? true,
    display_order: Number(item?.display_order ?? item?.sortOrder ?? idx),
    created_at: typeof item?.created_at === "string" ? item.created_at : new Date().toISOString(),
    updated_at: typeof item?.updated_at === "string" ? item.updated_at : new Date().toISOString(),
  }));
}

export async function saveSitePresentationAction(patch: CompanyConfigurationPatch) {
  const user = await requireAllowed("setup", "edit");
  try {
    const value = await asUser(() => updateCompanyConfigurationForIT(user.token, patch));
    await revalidatePublicSite(["company", "website"]).catch(() => false);
    revalidatePath("/site");
    revalidatePath("/company");
    return { ok: true as const, value };
  } catch {
    return { ok: false as const };
  }
}

export async function createItSocialLinkAction(input: {
  platform: string;
  url: string;
  icon?: string;
}) {
  await requireAllowed("domains", "edit");
  const snap = await getContentSnapshotForIT("main").catch(() => null);
  const draft = (snap?.draft ?? {}) as Record<string, unknown>;
  const list = normalizeLinks(draft.socialLinks);
  const now = new Date().toISOString();
  const created: CMSSocialLink = {
    id: randomUUID(),
    platform: input.platform.trim(),
    url: input.url.trim(),
    icon: input.icon?.trim() || undefined,
    is_active: true,
    display_order: list.length,
    created_at: now,
    updated_at: now,
  };
  await saveContentDraftForIT("main", { ...draft, socialLinks: [...list, created] });
  await revalidatePublicSite(["company", "website"]).catch(() => false);
  revalidatePath("/site");
  return { ok: true as const, link: created };
}

export async function updateItSocialLinkAction(
  id: string,
  patch: Partial<Pick<CMSSocialLink, "platform" | "url" | "is_active" | "display_order">>,
) {
  await requireAllowed("domains", "edit");
  const snap = await getContentSnapshotForIT("main").catch(() => null);
  const draft = (snap?.draft ?? {}) as Record<string, unknown>;
  const list = normalizeLinks(draft.socialLinks);
  const next = list.map((l) =>
    l.id === id ? { ...l, ...patch, updated_at: new Date().toISOString() } : l,
  );
  await saveContentDraftForIT("main", { ...draft, socialLinks: next });
  await revalidatePublicSite(["company", "website"]).catch(() => false);
  revalidatePath("/site");
  return { ok: true as const, links: next };
}

export async function deleteItSocialLinkAction(id: string) {
  await requireAllowed("domains", "edit");
  const snap = await getContentSnapshotForIT("main").catch(() => null);
  const draft = (snap?.draft ?? {}) as Record<string, unknown>;
  const list = normalizeLinks(draft.socialLinks).filter((l) => l.id !== id);
  await saveContentDraftForIT("main", { ...draft, socialLinks: list });
  await revalidatePublicSite(["company", "website"]).catch(() => false);
  revalidatePath("/site");
  return { ok: true as const, links: list };
}

export async function publishItWebsiteSnapshotAction() {
  await requireAllowed("domains", "edit");
  await publishContentSnapshotForIT("main");
  await revalidatePublicSite(["company", "website", "banners", "portfolio", "clients", "equipment", "reviews", "faqs", "stats"]).catch(() => false);
  revalidatePath("/site");
  return { ok: true as const };
}

export async function revalidatePublicSiteFromItAction() {
  await requireAllowed("domains", "execute");
  const ok = await revalidatePublicSite(["company", "website", "banners", "portfolio", "clients", "equipment", "reviews", "faqs", "stats"]);
  return { ok };
}

export async function syncStoreOperationsFromItAction(input: {
  action:
    | "revalidate_store"
    | "sync_regions"
    | "update_policies"
    | "sync_categories"
    | "update_website_settings";
  regions?: { code: string; currency: string; multiplier: string; enabled: boolean }[];
  policies?: {
    loyaltyEnabled: boolean;
    walletEnabled: boolean;
    raffleEnabled: boolean;
    cookieBannerEnabled: boolean;
    sslBadgeEnabled: boolean;
  };
  customCategories?: {
    id: string;
    slug: string;
    name_en: string;
    name_ar: string;
    icon?: string;
    display_order: number;
    featured?: boolean;
    is_active: boolean;
  }[];
  websiteSettings?: {
    announcementEn?: string;
    announcementAr?: string;
    crNumber?: string;
    vatNumber?: string;
    returnWindowDays?: number;
    showCategoryBar?: boolean;
    showDealsSection?: boolean;
    showGiftCardsSection?: boolean;
  };
  tags?: string[];
}) {
  await requireAllowed("setup", "edit");
  const token = await serviceToken().catch(() => null);
  let syncedRegions = 0;

  if (token && input.regions?.length) {
    for (const reg of input.regions) {
      const code = reg.code.trim().toUpperCase();
      if (!code) continue;
      await fetch(`${apiUrl()}/v1/commerce/tables/store_region`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: `region-${code.toLowerCase()}`,
          code,
          currency: reg.currency.trim().toUpperCase(),
          price_multiplier: Number(reg.multiplier) || 1,
          is_enabled: reg.enabled,
        }),
        signal: AbortSignal.timeout(apiTimeoutMs()),
      }).catch(() => null);
      syncedRegions += 1;
    }
  }

  if (token && (input.policies || input.customCategories || input.websiteSettings)) {
    const patch: Record<string, unknown> = { id: "default" };
    if (input.policies) {
      patch.loyalty_enabled = input.policies.loyaltyEnabled;
      patch.wallet_enabled = input.policies.walletEnabled;
      patch.raffle_enabled = input.policies.raffleEnabled;
      patch.cookie_banner_enabled = input.policies.cookieBannerEnabled;
      patch.ssl_badge_enabled = input.policies.sslBadgeEnabled;
    }
    if (input.customCategories) {
      patch.custom_categories_json = JSON.stringify(input.customCategories);
    }
    if (input.websiteSettings) {
      if (input.websiteSettings.announcementEn !== undefined) {
        patch.announcement_en = input.websiteSettings.announcementEn.trim().slice(0, 300);
      }
      if (input.websiteSettings.announcementAr !== undefined) {
        patch.announcement_ar = input.websiteSettings.announcementAr.trim().slice(0, 300);
      }
      if (input.websiteSettings.crNumber !== undefined) {
        patch.cr_number = input.websiteSettings.crNumber.trim().slice(0, 64) || "136704-1";
      }
      if (input.websiteSettings.vatNumber !== undefined) {
        patch.vat_number = input.websiteSettings.vatNumber.trim().slice(0, 64);
      }
      if (input.websiteSettings.returnWindowDays !== undefined) {
        patch.return_window_days = Math.max(1, Math.min(365, Math.floor(Number(input.websiteSettings.returnWindowDays) || 14)));
      }
      if (input.websiteSettings.showCategoryBar !== undefined) {
        patch.show_category_bar = input.websiteSettings.showCategoryBar;
      }
      if (input.websiteSettings.showDealsSection !== undefined) {
        patch.show_deals_section = input.websiteSettings.showDealsSection;
      }
      if (input.websiteSettings.showGiftCardsSection !== undefined) {
        patch.show_gift_cards_section = input.websiteSettings.showGiftCardsSection;
      }
    }
    await fetch(`${apiUrl()}/v1/commerce/tables/store_settings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(patch),
      signal: AbortSignal.timeout(apiTimeoutMs()),
    }).catch(() => null);
  }

  const revalidated = await revalidatePublicSite(
    input.tags && input.tags.length > 0
      ? input.tags
      : ["store", "products", "company", "website", "banners", "coupons"],
  ).catch(() => false);
  revalidatePath("/store-presets");
  revalidatePath("/dashboard/store-presets");
  revalidatePath("/site");
  return { ok: true as const, revalidated, syncedRegions };
}

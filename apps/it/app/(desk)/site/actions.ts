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

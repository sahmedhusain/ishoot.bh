import { cache } from "react";
import { randomUUID } from "node:crypto";
import { getContentSnapshot, saveContentDraft } from "@platform/api-client";
import { SocialLink } from "../types";

function mapSocialLink(raw: any): SocialLink {
  const now = new Date().toISOString();
  return {
    id: String(raw?.id ?? ""),
    platform: String(raw?.platform ?? ""),
    url: String(raw?.url ?? ""),
    icon: raw?.icon || undefined,
    is_active: raw?.is_active ?? raw?.isActive ?? true,
    display_order: Number(raw?.display_order ?? raw?.sortOrder ?? 0),
    created_at:
      typeof raw?.created_at === "string"
        ? raw.created_at
        : typeof raw?.createdAt === "string"
          ? raw.createdAt
          : now,
    updated_at:
      typeof raw?.updated_at === "string"
        ? raw.updated_at
        : typeof raw?.updatedAt === "string"
          ? raw.updatedAt
          : now,
  };
}

export const getSocialLinks = cache(
  async (onlyActive = true): Promise<SocialLink[]> => {
    try {
      const snap = await getContentSnapshot("main");
      const draftList = Array.isArray(snap?.draft?.socialLinks)
        ? snap.draft.socialLinks
        : [];
      const pubList = Array.isArray(snap?.published?.socialLinks)
        ? snap.published.socialLinks
        : [];
      const raw = onlyActive
        ? pubList.length > 0
          ? pubList
          : draftList
        : draftList.length > 0
          ? draftList
          : pubList;
      const mapped = raw.map(mapSocialLink);
      const filtered = onlyActive ? mapped.filter((l) => l.is_active) : mapped;
      return filtered.sort((a, b) => a.display_order - b.display_order);
    } catch (e) {
      console.error("Failed to fetch social links from CMS snapshot:", e);
      return [];
    }
  },
);

export async function createSocialLink(data: {
  platform: string;
  url: string;
  icon?: string;
  is_active?: boolean;
  display_order?: number;
}): Promise<SocialLink> {
  const snap = await getContentSnapshot("main").catch(() => null);
  const currentDraft = (snap?.draft as Record<string, any>) ?? {};
  const list = Array.isArray(currentDraft.socialLinks)
    ? [...currentDraft.socialLinks].map(mapSocialLink)
    : [];

  const now = new Date().toISOString();
  const created = mapSocialLink({
    id: randomUUID(),
    platform: data.platform,
    url: data.url,
    icon: data.icon || undefined,
    is_active: data.is_active ?? true,
    display_order: data.display_order ?? list.length,
    created_at: now,
    updated_at: now,
  });

  await saveContentDraft("", "main", {
    ...currentDraft,
    socialLinks: [...list, created],
  });
  return created;
}

export async function updateSocialLink(
  id: string,
  data: Partial<Omit<SocialLink, "id" | "created_at" | "updated_at">>,
): Promise<SocialLink | null> {
  const snap = await getContentSnapshot("main").catch(() => null);
  const currentDraft = (snap?.draft as Record<string, any>) ?? {};
  const list = Array.isArray(currentDraft.socialLinks)
    ? [...currentDraft.socialLinks].map(mapSocialLink)
    : [];

  const idx = list.findIndex((l) => l.id === id);
  if (idx === -1) return null;

  const updated = mapSocialLink({
    ...list[idx],
    ...data,
    updated_at: new Date().toISOString(),
  });
  list[idx] = updated;

  await saveContentDraft("", "main", {
    ...currentDraft,
    socialLinks: list,
  });
  return updated;
}

export async function deleteSocialLink(id: string): Promise<boolean> {
  const snap = await getContentSnapshot("main").catch(() => null);
  const currentDraft = (snap?.draft as Record<string, any>) ?? {};
  const list = Array.isArray(currentDraft.socialLinks)
    ? [...currentDraft.socialLinks].map(mapSocialLink)
    : [];

  const next = list.filter((l) => l.id !== id);
  if (next.length === list.length) return false;

  await saveContentDraft("", "main", {
    ...currentDraft,
    socialLinks: next,
  });
  return true;
}

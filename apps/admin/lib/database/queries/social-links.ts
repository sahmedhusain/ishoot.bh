import { db } from "../atomic";
import { SocialLink } from "../types";

function mapSocialLink(s: any): SocialLink {
  return {
    id: s.id,
    platform: s.platform,
    url: s.url,
    icon: s.icon || undefined,
    is_active: s.isActive,
    display_order: s.displayOrder,
    created_at: s.createdAt.toISOString(),
    updated_at: s.updatedAt.toISOString(),
  };
}

export async function getSocialLinks(onlyActive = true): Promise<SocialLink[]> {
  try {
    const links = await db.socialLink.findMany({
      where: onlyActive ? { isActive: true } : undefined,
      orderBy: { displayOrder: "asc" },
    });
    return (links || []).map(mapSocialLink);
  } catch (e) {
    console.error(
      "Error fetching social links from DB:",
      e instanceof Error ? e.message : e,
    );
    throw e;
  }
}

export async function createSocialLink(data: {
  platform: string;
  url: string;
  icon?: string;
  is_active?: boolean;
  display_order?: number;
}): Promise<SocialLink> {
  const created = await db.socialLink.create({
    data: {
      platform: data.platform,
      url: data.url,
      icon: data.icon,
      isActive: data.is_active ?? true,
      displayOrder: data.display_order ?? 0,
    },
  });
  return mapSocialLink(created);
}

export async function updateSocialLink(
  id: string,
  data: Partial<Omit<SocialLink, "id" | "created_at" | "updated_at">>,
): Promise<SocialLink | null> {
  try {
    const updateData: any = {};
    if (data.platform !== undefined) updateData.platform = data.platform;
    if (data.url !== undefined) updateData.url = data.url;
    if (data.icon !== undefined) updateData.icon = data.icon;
    if (data.is_active !== undefined) updateData.isActive = data.is_active;
    if (data.display_order !== undefined)
      updateData.displayOrder = data.display_order;

    const updated = await db.socialLink.update({
      where: { id },
      data: updateData,
    });
    return mapSocialLink(updated);
  } catch (e) {
    console.error(
      `Error updating social link ${id}:`,
      e instanceof Error ? e.message : e,
    );
    throw e;
  }
}

export async function deleteSocialLink(id: string): Promise<boolean> {
  try {
    await db.socialLink.delete({ where: { id } });
    return true;
  } catch (e) {
    console.error(
      `Error deleting social link ${id}:`,
      e instanceof Error ? e.message : e,
    );
    throw e;
  }
}

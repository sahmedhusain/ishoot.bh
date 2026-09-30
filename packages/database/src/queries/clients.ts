import { db } from "../db";
import { ClientLogo } from "../types";

function mapClient(l: any): ClientLogo {
  return {
    id: l.id,
    client_name: l.name,
    logo_svg_url: l.logoUrl,
    website_url: l.websiteUrl || undefined,
    display_order: l.displayOrder,
    is_active: l.isActive,
    created_at: new Date().toISOString(),
  };
}

export async function getActiveClientLogos(): Promise<ClientLogo[]> {
  try {
    const logos = await db.clientLogo.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: "asc" },
    });
    return logos.map(mapClient);
  } catch (e) {
    console.error("Error fetching active client logos from DB:", e instanceof Error ? e.message : e);
    return [];
  }
}

export async function getAllClientLogos(): Promise<ClientLogo[]> {
  try {
    const logos = await db.clientLogo.findMany({
      orderBy: { displayOrder: "asc" },
    });
    return logos.map(mapClient);
  } catch (e) {
    console.error("Error fetching all client logos from DB:", e instanceof Error ? e.message : e);
    return [];
  }
}

export async function createClientLogo(data: {
  client_name: string;
  logo_svg_url: string;
  website_url?: string;
  display_order?: number;
  is_active?: boolean;
}): Promise<ClientLogo> {
  const created = await db.clientLogo.create({
    data: {
      name: data.client_name,
      logoUrl: data.logo_svg_url,
      websiteUrl: data.website_url || null,
      displayOrder: data.display_order ?? 0,
      isActive: data.is_active ?? true,
    },
  });
  return mapClient(created);
}

export async function updateClientLogo(
  id: string,
  data: Partial<ClientLogo>,
): Promise<ClientLogo | null> {
  try {
    const updateData: any = {};
    if (data.client_name !== undefined) updateData.name = data.client_name;
    if (data.logo_svg_url !== undefined) updateData.logoUrl = data.logo_svg_url;
    if (data.website_url !== undefined)
      updateData.websiteUrl = data.website_url;
    if (data.display_order !== undefined)
      updateData.displayOrder = data.display_order;
    if (data.is_active !== undefined) updateData.isActive = data.is_active;

    const updated = await db.clientLogo.update({
      where: { id },
      data: updateData,
    });
    return mapClient(updated);
  } catch (e) {
    console.error(`Error updating client logo ${id}:`, e instanceof Error ? e.message : e);
    return null;
  }
}

export async function deleteClientLogo(id: string): Promise<boolean> {
  try {
    await db.clientLogo.delete({ where: { id } });
    return true;
  } catch (e) {
    console.error(`Error deleting client logo ${id}:`, e instanceof Error ? e.message : e);
    return false;
  }
}

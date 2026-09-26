import { db } from '../db';
import { mockClientLogos } from '../mock-data';
import { ClientLogo } from '../types';

export async function getActiveClientLogos(): Promise<ClientLogo[]> {
  try {
    const logos = await db.clientLogo.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' },
    });
    if (logos && logos.length > 0) {
      return logos.map((l) => ({
        id: l.id,
        client_name: l.name,
        logo_svg_url: l.logoUrl,
        website_url: undefined,
        display_order: l.displayOrder,
        is_active: l.isActive,
        created_at: new Date().toISOString(),
      }));
    }
  } catch (e) {
    console.error('Error fetching client logos from DB:', e);
  }
  return mockClientLogos.filter((c) => c.is_active);
}

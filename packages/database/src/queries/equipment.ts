import { db } from '../db';
import { mockStudioEquipment } from '../mock-data';
import { StudioEquipment } from '../types';

export async function getStudioEquipment(): Promise<StudioEquipment[]> {
  try {
    const items = await db.studioEquipment.findMany({
      orderBy: { displayOrder: 'asc' },
    });
    if (items && items.length > 0) {
      return items.map((i) => ({
        id: i.id,
        category: (i.category as any) || 'cameras',
        model_name: i.nameEn,
        specification: i.descriptionEn || i.nameAr,
        daily_rate_bhd: undefined,
        display_order: i.displayOrder,
        created_at: new Date().toISOString(),
      }));
    }
  } catch (e) {
    console.error('Error fetching studio equipment from DB:', e);
  }
  return mockStudioEquipment;
}

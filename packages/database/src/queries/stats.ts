import { db } from "../db";

export async function getStatistics() {
  return await db.statistic.findMany({
    orderBy: { sortOrder: "asc" },
  });
}

export async function createStatistic(data: {
  value: string;
  labelEn: string;
  labelAr: string;
  subLabelEn?: string;
  subLabelAr?: string;
  icon?: string;
  sortOrder?: number;
}) {
  return await db.statistic.create({ data });
}

export async function updateStatistic(id: string, data: Partial<Parameters<typeof createStatistic>[0]>) {
  return await db.statistic.update({
    where: { id },
    data,
  });
}

export async function deleteStatistic(id: string) {
  return await db.statistic.delete({ where: { id } });
}

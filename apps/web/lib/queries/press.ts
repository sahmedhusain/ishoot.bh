import { db } from "../atomic";

/** Press releases: published articles in the press_release category, newest first (for the website's press page). */
export async function listPressReleases(onlyPublished = false) {
  const now = new Date();
  const rows = await db.cmsArticle.findMany({
    where: {
      category: "press_release",
      ...(onlyPublished
        ? {
            status: "published",
            OR: [{ publishAt: null }, { publishAt: { lte: now } }],
          }
        : {}),
    },
    orderBy: [
      { publishAt: { sort: "desc", nulls: "last" } },
      { createdAt: "desc" },
    ],
    take: 100,
    select: {
      id: true,
      slug: true,
      titleEn: true,
      titleAr: true,
      excerptEn: true,
      excerptAr: true,
      status: true,
      publishAt: true,
      createdAt: true,
    },
  });
  return rows.map((a) => ({
    id: a.id,
    slug: a.slug,
    title_en: a.titleEn,
    title_ar: a.titleAr,
    excerpt_en: a.excerptEn ?? "",
    excerpt_ar: a.excerptAr ?? "",
    status: a.status,
    date: (a.publishAt ?? a.createdAt).toISOString(),
  }));
}

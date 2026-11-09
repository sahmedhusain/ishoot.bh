import {
  listReviews,
  listFAQs,
  listStatistics,
  getContentSnapshot,
} from "@platform/api-client";

export interface CmsCounts {
  banners: number;
  portfolio: number;
  clients: number;
  equipment: number;
  reviews: number;
  pendingReviews: number;
  faqs: number;
  stats: number;
}

export async function getCmsCounts(): Promise<CmsCounts> {
  let reviewsCount = 0;
  let pendingReviewsCount = 0;
  let faqsCount = 0;
  let statsCount = 0;
  let bannersCount = 0;
  let portfolioCount = 0;
  let clientsCount = 0;
  let equipmentCount = 0;

  try {
    const [revs, faqs, stats, snap] = await Promise.all([
      listReviews(true).catch(() => []),
      listFAQs(true).catch(() => []),
      listStatistics().catch(() => []),
      getContentSnapshot("main").catch(() => null),
    ]);

    reviewsCount = revs?.length ?? 0;
    pendingReviewsCount = revs?.filter((r) => !r.isApproved).length ?? 0;
    faqsCount = faqs?.length ?? 0;
    statsCount = stats?.length ?? 0;

    const draft = (snap?.draft && typeof snap.draft === "object") ? (snap.draft as any) : {};
    bannersCount = Array.isArray(draft.banners) ? draft.banners.length : 0;
    portfolioCount = Array.isArray(draft.portfolio) ? draft.portfolio.length : 0;
    clientsCount = Array.isArray(draft.clients) ? draft.clients.length : 0;
    equipmentCount = Array.isArray(draft.equipment) ? draft.equipment.length : 0;
  } catch (e) {
    console.error("Error fetching CMS counts:", e);
  }

  return {
    banners: bannersCount,
    portfolio: portfolioCount,
    clients: clientsCount,
    equipment: equipmentCount,
    reviews: reviewsCount,
    pendingReviews: pendingReviewsCount,
    faqs: faqsCount,
    stats: statsCount,
  };
}

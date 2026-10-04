import { db } from "../db";

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

/** Row counts for the CMS overview, without loading the collections themselves. */
export async function getCmsCounts(): Promise<CmsCounts> {
  const [banners, portfolio, clients, equipment, reviews, pendingReviews, faqs, stats] = await Promise.all([
    db.heroBanner.count(),
    db.portfolioItem.count(),
    db.clientLogo.count(),
    db.studioEquipment.count(),
    db.review.count(),
    db.review.count({ where: { isApproved: false } }),
    db.faq.count(),
    db.statistic.count(),
  ]);
  return { banners, portfolio, clients, equipment, reviews, pendingReviews, faqs, stats };
}

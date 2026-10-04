import type { getFaqs, getReviews, getStatistics } from "@ishoot/database";

export type FaqItem = Awaited<ReturnType<typeof getFaqs>>[number];
export type StatisticItem = Awaited<ReturnType<typeof getStatistics>>[number];
export type ReviewItem = Awaited<ReturnType<typeof getReviews>>[number];

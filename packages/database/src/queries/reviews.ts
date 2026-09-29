import { db } from "../db";

export async function getReviews(adminOnly = true) {
  return await db.review.findMany({
    where: adminOnly ? undefined : { isApproved: true },
    orderBy: { sortOrder: "asc" },
    include: { client: true },
  });
}

export async function getReviewById(id: string) {
  return await db.review.findUnique({ where: { id } });
}

export async function createReview(data: {
  authorEn: string;
  authorAr: string;
  companyEn?: string;
  companyAr?: string;
  quoteEn: string;
  quoteAr: string;
  rating?: number;
  year?: string;
  clientId?: string;
  isApproved?: boolean;
}) {
  return await db.review.create({
    data: {
      authorEn: data.authorEn,
      authorAr: data.authorAr,
      companyEn: data.companyEn,
      companyAr: data.companyAr,
      quoteEn: data.quoteEn,
      quoteAr: data.quoteAr,
      rating: data.rating ?? 5,
      year: data.year ?? new Date().getFullYear().toString(),
      clientId: data.clientId,
      isApproved: data.isApproved ?? true,
    },
  });
}

export async function updateReview(id: string, data: Partial<Parameters<typeof createReview>[0]>) {
  return await db.review.update({
    where: { id },
    data,
  });
}

export async function deleteReview(id: string) {
  return await db.review.delete({ where: { id } });
}

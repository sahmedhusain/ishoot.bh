import { listReviews } from "@platform/api-client";
import { db } from "../atomic";

export async function getReviews(adminOnly = true) {
  try {
    const items = await listReviews(adminOnly);
    if (items && items.length > 0) {
      return items.map((r) => ({
        id: r.id,
        authorEn: r.authorEn,
        authorAr: r.authorAr,
        companyEn: r.companyEn ?? null,
        companyAr: r.companyAr ?? null,
        quoteEn: r.quoteEn,
        quoteAr: r.quoteAr,
        rating: r.rating,
        year: r.year,
        isApproved: r.isApproved,
        sortOrder: r.sortOrder,
        originalLocale: null,
      }));
    }
  } catch {
  }
  try {
    return await db.review.findMany({
      where: adminOnly ? undefined : { isApproved: true },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        authorEn: true,
        authorAr: true,
        companyEn: true,
        companyAr: true,
        quoteEn: true,
        quoteAr: true,
        rating: true,
        year: true,
        isApproved: true,
        sortOrder: true,
        originalLocale: true,
        ...(adminOnly
          ? {
              clientId: true,
              client: { select: { id: true, firstName: true, lastName: true } },
            }
          : {}),
      },
    });
  } catch (e) {
    console.error(
      "Error fetching reviews from DB:",
      e instanceof Error ? e.message : e,
    );
    throw e;
  }
}

export async function getReviewById(id: string) {
  try {
    return await db.review.findUnique({ where: { id } });
  } catch (e) {
    console.error(
      `Error fetching review ${id}:`,
      e instanceof Error ? e.message : e,
    );
    throw e;
  }
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
  originalLocale?: string;
}) {
  return await db.review.create({
    data: {
      originalLocale: data.originalLocale,
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

export async function updateReview(
  id: string,
  data: Partial<Parameters<typeof createReview>[0]>,
) {
  return await db.review.update({
    where: { id },
    data,
  });
}

export async function deleteReview(id: string) {
  return await db.review.delete({ where: { id } });
}

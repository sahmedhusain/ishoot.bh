import {
  listReviews,
  createReview as createCmsReview,
  updateReview as updateCmsReview,
  deleteReview as deleteCmsReview,
} from "@platform/api-client";

export async function getReviews(adminOnly = true) {
  try {
    const items = await listReviews(adminOnly);
    return (items || []).map((r) => ({
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
  } catch (e) {
    console.error("Error fetching reviews:", e instanceof Error ? e.message : e);
    return [];
  }
}

export async function getReviewById(id: string) {
  try {
    const items = await listReviews(true);
    const r = items?.find((item) => item.id === id);
    if (!r) return null;
    return {
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
      createdAt: new Date(r.createdAt),
    };
  } catch (e) {
    console.error(
      `Error fetching review ${id}:`,
      e instanceof Error ? e.message : e,
    );
    return null;
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
  const created = await createCmsReview("", {
    authorEn: data.authorEn,
    authorAr: data.authorAr,
    companyEn: data.companyEn,
    companyAr: data.companyAr,
    quoteEn: data.quoteEn,
    quoteAr: data.quoteAr,
    rating: data.rating ?? 5,
    year: data.year ?? new Date().getFullYear().toString(),
    isApproved: data.isApproved ?? true,
  });
  return {
    ...created,
    createdAt: new Date(created.createdAt),
    originalLocale: data.originalLocale ?? null,
    clientId: data.clientId ?? null,
  };
}

export async function updateReview(
  id: string,
  data: Partial<Parameters<typeof createReview>[0]>,
) {
  const updated = await updateCmsReview("", id, data as any);
  return {
    ...updated,
    createdAt: updated?.createdAt ? new Date(updated.createdAt) : new Date(),
    originalLocale: data.originalLocale ?? null,
  };
}

export async function deleteReview(id: string) {
  await deleteCmsReview("", id);
  return { id };
}

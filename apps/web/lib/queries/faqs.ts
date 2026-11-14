import { listFAQs, createFAQ, updateFAQ, deleteFAQ } from "@platform/api-client";

export async function getFaqs(adminOnly = true) {
  try {
    const items = await listFAQs(adminOnly);
    return (items || []).map((f) => ({
      id: f.id,
      questionEn: f.questionEn,
      questionAr: f.questionAr,
      answerEn: f.answerEn,
      answerAr: f.answerAr,
      category: f.category,
      isPublished: f.isPublished,
      sortOrder: f.sortOrder,
      createdAt: new Date(f.createdAt),
      isSample: false,
    }));
  } catch (e) {
    console.error("Error fetching FAQs:", e instanceof Error ? e.message : e);
    return [];
  }
}

export async function getFaqById(id: string) {
  try {
    const items = await listFAQs(true);
    const f = items?.find((item) => item.id === id);
    if (!f) return null;
    return {
      id: f.id,
      questionEn: f.questionEn,
      questionAr: f.questionAr,
      answerEn: f.answerEn,
      answerAr: f.answerAr,
      category: f.category,
      isPublished: f.isPublished,
      sortOrder: f.sortOrder,
      createdAt: new Date(f.createdAt),
      isSample: false,
    };
  } catch (e) {
    console.error(
      `Error fetching FAQ ${id}:`,
      e instanceof Error ? e.message : e,
    );
    return null;
  }
}

export async function createFaq(data: {
  questionEn: string;
  questionAr: string;
  answerEn: string;
  answerAr: string;
  category?: string;
  isPublished?: boolean;
}) {
  const created = await createFAQ("", {
    questionEn: data.questionEn,
    questionAr: data.questionAr,
    answerEn: data.answerEn,
    answerAr: data.answerAr,
    category: data.category ?? "general",
    isPublished: data.isPublished ?? true,
  });
  return {
    ...created,
    createdAt: new Date(created.createdAt),
    isSample: false,
  };
}

export async function updateFaq(
  id: string,
  data: Partial<Parameters<typeof createFaq>[0]>,
) {
  const updated = await updateFAQ("", id, data as any);
  return {
    ...updated,
    createdAt: updated?.createdAt ? new Date(updated.createdAt) : new Date(),
    isSample: false,
  };
}

export async function deleteFaq(id: string) {
  await deleteFAQ("", id);
  return { id };
}

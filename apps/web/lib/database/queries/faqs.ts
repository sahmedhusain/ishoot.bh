import { listFAQs } from "@platform/api-client";
import { db } from "../atomic";

export async function getFaqs(adminOnly = true) {
  try {
    const items = await listFAQs(adminOnly);
    if (items && items.length > 0) {
      return items.map((f) => ({
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
    }
  } catch {
    // Fall back to direct database
  }
  try {
    return await db.faq.findMany({
      where: adminOnly ? undefined : { isPublished: true },
      orderBy: { sortOrder: "asc" },
    });
  } catch (e) {
    console.error(
      "Error fetching FAQs from DB:",
      e instanceof Error ? e.message : e,
    );
    throw e;
  }
}

export async function getFaqById(id: string) {
  try {
    return await db.faq.findUnique({ where: { id } });
  } catch (e) {
    console.error(
      `Error fetching FAQ ${id}:`,
      e instanceof Error ? e.message : e,
    );
    throw e;
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
  return await db.faq.create({
    data: {
      questionEn: data.questionEn,
      questionAr: data.questionAr,
      answerEn: data.answerEn,
      answerAr: data.answerAr,
      category: data.category ?? "general",
      isPublished: data.isPublished ?? true,
    },
  });
}

export async function updateFaq(
  id: string,
  data: Partial<Parameters<typeof createFaq>[0]>,
) {
  return await db.faq.update({
    where: { id },
    data,
  });
}

export async function deleteFaq(id: string) {
  return await db.faq.delete({ where: { id } });
}

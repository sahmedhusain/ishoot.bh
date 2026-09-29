import { db } from "../db";

export async function getFaqs(adminOnly = true) {
  return await db.faq.findMany({
    where: adminOnly ? undefined : { isPublished: true },
    orderBy: { sortOrder: "asc" },
  });
}

export async function getFaqById(id: string) {
  return await db.faq.findUnique({ where: { id } });
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

export async function updateFaq(id: string, data: Partial<Parameters<typeof createFaq>[0]>) {
  return await db.faq.update({
    where: { id },
    data,
  });
}

export async function deleteFaq(id: string) {
  return await db.faq.delete({ where: { id } });
}

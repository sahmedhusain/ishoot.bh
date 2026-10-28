import { isValidEmail } from "../constants/validation";
import { serverMessages } from "@platform/locales";
import { db } from "../db";
import { COVERAGE_SENTIMENTS } from "../constants/outreach";

// ─── Media contacts ──────────────────────────────────────────────────────────────────────────────────────────────

export async function listMediaContacts() {
  const rows = await db.mediaContact.findMany({
    orderBy: [{ isActive: "desc" }, { outlet: "asc" }, { name: "asc" }],
  });
  return rows.map((c) => ({
    id: c.id,
    name: c.name,
    outlet: c.outlet,
    role: c.role ?? "",
    beat: c.beat ?? "",
    email: c.email ?? "",
    phone: c.phone ?? "",
    notes: c.notes ?? "",
    is_active: c.isActive,
  }));
}
export type MediaContactRecord = Awaited<
  ReturnType<typeof listMediaContacts>
>[number];

export interface MediaContactInput {
  id?: string;
  name: string;
  outlet: string;
  role: string;
  beat: string;
  email: string;
  phone: string;
  notes: string;
  isActive: boolean;
}

export async function saveMediaContact(input: MediaContactInput) {
  const name = input.name.trim().slice(0, 120);
  const outlet = input.outlet.trim().slice(0, 120);
  if (!name || !outlet) throw new Error(serverMessages.mediaContactInvalid);
  const email = input.email.trim().toLowerCase();
  if (email && !isValidEmail(email))
    throw new Error(serverMessages.customerEmailInvalid);
  const data = {
    name,
    outlet,
    role: input.role.trim().slice(0, 80) || null,
    beat: input.beat.trim().slice(0, 80) || null,
    email: email || null,
    phone: input.phone.trim().slice(0, 40) || null,
    notes: input.notes.trim().slice(0, 2000) || null,
    isActive: input.isActive,
  };
  return input.id
    ? db.mediaContact.update({ where: { id: input.id }, data })
    : db.mediaContact.create({ data });
}

// ─── Coverage ────────────────────────────────────────────────────────────────────────────────────────────────────

export async function listCoverage() {
  const rows = await db.mediaCoverage.findMany({
    orderBy: { publishedOn: "desc" },
    take: 300,
  });
  const articles = await db.cmsArticle.findMany({
    where: {
      id: { in: rows.map((r) => r.articleId).filter((v): v is string => !!v) },
    },
    select: { id: true, titleEn: true, titleAr: true },
  });
  return rows.map((r) => {
    const article = articles.find((a) => a.id === r.articleId);
    return {
      id: r.id,
      title: r.title,
      outlet: r.outlet,
      url: r.url ?? "",
      published_on: r.publishedOn.toISOString().slice(0, 10),
      reach: r.reach,
      sentiment: r.sentiment,
      article_id: r.articleId ?? "",
      article_en: article?.titleEn ?? "",
      article_ar: article?.titleAr ?? "",
      notes: r.notes ?? "",
    };
  });
}
export type CoverageRecord = Awaited<ReturnType<typeof listCoverage>>[number];

export interface CoverageInput {
  id?: string;
  title: string;
  outlet: string;
  url: string;
  publishedOn: string;
  reach: string;
  sentiment: string;
  articleId?: string;
  notes: string;
}

export async function saveCoverage(input: CoverageInput, userId: string) {
  const title = input.title.trim().slice(0, 300);
  const outlet = input.outlet.trim().slice(0, 120);
  if (
    !title ||
    !outlet ||
    !/^\d{4}-\d{2}-\d{2}$/.test(input.publishedOn) ||
    !(COVERAGE_SENTIMENTS as readonly string[]).includes(input.sentiment)
  )
    throw new Error(serverMessages.coverageInvalid);
  const url = input.url.trim();
  if (url && !/^https?:\/\/\S+$/.test(url))
    throw new Error(serverMessages.coverageInvalid);
  const reach = input.reach.trim() ? Number(input.reach) : null;
  if (reach !== null && (!Number.isInteger(reach) || reach < 0))
    throw new Error(serverMessages.coverageInvalid);
  const data = {
    title,
    outlet,
    url: url || null,
    publishedOn: new Date(`${input.publishedOn}T00:00:00Z`),
    reach,
    sentiment: input.sentiment,
    articleId: input.articleId || null,
    notes: input.notes.trim().slice(0, 2000) || null,
  };
  return input.id
    ? db.mediaCoverage.update({ where: { id: input.id }, data })
    : db.mediaCoverage.create({ data: { ...data, createdById: userId } });
}

/** Coverage totals: pieces, audience reached and the mix of sentiment, over a window of days. */
export async function coverageSummary(days = 90, now = new Date()) {
  const since = new Date(now.getTime() - days * 86_400_000);
  const rows = await db.mediaCoverage.findMany({
    where: { publishedOn: { gte: since } },
    select: { reach: true, sentiment: true },
  });
  return {
    pieces: rows.length,
    reach: rows.reduce((sum, r) => sum + (r.reach ?? 0), 0),
    positive: rows.filter((r) => r.sentiment === "positive").length,
    neutral: rows.filter((r) => r.sentiment === "neutral").length,
    negative: rows.filter((r) => r.sentiment === "negative").length,
  };
}

/** Press releases: published articles in the press_release category, newest first (also for the website's press page). */
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

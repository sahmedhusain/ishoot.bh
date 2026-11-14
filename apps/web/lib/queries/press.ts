import { randomUUID } from "node:crypto";
import { serverMessages } from "@platform/locales";
import {
  getContentSnapshot,
  listArticles,
  saveContentDraft,
} from "@platform/api-client";
import { isValidEmail } from "../constants/validation";
import { safeWebsiteUrl } from "../website-config";

const COVERAGE_SENTIMENTS = ["positive", "neutral", "negative"] as const;
export type CoverageSentiment = (typeof COVERAGE_SENTIMENTS)[number];

export function isCoverageSentiment(val: unknown): val is CoverageSentiment {
  return (
    typeof val === "string" &&
    (COVERAGE_SENTIMENTS as readonly string[]).includes(val)
  );
}

export interface MediaContactRecord {
  id: string;
  name: string;
  outlet: string;
  role: string;
  beat: string;
  email: string;
  phone: string;
  notes: string;
  is_active: boolean;
}

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

export interface CoverageRecord {
  id: string;
  title: string;
  outlet: string;
  url: string;
  published_on: string;
  reach: number | null;
  sentiment: CoverageSentiment;
  article_id: string;
  article_en: string;
  article_ar: string;
  notes: string;
}

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

function mapMediaContact(raw: any): MediaContactRecord {
  return {
    id: String(raw?.id ?? ""),
    name: String(raw?.name ?? ""),
    outlet: String(raw?.outlet ?? ""),
    role: String(raw?.role ?? ""),
    beat: String(raw?.beat ?? ""),
    email: String(raw?.email ?? ""),
    phone: String(raw?.phone ?? ""),
    notes: String(raw?.notes ?? ""),
    is_active: raw?.is_active ?? raw?.isActive ?? true,
  };
}

export async function listMediaContacts(): Promise<MediaContactRecord[]> {
  try {
    const snap = await getContentSnapshot("main");
    const list = Array.isArray(snap?.draft?.pressContacts)
      ? snap.draft.pressContacts
      : [];
    return list
      .map(mapMediaContact)
      .sort((a: MediaContactRecord, b: MediaContactRecord) =>
        a.name.localeCompare(b.name),
      );
  } catch (e) {
    console.error("Failed to list media contacts:", e);
    return [];
  }
}

export async function saveMediaContact(input: MediaContactInput) {
  const name = input.name.trim().slice(0, 120);
  if (!name)
    throw new Error(
      (serverMessages as any).mediaContactInvalid ?? serverMessages.invalidInput,
    );
  const email = input.email.trim().toLowerCase();
  if (email && !isValidEmail(email))
    throw new Error(serverMessages.customerEmailInvalid);

  const snap = await getContentSnapshot("main").catch(() => null);
  const currentDraft = (snap?.draft as Record<string, any>) ?? {};
  const list = Array.isArray(currentDraft.pressContacts)
    ? [...currentDraft.pressContacts].map(mapMediaContact)
    : [];

  const record: MediaContactRecord = {
    id: input.id || randomUUID(),
    name,
    outlet: input.outlet.trim().slice(0, 120),
    role: input.role.trim().slice(0, 80),
    beat: input.beat.trim().slice(0, 80),
    email,
    phone: input.phone.trim().slice(0, 40),
    notes: input.notes.trim().slice(0, 2000),
    is_active: input.isActive,
  };

  const idx = input.id ? list.findIndex((c) => c.id === input.id) : -1;
  if (idx !== -1) list[idx] = record;
  else list.push(record);

  await saveContentDraft("", "main", {
    ...currentDraft,
    pressContacts: list,
  });
  return record;
}

function mapCoverage(
  raw: any,
  articleMap: Map<string, { titleEn: string; titleAr: string }>,
): CoverageRecord {
  const articleId = String(raw?.article_id ?? raw?.articleId ?? "");
  const article = articleId ? articleMap.get(articleId) : undefined;
  return {
    id: String(raw?.id ?? ""),
    title: String(raw?.title ?? ""),
    outlet: String(raw?.outlet ?? ""),
    url: String(raw?.url ?? ""),
    published_on: String(raw?.published_on ?? raw?.publishedOn ?? "").slice(
      0,
      10,
    ),
    reach:
      raw?.reach === null || raw?.reach === undefined || raw?.reach === ""
        ? null
        : Number(raw.reach),
    sentiment: isCoverageSentiment(raw?.sentiment)
      ? raw.sentiment
      : "neutral",
    article_id: articleId,
    article_en: article?.titleEn ?? raw?.article_en ?? "",
    article_ar: article?.titleAr ?? raw?.article_ar ?? "",
    notes: String(raw?.notes ?? ""),
  };
}

export async function listCoverage(): Promise<CoverageRecord[]> {
  try {
    const [snap, articles] = await Promise.all([
      getContentSnapshot("main").catch(() => null),
      listArticles(true).catch(() => []),
    ]);
    const articleMap = new Map<string, { titleEn: string; titleAr: string }>(
      articles.map((a: any): [string, { titleEn: string; titleAr: string }] => [
        String(a.id),
        { titleEn: String(a.titleEn ?? ""), titleAr: String(a.titleAr ?? "") },
      ]),
    );
    const list = Array.isArray(snap?.draft?.pressCoverage)
      ? snap.draft.pressCoverage
      : [];
    return list
      .map((r: any) => mapCoverage(r, articleMap))
      .sort((a: CoverageRecord, b: CoverageRecord) =>
        b.published_on.localeCompare(a.published_on),
      );
  } catch (e) {
    console.error("Failed to list coverage:", e);
    return [];
  }
}

export async function saveCoverage(input: CoverageInput, userId: string) {
  const title = input.title.trim().slice(0, 300);
  const outlet = input.outlet.trim().slice(0, 120);
  const coverageInvalidMsg =
    (serverMessages as any).coverageInvalid ?? serverMessages.invalidInput;
  if (!title || !outlet) throw new Error(coverageInvalidMsg);
  if (!isCoverageSentiment(input.sentiment))
    throw new Error(coverageInvalidMsg);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.publishedOn))
    throw new Error(coverageInvalidMsg);
  const url = input.url.trim();
  if (url && !safeWebsiteUrl(url))
    throw new Error(
      (serverMessages as any).invalidWebsiteUrl ?? serverMessages.invalidMediaUrl,
    );
  const reachRaw = input.reach.trim();
  const reach = reachRaw ? Number(reachRaw) : null;
  if (
    reach !== null &&
    (!Number.isInteger(reach) || reach < 0 || reach > 1_000_000_000)
  )
    throw new Error(coverageInvalidMsg);

  const [snap, articles] = await Promise.all([
    getContentSnapshot("main").catch(() => null),
    listArticles(true).catch(() => []),
  ]);
  const articleMap = new Map<string, { titleEn: string; titleAr: string }>(
    articles.map((a: any): [string, { titleEn: string; titleAr: string }] => [
      String(a.id),
      { titleEn: String(a.titleEn ?? ""), titleAr: String(a.titleAr ?? "") },
    ]),
  );
  const currentDraft = (snap?.draft as Record<string, any>) ?? {};
  const list = Array.isArray(currentDraft.pressCoverage)
    ? [...currentDraft.pressCoverage]
    : [];

  const entry = {
    id: input.id || randomUUID(),
    title,
    outlet,
    url,
    published_on: input.publishedOn,
    reach,
    sentiment: input.sentiment,
    article_id: input.articleId || "",
    notes: input.notes.trim().slice(0, 2000),
    created_by_id: userId,
  };

  const idx = input.id ? list.findIndex((c: any) => c.id === input.id) : -1;
  if (idx !== -1) list[idx] = entry;
  else list.push(entry);

  await saveContentDraft("", "main", {
    ...currentDraft,
    pressCoverage: list,
  });
  return mapCoverage(entry, articleMap);
}

export async function coverageSummary(days = 90, now = new Date()) {
  const since = new Date(now.getTime() - days * 86_400_000)
    .toISOString()
    .slice(0, 10);
  const all = await listCoverage();
  const rows = all.filter((r) => r.published_on >= since);
  return {
    pieces: rows.length,
    reach: rows.reduce((sum, r) => sum + (r.reach ?? 0), 0),
    positive: rows.filter((r) => r.sentiment === "positive").length,
    neutral: rows.filter((r) => r.sentiment === "neutral").length,
    negative: rows.filter((r) => r.sentiment === "negative").length,
  };
}

export async function listPressReleases(onlyPublished = false) {
  const now = new Date();
  const articles = await listArticles(!onlyPublished).catch(() => []);
  return articles
    .filter((a) => a.category === "press_release")
    .filter(
      (a) =>
        !onlyPublished ||
        (a.status === "published" &&
          (!a.publishAt || new Date(a.publishAt) <= now)),
    )
    .sort((a, b) =>
      String(b.publishAt ?? b.createdAt).localeCompare(
        String(a.publishAt ?? a.createdAt),
      ),
    )
    .map((a) => ({
      id: a.id,
      slug: a.slug,
      title_en: a.titleEn,
      title_ar: a.titleAr,
      excerpt_en: a.excerptEn ?? "",
      excerpt_ar: a.excerptAr ?? "",
      status: a.status,
      date: new Date(a.publishAt ?? a.createdAt).toISOString(),
    }));
}

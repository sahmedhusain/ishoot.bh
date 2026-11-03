import { apiUrl, apiTimeoutMs } from "./config";
import { apiError } from "./errors";
import { serviceToken } from "./service-token";

export type CMSPage = {
  id: string;
  slug: string;
  pageType: string;
  titleEn: string;
  titleAr: string;
  seoTitleEn?: string | null;
  seoTitleAr?: string | null;
  seoDescriptionEn?: string | null;
  seoDescriptionAr?: string | null;
  blocks: any[];
  isVisible: boolean;
  inHeader: boolean;
  inFooter: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type CMSArticle = {
  id: string;
  slug: string;
  titleEn: string;
  titleAr: string;
  excerptEn?: string | null;
  excerptAr?: string | null;
  bodyEn?: any;
  bodyAr?: any;
  bodyHtmlEn?: string | null;
  bodyHtmlAr?: string | null;
  coverUrl?: string | null;
  category: string;
  tags: string[];
  authorName?: string | null;
  status: string;
  publishAt?: string | null;
  featured: boolean;
  seoTitleEn?: string | null;
  seoTitleAr?: string | null;
  seoDescriptionEn?: string | null;
  seoDescriptionAr?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CMSReview = {
  id: string;
  authorEn: string;
  authorAr: string;
  companyEn?: string | null;
  companyAr?: string | null;
  quoteEn: string;
  quoteAr: string;
  rating: number;
  isApproved: boolean;
  sortOrder: number;
  year: string;
  createdAt: string;
};

export type CMSFAQ = {
  id: string;
  questionEn: string;
  questionAr: string;
  answerEn: string;
  answerAr: string;
  category: string;
  isPublished: boolean;
  sortOrder: number;
  createdAt: string;
};

export type CMSStatistic = {
  id: string;
  metricValue: string;
  labelEn: string;
  labelAr: string;
  subLabelEn?: string | null;
  subLabelAr?: string | null;
  icon?: string | null;
  sortOrder: number;
};

export type CMSContentSnapshot = {
  id: string;
  draft: any;
  published: any;
  revision: number;
  publishedAt?: string | null;
  updatedAt: string;
};

async function cmsFetch<T>(
  path: string,
  options: RequestInit = {},
  token?: string,
): Promise<T> {
  const headers = new Headers(options.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  } else {
    try {
      const st = await serviceToken();
      if (st) headers.set("Authorization", `Bearer ${st}`);
    } catch {
      // Allow unauthenticated calls for public CMS routes
    }
  }
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`${apiUrl()}${path}`, {
    ...options,
    headers,
    signal: AbortSignal.timeout(apiTimeoutMs()),
  });

  if (!res.ok) {
    let errBody: unknown;
    try {
      errBody = await res.json();
    } catch {
      // non-JSON error
    }
    throw await apiError(res, errBody);
  }

  if (res.status === 204) {
    return undefined as unknown as T;
  }
  return res.json() as Promise<T>;
}

// Pages
export const getPageBySlug = (slug: string) =>
  cmsFetch<CMSPage>(`/v1/cms/pages/${encodeURIComponent(slug)}`);

export const getPageByID = (token: string, id: string) =>
  cmsFetch<CMSPage>(`/v1/cms/pages/id/${encodeURIComponent(id)}`, {}, token);

export const listPages = (all = false) =>
  cmsFetch<CMSPage[]>(`/v1/cms/pages?all=${all}`);

export const createPage = (token: string, input: Partial<CMSPage>) =>
  cmsFetch<CMSPage>("/v1/cms/pages", { method: "POST", body: JSON.stringify(input) }, token);

export const updatePage = (token: string, id: string, input: Partial<CMSPage>) =>
  cmsFetch<CMSPage>(`/v1/cms/pages/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(input) }, token);

export const deletePage = (token: string, id: string) =>
  cmsFetch<void>(`/v1/cms/pages/${encodeURIComponent(id)}`, { method: "DELETE" }, token);

// Articles
export const getArticleBySlug = (slug: string) =>
  cmsFetch<CMSArticle>(`/v1/cms/articles/${encodeURIComponent(slug)}`);

export const getArticleByID = (token: string, id: string) =>
  cmsFetch<CMSArticle>(`/v1/cms/articles/id/${encodeURIComponent(id)}`, {}, token);

export const listArticles = (all = false) =>
  cmsFetch<CMSArticle[]>(`/v1/cms/articles?all=${all}`);

export const createArticle = (token: string, input: Partial<CMSArticle>) =>
  cmsFetch<CMSArticle>("/v1/cms/articles", { method: "POST", body: JSON.stringify(input) }, token);

export const updateArticle = (token: string, id: string, input: Partial<CMSArticle>) =>
  cmsFetch<CMSArticle>(`/v1/cms/articles/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(input) }, token);

export const deleteArticle = (token: string, id: string) =>
  cmsFetch<void>(`/v1/cms/articles/${encodeURIComponent(id)}`, { method: "DELETE" }, token);

// Reviews
export const listReviews = (all = false) =>
  cmsFetch<CMSReview[]>(`/v1/cms/reviews?all=${all}`);

export const createReview = (token: string, input: Partial<CMSReview>) =>
  cmsFetch<CMSReview>("/v1/cms/reviews", { method: "POST", body: JSON.stringify(input) }, token);

export const updateReview = (token: string, id: string, input: Partial<CMSReview>) =>
  cmsFetch<CMSReview>(`/v1/cms/reviews/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(input) }, token);

export const deleteReview = (token: string, id: string) =>
  cmsFetch<void>(`/v1/cms/reviews/${encodeURIComponent(id)}`, { method: "DELETE" }, token);

// FAQs
export const listFAQs = (all = false) =>
  cmsFetch<CMSFAQ[]>(`/v1/cms/faqs?all=${all}`);

export const createFAQ = (token: string, input: Partial<CMSFAQ>) =>
  cmsFetch<CMSFAQ>("/v1/cms/faqs", { method: "POST", body: JSON.stringify(input) }, token);

export const updateFAQ = (token: string, id: string, input: Partial<CMSFAQ>) =>
  cmsFetch<CMSFAQ>(`/v1/cms/faqs/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(input) }, token);

export const deleteFAQ = (token: string, id: string) =>
  cmsFetch<void>(`/v1/cms/faqs/${encodeURIComponent(id)}`, { method: "DELETE" }, token);

// Statistics
export const listStatistics = () =>
  cmsFetch<CMSStatistic[]>("/v1/cms/statistics");

export const upsertStatistic = (token: string, input: CMSStatistic) =>
  cmsFetch<CMSStatistic>("/v1/cms/statistics", { method: "POST", body: JSON.stringify(input) }, token);

export const deleteStatistic = (token: string, id: string) =>
  cmsFetch<void>(`/v1/cms/statistics/${encodeURIComponent(id)}`, { method: "DELETE" }, token);

// Content Snapshots
export const getContentSnapshot = (id = "main") =>
  cmsFetch<CMSContentSnapshot>(`/v1/cms/snapshots/${encodeURIComponent(id)}`);

export const saveContentDraft = (token: string, id: string, draft: any) =>
  cmsFetch<CMSContentSnapshot>(`/v1/cms/snapshots/${encodeURIComponent(id)}/draft`, { method: "PUT", body: JSON.stringify(draft) }, token);

export const publishContentSnapshot = (token: string, id: string) =>
  cmsFetch<CMSContentSnapshot>(`/v1/cms/snapshots/${encodeURIComponent(id)}/publish`, { method: "POST" }, token);

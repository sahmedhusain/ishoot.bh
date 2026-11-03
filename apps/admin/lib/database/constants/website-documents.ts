import { serverMessages } from "@platform/locales";

export interface WebsiteDocument {
  titleEn: string;
  titleAr: string;
  itemSlug: string;
  url: string;
}
export const PUBLIC_DOCUMENT_PATH =
  /^\/api\/files\/brand\/[a-zA-Z0-9_-]+\.pdf$/;
export function validateWebsiteDocuments(value: unknown): WebsiteDocument[] {
  if (!Array.isArray(value) || value.length > 100)
    throw new Error(serverMessages.invalidInput);
  return value.map((raw) => {
    if (!raw || typeof raw !== "object")
      throw new Error(serverMessages.invalidInput);
    const text = (key: string, max: number) => {
      if (typeof raw[key] !== "string" || raw[key].length > max)
        throw new Error(serverMessages.invalidInput);
      return raw[key].trim();
    };
    const doc = {
      titleEn: text("titleEn", 200),
      titleAr: text("titleAr", 200),
      itemSlug: text("itemSlug", 150),
      url: text("url", 2000),
    };
    if (
      !doc.titleEn ||
      !doc.titleAr ||
      (doc.itemSlug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(doc.itemSlug))
    )
      throw new Error(serverMessages.invalidInput);
    if (!PUBLIC_DOCUMENT_PATH.test(doc.url)) {
      let url: URL;
      try {
        url = new URL(doc.url);
      } catch {
        throw new Error(serverMessages.invalidMediaUrl);
      }
      if (url.protocol !== "https:" || url.username || url.password)
        throw new Error(serverMessages.invalidMediaUrl);
    }
    return doc;
  });
}

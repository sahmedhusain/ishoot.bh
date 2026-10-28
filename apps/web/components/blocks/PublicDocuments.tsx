import { Download } from "lucide-react";
import { getTranslations } from "@platform/locales";
import { getSite } from "../../lib/site";

export async function PublicDocuments({
  locale,
  itemSlug = "",
  title,
}: {
  locale: string;
  itemSlug?: string;
  title?: string;
}) {
  const { config } = await getSite();
  if (!config.commerce.capabilities.downloads) return null;
  const documents = (config.documents ?? []).filter(
    (doc) => doc.itemSlug === itemSlug,
  );
  if (!documents.length) return null;
  const t = getTranslations(locale as "en" | "ar");
  return (
    <section className="space-y-4">
      <h2 className="text-xl sm:text-2xl font-semibold">
        {title || t.common.documentsAndDownloads}
      </h2>
      <ul className="divide-y divide-m3-outline-variant">
        {documents.map((doc, index) => (
          <li key={index}>
            <a
              href={doc.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 min-h-14 py-3 text-m3-primary hover:underline"
            >
              <Download aria-hidden="true" className="h-5 w-5 shrink-0" />
              <bdi>{locale === "ar" ? doc.titleAr : doc.titleEn}</bdi>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

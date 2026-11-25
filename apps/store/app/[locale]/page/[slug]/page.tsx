import { notFound } from "next/navigation";
import { getStoreSettings } from "@platform/database";
import { pickText } from "@platform/database/constants/languages";
import { getStorePolicyDoc } from "../../../../lib/store-policy-pages";
import { getSite } from "../../../../lib/site";
import { PolicyDocumentView } from "../../../../components/shared/PolicyDocumentView";

export default async function InfoPageBySlug({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const [{ company, website }, settings] = await Promise.all([
    getSite(),
    getStoreSettings().catch(() => null),
  ]);

  if (slug === "faq" || slug === "payment-methods") {
    const doc = getStorePolicyDoc(slug, locale, {
      crNumber: settings?.cr_number,
      companyName: pickText(company?.company_name_en, company?.company_name_ar, locale),
    });
    return (
      <PolicyDocumentView
        locale={locale}
        doc={doc}
        crNumber={settings?.cr_number}
        sslBadgeEnabled={settings?.ssl_badge_enabled ?? true}
      />
    );
  }

  const cmsPage = (website?.pages ?? []).find((p) => p.slug === slug);
  if (!cmsPage) notFound();

  const title = pickText(cmsPage.title_en, cmsPage.title_ar, locale) || slug;
  const subtitle = pickText(cmsPage.seo_description_en, cmsPage.seo_description_ar, locale);
  const blocks = (cmsPage.blocks ?? [])
    .filter((b) => Boolean(b.data))
    .map((b) => {
      const data = b.data as Record<string, unknown>;
      return {
        heading: pickText(
          String(data.headingEn ?? data.titleEn ?? ""),
          String(data.headingAr ?? data.titleAr ?? ""),
          locale,
        ),
        body: pickText(
          String(data.bodyEn ?? data.textEn ?? ""),
          String(data.bodyAr ?? data.textAr ?? ""),
          locale,
        ),
      };
    })
    .filter((s) => Boolean(s.heading || s.body));

  return (
    <PolicyDocumentView
      locale={locale}
      doc={{
        badge: pickText(company?.company_name_en, company?.company_name_ar, locale),
        title,
        subtitle,
        sections: blocks.length
          ? blocks
          : [{ heading: title, body: subtitle || title }],
      }}
      crNumber={settings?.cr_number}
      sslBadgeEnabled={settings?.ssl_badge_enabled ?? true}
    />
  );
}

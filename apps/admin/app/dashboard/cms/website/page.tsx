import { requirePagePermission } from "../../../../lib/auth";
import { requireFeatureEnabled, getWebsiteEditor, getWebsitePublicationStatus, getCompanySettings, sampleContentCount, getPortfolioCategories, getAllServices } from "@platform/database";
import { resolveWebsiteConfig, validateWebsiteConfig } from "@platform/database/website-config";
import { WebsiteEditor } from "../../../../components/cms/WebsiteEditor";
import { pageMetadata } from "../../../../lib/company-metadata";

export const generateMetadata = () => pageMetadata("cms/website");

export const dynamic = "force-dynamic";
export default async function WebsitePage() {
  await requirePagePermission("settings", "read");
  await requireFeatureEnabled("cms");
  const [content, rawServices, delivery, publication, company, sampleCount, categories] = await Promise.all([
    getWebsiteEditor(),
    getAllServices({ isActive: true }).catch(() => []),
    Promise.resolve(null),
    getWebsitePublicationStatus(),
    getCompanySettings(),
    sampleContentCount(),
    getPortfolioCategories(),
  ]);
  const services = rawServices.map((s) => ({
    id: s.id,
    nameEn: s.name_en || s.nameEn || "",
    nameAr: s.name_ar || s.nameAr || "",
    isPublic: s.is_public ?? s.isPublic ?? true,
    imageUrl: s.image_url ?? s.imageUrl ?? null,
  }));
  return (
    <WebsiteEditor
      categories={categories}
      deliveryStatus={(delivery as any)?.status}
      publication={publication}
      config={resolveWebsiteConfig(validateWebsiteConfig(content.draft), company.theme.websiteMode)}
      company={{
        languages: company.content_languages,
        primaryLanguage: company.primary_language,
        activity: company.business_activity,
        hasWhatsapp: !!company.whatsapp_phone,
      }}
      revision={content.revision}
      publishedAt={content.publishedAt?.toISOString()}
      canRestore={!!content.previous}
      services={services}
      sampleCount={sampleCount}
    />
  );
}

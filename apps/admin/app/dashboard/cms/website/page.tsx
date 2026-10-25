import { requirePagePermission } from "../../../../lib/auth";
import { requireFeatureEnabled, db, getWebsiteEditor, getWebsitePublicationStatus, getCompanySettings, sampleContentCount } from "@platform/database";
import { resolveWebsiteConfig, validateWebsiteConfig } from "@platform/database/website-config";
import { WebsiteEditor } from "../../../../components/cms/WebsiteEditor";
export const dynamic = "force-dynamic";
export default async function WebsitePage() {
  await requirePagePermission("settings", "read");
  await requireFeatureEnabled("cms");
  const [content, services, delivery, publication, company, sampleCount] = await Promise.all([
    getWebsiteEditor(),
    db.service.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: "asc" },
      select: {
        id: true,
        nameEn: true,
        nameAr: true,
        isPublic: true,
        imageUrl: true,
      },
    }),
    db.revalidationJob.findFirst({
      where: { eventKey: { startsWith: "website:" } },
      orderBy: { createdAt: "desc" },
      select: { status: true },
    }),
    getWebsitePublicationStatus(),
    getCompanySettings(),
    sampleContentCount(),
  ]);
  return (
    <WebsiteEditor
      deliveryStatus={delivery?.status}
      publication={publication}
      config={resolveWebsiteConfig(validateWebsiteConfig(content.draft))}
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

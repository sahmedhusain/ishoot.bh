import { requirePagePermission } from "../../../../lib/auth";
import { requireFeatureEnabled, db, getWebsiteEditor, getWebsitePublicationStatus } from "@platform/database";
import { validateWebsiteConfig } from "@platform/database/website-config";
import { WebsiteEditor } from "../../../../components/cms/WebsiteEditor";
export const dynamic = "force-dynamic";
export default async function WebsitePage() {
  await requirePagePermission("settings", "read");
  await requireFeatureEnabled("cms");
  const [content, services, delivery, publication] = await Promise.all([
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
  ]);
  return (
    <WebsiteEditor
      deliveryStatus={delivery?.status}
      publication={publication}
      config={validateWebsiteConfig(content.draft)}
      revision={content.revision}
      publishedAt={content.publishedAt?.toISOString()}
      canRestore={!!content.previous}
      services={services}
    />
  );
}

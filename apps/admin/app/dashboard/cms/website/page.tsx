import { requirePermission } from "../../../../lib/auth";
import { requireFeatureEnabled, db, getWebsiteEditor } from "@ishoot/database";
import { validateWebsiteConfig } from "@ishoot/database/website-config";
import { WebsiteEditor } from "../../../../components/cms/WebsiteEditor";
export const dynamic = "force-dynamic";
export default async function WebsitePage() {
  await requirePermission("settings", "read");
  await requireFeatureEnabled("cms");
  const [content, services, delivery] = await Promise.all([
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
  ]);
  return (
    <WebsiteEditor
      deliveryStatus={delivery?.status}
      config={validateWebsiteConfig(content.draft)}
      revision={content.revision}
      publishedAt={content.publishedAt?.toISOString()}
      canRestore={!!content.previous}
      services={services}
    />
  );
}

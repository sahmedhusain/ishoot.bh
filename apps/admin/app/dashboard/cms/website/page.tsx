import { requirePermission } from "../../../../lib/auth";
import { db, getWebsiteEditor } from "@ishoot/database";
import { validateWebsiteConfig } from "@ishoot/database/website-config";
import { WebsiteEditor } from "../../../../components/cms/WebsiteEditor";
export const dynamic = "force-dynamic";
export default async function WebsitePage() {
  await requirePermission("settings", "read");
  const [content, services] = await Promise.all([
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
  ]);
  return (
    <WebsiteEditor
      config={validateWebsiteConfig(content.draft)}
      revision={content.revision}
      publishedAt={content.publishedAt?.toISOString()}
      canRestore={!!content.previous}
      services={services}
    />
  );
}

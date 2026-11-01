import { getArticlesPage, getWebsitePublicationStatus, requireFeatureEnabled } from "@platform/database";
import { hasPermission, requirePagePermission } from "../../../../lib/auth";
import { ArticlesListView } from "../../../../components/cms/ArticlesListView";
import { pageMetadata } from "../../../../lib/company-metadata";

export const generateMetadata = () => pageMetadata("cms/articles");

export const dynamic = "force-dynamic";

export default async function CmsArticlesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requirePagePermission("articles", "read");
  await requireFeatureEnabled("cms");
  const query = await searchParams;
  const text = (key: string) => (typeof query[key] === "string" ? (query[key] as string) : "");
  const filters = { q: text("q"), status: text("status") || "all", category: text("category") || "all" };
  const [result, publication, canCreate, canPublish] = await Promise.all([
    getArticlesPage({ ...filters, page: Number(text("page")) || 1 }),
    getWebsitePublicationStatus(),
    hasPermission("articles", "create"),
    hasPermission("settings", "write"),
  ]);
  return <ArticlesListView articles={result.items} total={result.total} page={result.page} pageSize={result.pageSize} filters={filters} canCreate={canCreate} canPublish={canPublish} publication={publication} />;
}

import { requireAuth } from "../../../lib/auth";
import { getCompanyDirectory, getDepartmentTree } from "@platform/database";
import { DirectoryView } from "../../../components/directory/DirectoryView";
import { pageMetadata } from "../../../lib/company-metadata";

export const generateMetadata = () => pageMetadata("directory");

export const dynamic = "force-dynamic";

export default async function DirectoryPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAuth();
  const query = await searchParams;
  const text = (key: string) => (typeof query[key] === "string" ? (query[key] as string) : undefined);
  const [result, departments] = await Promise.all([
    getCompanyDirectory({ q: text("q"), departmentId: text("departmentId"), page: Number(text("page")) || 1 }),
    getDepartmentTree(),
  ]);
  return (
    <DirectoryView
      entries={result.items}
      total={result.total}
      page={result.page}
      pageSize={result.pageSize}
      filters={result.filters}
      departments={departments.filter((d) => d.is_active).map(({ id, name_en, name_ar }) => ({ id, name_en, name_ar }))}
    />
  );
}

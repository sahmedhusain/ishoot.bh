import { db, getDocumentArchivePage, listCustomFoldersForUser } from "@platform/database";
import { hasPermission, requireAuth } from "../../../lib/auth";
import { archiveKindsForCurrentUser } from "../../../lib/archive-access";
import { CompanyArchiveView } from "../../../components/archive/CompanyArchiveView";
import { ForbiddenView } from "../../../components/shared/ForbiddenView";

export const dynamic = "force-dynamic";

/** Every document the company keeps, limited to the kinds the viewer's permissions cover. */
export default async function ArchiveVaultPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireAuth();
  const kinds = await archiveKindsForCurrentUser();
  if (!kinds.length) return <ForbiddenView />;
  const u = await db.user.findUnique({
    where: { id: user.id },
    select: { departmentId: true },
  });
  const [result, exportKinds, canUpload, customFolders] = await Promise.all([
    getDocumentArchivePage(await searchParams, kinds),
    archiveKindsForCurrentUser(["read", "export"]),
    hasPermission("settings", "create"),
    listCustomFoldersForUser({
      userId: user.id,
      role: user.role,
      departmentId: u?.departmentId ?? null,
    }),
  ]);
  return (
    <CompanyArchiveView
      {...result}
      kinds={kinds}
      canExport={exportKinds.length > 0}
      canUpload={canUpload}
      customFolders={customFolders}
    />
  );
}

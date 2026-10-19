import { notFound } from "next/navigation";
import {
  getOfficialLetter,
  listLetterTemplates,
  findPendingApproval,
  canDecideApproval,
  getSignatureMode,
} from "@platform/database";
import { requireAuth, hasPermission } from "../../../../lib/auth";
import { letterEmployees } from "../../../../lib/communication-options";
import { LetterWorkspace } from "../../../../components/communications/LetterWorkspace";
import { ForbiddenView } from "../../../../components/shared/ForbiddenView";
export const dynamic = "force-dynamic";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await requireAuth();
  const { id } = await params;
  const [letter, pending, canRead, canEdit, canDelete, canExport, mode] =
    await Promise.all([
      getOfficialLetter(id),
      findPendingApproval("official_letter", id),
      hasPermission("letters", "read"),
      hasPermission("letters", "edit"),
      hasPermission("letters", "delete"),
      hasPermission("letters", "export"),
      getSignatureMode("official_letter"),
    ]);
  if (!letter) notFound();
  const decide = !!pending && canDecideApproval(pending, actor);
  if (!canRead && !decide) return <ForbiddenView />;
  return (
    <LetterWorkspace
      letter={letter}
      templates={canEdit ? await listLetterTemplates(false) : []}
      employees={
        canEdit && (await hasPermission("employees", "read"))
          ? await letterEmployees()
          : []
      }
      canEdit={canEdit}
      canDelete={canDelete}
      canExport={canExport}
      approvalId={decide ? pending!.id : null}
      live={mode === "live"}
    />
  );
}

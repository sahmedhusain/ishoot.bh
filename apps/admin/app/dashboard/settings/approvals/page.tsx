import { ROUTES } from "../../../../constants/routes";
import { redirect } from "next/navigation";
import { requirePermission } from "../../../../lib/auth";
import { listApprovalPolicies, db } from "@ishoot/database";
import { ApprovalPoliciesView } from "../../../../components/settings/ApprovalPoliciesView";

export const dynamic = "force-dynamic";

export default async function ApprovalPoliciesPage() {
  const actor = await requirePermission("settings", "read");
  if (actor.role !== "super_admin") redirect(ROUTES.settings.root);

  const [policies, users] = await Promise.all([
    listApprovalPolicies(),
    db.user.findMany({ where: { isActive: true }, select: { id: true, fullName: true, role: true }, orderBy: { fullName: "asc" } }),
  ]);

  return <ApprovalPoliciesView policies={policies} users={users} />;
}

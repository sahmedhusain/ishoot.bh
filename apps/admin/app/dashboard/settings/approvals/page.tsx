import { ROUTES } from "../../../../constants/routes";
import { redirect } from "next/navigation";
import { requirePagePermission } from "../../../../lib/auth";
import {
  listApprovalPolicies,
  listSignaturePolicies,
  db,
} from "@platform/database";
import { ApprovalPoliciesView } from "../../../../components/settings/ApprovalPoliciesView";
import { SignaturePoliciesPanel } from "../../../../components/settings/SignaturePoliciesPanel";
import { pageMetadata } from "../../../../lib/company-metadata";

export const generateMetadata = () => pageMetadata("settings/approvals");

export const dynamic = "force-dynamic";

export default async function ApprovalPoliciesPage() {
  const actor = await requirePagePermission("settings", "read");
  if (actor.role !== "super_admin") redirect(ROUTES.settings.root);

  const [policies, users, signaturePolicies] = await Promise.all([
    listApprovalPolicies(),
    db.user.findMany({
      where: { isActive: true },
      select: { id: true, fullName: true, role: true },
      orderBy: { fullName: "asc" },
    }),
    listSignaturePolicies(),
  ]);

  return (
    <div className="space-y-6">
      <ApprovalPoliciesView policies={policies} users={users} />
      <div className="max-w-5xl mx-auto">
        <SignaturePoliciesPanel policies={signaturePolicies} />
      </div>
    </div>
  );
}

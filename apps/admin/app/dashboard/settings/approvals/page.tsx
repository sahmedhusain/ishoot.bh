import { ROUTES } from "../../../../constants/routes";
import { redirect } from "next/navigation";
import { requirePagePermission } from "../../../../lib/auth";
import {
  listApprovalPolicies,
  listSignaturePolicies,
} from "@platform/database";
import { listEmployees } from "@platform/api-client";
import { ApprovalPoliciesView } from "../../../../components/settings/ApprovalPoliciesView";
import { SignaturePoliciesPanel } from "../../../../components/settings/SignaturePoliciesPanel";
import { pageMetadata } from "../../../../lib/company-metadata";

export const generateMetadata = () => pageMetadata("settings/approvals");

export const dynamic = "force-dynamic";

export default async function ApprovalPoliciesPage() {
  const actor = await requirePagePermission("settings", "read");
  if (actor.role !== "super_admin") redirect(ROUTES.settings.root);

  const [policies, rawEmployees, signaturePolicies] = await Promise.all([
    listApprovalPolicies(),
    listEmployees().catch(() => []),
    listSignaturePolicies(),
  ]);
  const users = rawEmployees.map((e) => ({
    id: e.id,
    fullName: `${e.first_name_en || ""} ${e.last_name_en || ""}`.trim() || e.id,
    role: e.job_title_en || "Staff",
  }));

  return (
    <div className="space-y-6">
      <ApprovalPoliciesView policies={policies} users={users} />
      <div className="max-w-5xl mx-auto">
        <SignaturePoliciesPanel policies={signaturePolicies} />
      </div>
    </div>
  );
}

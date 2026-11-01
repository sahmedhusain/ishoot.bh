import { notFound, redirect } from "next/navigation";
import { approvalTargetUrl } from "@platform/database";
import { requireAuth } from "../../../../../lib/auth";
import { getApprovalItem } from "../../../../../lib/approval-item";
import { ApprovalItemView } from "../../../../../components/approvals/ApprovalItemView";
import { pageMetadata } from "../../../../../lib/company-metadata";

export const generateMetadata = () => pageMetadata("approvals/[type]/[id]");

export const dynamic = "force-dynamic";

/** One request under review: what it is, who asked, the approval steps, and approve or reject right here. */
export default async function ApprovalItemPage({
  params,
}: {
  params: Promise<{ type: string; id: string }>;
}) {
  const [{ type, id }, user] = await Promise.all([params, requireAuth()]);
  const target = approvalTargetUrl(type, id);
  // Records with their own decision screen are reviewed there.
  if (!target.startsWith("/dashboard/approvals/")) redirect(target);
  const item = await getApprovalItem(type, id, user);
  if (!item) notFound();
  return <ApprovalItemView item={item} />;
}

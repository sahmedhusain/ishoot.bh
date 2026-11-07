import { RequestAttachments } from "../../../../components/requests/RequestAttachments";
import { notFound } from "next/navigation";
import { requireRecordInScope } from "../../../../lib/data-scope";
import { hasPermission, requirePagePermission } from "../../../../lib/auth";
import { getConsolidatedRequestById, findPendingApproval, canDecideApproval, listCannedReplies, requestReplies } from "@platform/database";
import { listEmployees } from "@platform/api-client";
import { ServiceReplyPanel } from "../../../../components/requests/ServiceReplyPanel";
import { RequestDetailView } from "../../../../components/requests/RequestDetailView";
import { pageMetadata } from "../../../../lib/company-metadata";

export const generateMetadata = () => pageMetadata("requests/[id]");

export const dynamic = "force-dynamic";

export default async function RequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const currentUser = await requirePagePermission("requests", "read");
  const { id } = await params;

  const [request, rawEmployees, pendingApproval, leadsWrite, contactsWrite, dealsWrite] = await Promise.all([
    getConsolidatedRequestById(id),
    listEmployees().catch(() => []),
    findPendingApproval("service_request", id),
    hasPermission("leads", "write"),
    hasPermission("contacts", "write"),
    hasPermission("deals", "write"),
  ]);

  if (!request) {
    notFound();
  }
  await requireRecordInScope("requests", request.assignedToId);

  const userList = rawEmployees.map((u) => ({
    id: u.id,
    name: `${u.first_name_en || ""} ${u.last_name_en || ""}`.trim() || u.id,
    role: u.job_title_en || "Staff",
    department: null,
  }));

  // Replying to the customer, and the order the request is about.
  const [replies, cannedReplies, canReply] = await Promise.all([
    requestReplies(id),
    listCannedReplies(true),
    hasPermission("requests", "edit"),
  ]);
  const contact = {
    email: request.email,
    phone: request.phone,
    phoneE164: request.phone,
    locale: "en",
    order: null,
  };
  const files: { id: string; fileName: string; fileUrl: string }[] = [];

  return (
    <div className="space-y-6">
      <RequestDetailView
        request={request}
        users={userList}
        currentUserId={currentUser.id}
        canDecideApproval={!!pendingApproval && canDecideApproval(pendingApproval, currentUser)}
        canSell={leadsWrite && contactsWrite && dealsWrite}
      />
      <RequestAttachments files={files} />
      <ServiceReplyPanel requestId={id} customerLocale={contact?.locale ?? "ar"} hasEmail={!!contact?.email} hasPhone={!!(contact?.phoneE164 || contact?.phone)} order={contact?.order ?? null} replies={replies} cannedReplies={cannedReplies} canReply={canReply} />
    </div>
  );
}

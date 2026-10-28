import { RequestAttachments } from "../../../../components/requests/RequestAttachments";
import { notFound } from "next/navigation";
import { requireRecordInScope } from "../../../../lib/data-scope";
import { hasPermission, requirePagePermission } from "../../../../lib/auth";
import { getConsolidatedRequestById, db, findPendingApproval, canDecideApproval, listCannedReplies, requestReplies } from "@platform/database";
import { ServiceReplyPanel } from "../../../../components/requests/ServiceReplyPanel";
import { RequestDetailView } from "../../../../components/requests/RequestDetailView";

export const dynamic = "force-dynamic";

export default async function RequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const currentUser = await requirePagePermission("requests", "read");
  const { id } = await params;

  const [request, users, pendingApproval, leadsWrite, contactsWrite, dealsWrite] = await Promise.all([
    getConsolidatedRequestById(id),
    db.user.findMany({
      where: { isActive: true },
      select: { id: true, fullName: true, role: true, department: true },
      orderBy: { fullName: "asc" },
    }),
    findPendingApproval("service_request", id),
    hasPermission("leads", "write"),
    hasPermission("contacts", "write"),
    hasPermission("deals", "write"),
  ]);

  if (!request) {
    notFound();
  }
  await requireRecordInScope("requests", request.assignedToId);

  const userList = users.map((u) => ({
    id: u.id,
    name: u.fullName,
    role: u.role,
    department: u.department,
  }));

  // Replying to the customer, and the order the request is about.
  const [contact, replies, cannedReplies, canReply, files] = await Promise.all([
    db.inquiry.findUnique({ where: { id }, select: { email: true, phone: true, phoneE164: true, locale: true, order: { select: { id: true, number: true } } } }),
    requestReplies(id),
    listCannedReplies(true),
    hasPermission("requests", "edit"),
    db.attachment.findMany({ where: { entityType: "inquiry", entityId: id }, select: { id: true, fileName: true, fileUrl: true }, orderBy: { createdAt: "asc" } }),
  ]);

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

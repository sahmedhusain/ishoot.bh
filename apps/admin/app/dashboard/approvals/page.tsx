import { requireAuth } from "../../../lib/auth";
import { readableApprovalTypes } from "../../../lib/approval-access";
import { listApprovalRequests, canDecideApproval, approvalTargetUrl, APPROVAL_TARGET_TYPES } from "@ishoot/database";
import { ApprovalsCenterView } from "../../../components/approvals/ApprovalsCenterView";
import type { ApprovalListItem, ApprovalScope } from "../../../types/approvals";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 30;

export default async function ApprovalsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireAuth();
  const query = await searchParams;
  const readable = await readableApprovalTypes();

  const requestedScope = typeof query.scope === "string" ? query.scope : "awaiting";
  const scope: ApprovalScope =
    requestedScope === "mine" ? "mine" : requestedScope === "all" && readable.length ? "all" : "awaiting";
  const status = scope === "awaiting" ? "pending" : typeof query.status === "string" ? query.status : "all";
  const rawType = typeof query.type === "string" ? query.type : "all";
  const targetType = (APPROVAL_TARGET_TYPES as readonly string[]).includes(rawType) ? rawType : undefined;
  const page = Math.max(1, Number(query.page) || 1);

  const [{ items, total }, awaitingCount, mineOpenCount] = await Promise.all([
    listApprovalRequests({
      ...(scope === "awaiting" ? { awaitingUserId: user.id } : {}),
      ...(scope === "mine" ? { requestedById: user.id } : {}),
      ...(scope === "all" ? { visibleToUserId: user.id, readableTargetTypes: readable } : {}),
      status: status === "all" ? undefined : status,
      targetType,
      page,
      pageSize: PAGE_SIZE,
    }),
    listApprovalRequests({ awaitingUserId: user.id, status: "pending", pageSize: 1 }).then((r) => r.total),
    listApprovalRequests({ requestedById: user.id, status: "pending", pageSize: 1 }).then((r) => r.total),
  ]);

  const requests: ApprovalListItem[] = items.map((item) => ({
    ...item,
    canDecide: canDecideApproval(item, user),
    href: approvalTargetUrl(item.targetType, item.targetId),
  }));

  return (
    <ApprovalsCenterView
      requests={requests}
      total={total}
      pageSize={PAGE_SIZE}
      page={page}
      scope={scope}
      status={status}
      targetType={targetType ?? "all"}
      canViewAll={readable.length > 0}
      currentUserId={user.id}
      counts={{ awaiting: awaitingCount, mine: mineOpenCount }}
    />
  );
}

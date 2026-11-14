import { notFound } from "next/navigation";
import {
  getQueueTicket,
  getTicketLinks,
  listITAccountsForIT,
  listStaffAccountsForIT,
  listStaffRef,
} from "@platform/api-client";
import { itAllowed } from "@platform/contracts";
import { asUser, requireAllowed } from "../../../../lib/session";
import { TicketView, type StaffOption } from "../../../../components/TicketView";

export default async function TicketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireAllowed("tickets", "read");
  const { id } = await params;
  const [detail, links, itAccountsPage, staffAccountsPage, staffRefs] =
    await Promise.all([
      asUser(() => getQueueTicket(user.token, id)),
      asUser(() => getTicketLinks(user.token, id)).catch(() => null),
      asUser(() => listITAccountsForIT(user.token)).catch(() => null),
      asUser(() => listStaffAccountsForIT(user.token)).catch(() => null),
      asUser(() => listStaffRef(user.token, "active")).catch(() => []),
    ]);
  if (!detail) notFound();

  const optionMap = new Map<string, StaffOption>();
  for (const acc of itAccountsPage?.items ?? []) {
    if (!acc.active) continue;
    optionMap.set(acc.id, {
      id: acc.id,
      name: acc.email.split("@")[0] || acc.email,
      email: acc.email,
      source: "it",
    });
  }
  for (const staff of staffAccountsPage?.items ?? []) {
    if (!staff.active) continue;
    const existing = optionMap.get(staff.id);
    optionMap.set(staff.id, {
      id: staff.id,
      name: staff.displayName || existing?.name || staff.email,
      email: staff.email || existing?.email || "",
      source: existing?.source || "staff",
    });
  }
  for (const ref of staffRefs ?? []) {
    const key = ref.userId || ref.employeeId;
    const existing = optionMap.get(key);
    if (existing) {
      existing.employeeId = ref.employeeId;
      existing.employeeNumber = ref.employeeNumber;
      existing.departmentId = ref.departmentId ?? undefined;
      if (!existing.name && ref.nameEn) existing.name = ref.nameEn;
    } else {
      optionMap.set(key, {
        id: key,
        name: ref.nameEn || ref.nameAr || ref.email || ref.employeeNumber,
        email: ref.email,
        employeeId: ref.employeeId,
        employeeNumber: ref.employeeNumber,
        departmentId: ref.departmentId ?? undefined,
        source: "hr",
      });
    }
  }
  const staffOptions = Array.from(optionMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  return (
    <TicketView
      detail={detail}
      links={links}
      staffOptions={staffOptions}
      canEdit={itAllowed(user.roles, "tickets", "edit")}
      canAssign={itAllowed(user.roles, "tickets", "assign")}
      isAssignee={detail.ticket.assigneeId === user.subject}
    />
  );
}

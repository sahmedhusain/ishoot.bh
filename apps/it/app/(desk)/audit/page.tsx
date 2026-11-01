import { listAuditEvents, listAuditSubjects } from "@platform/api-client";
import { asUser, requireAllowed } from "../../../lib/session";
import { AuditView, type AuditFilter } from "../../../components/AuditView";

const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** A calendar day (UTC) as the start of that day, or of the next one for an inclusive end date. */
const dayStart = (day: string, next = false) => {
  const date = new Date(`${day}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return undefined;
  if (next) date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString();
};

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await requireAllowed("audit", "read");
  const params = await searchParams;
  const filter: AuditFilter = {
    subject: (params.subject ?? "").slice(0, 200),
    actor: (params.actor ?? "").trim().slice(0, 200),
    from: DAY.test(params.from ?? "") ? params.from! : "",
    to: DAY.test(params.to ?? "") ? params.to! : "",
    cursor: (params.cursor ?? "").slice(0, 200),
  };
  const [page, subjects] = await Promise.all([
    asUser(() =>
      listAuditEvents(user.token, {
        subject: filter.subject || undefined,
        actor: filter.actor || undefined,
        from: filter.from ? dayStart(filter.from) : undefined,
        to: filter.to ? dayStart(filter.to, true) : undefined,
        cursor: filter.cursor || undefined,
      }),
    ).catch(() => null),
    asUser(() => listAuditSubjects(user.token)).catch(() => []),
  ]);
  return <AuditView filter={filter} page={page} subjects={subjects} />;
}

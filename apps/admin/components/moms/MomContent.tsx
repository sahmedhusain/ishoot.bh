"use client";

import type { MinuteOfMeetingItem } from "@platform/database";
import { DataTable, StatusBadge } from "@platform/ui";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { DocumentCard } from "../documents/DocumentCard";
import { DocumentInfoCard } from "../documents/DocumentInfoCard";

/** Screen-only meeting record. The original paper remains available to browser print. */
export function MomContent({ mom }: { mom: MinuteOfMeetingItem }) {
  const { t, isArabic } = useAdminLocale();
  const c = t.momDetail;
  return (
    <div className="grid min-w-0 gap-6 lg:grid-cols-3 no-print">
      <div className="min-w-0 space-y-6 lg:col-span-2">
        <DocumentCard title={isArabic ? mom.title_ar || mom.title : mom.title}>
          <StatusBadge status={mom.status} />
          {mom.agenda && (
            <section>
              <h3 className="mb-2 text-sm font-semibold">{c.meetingAgenda}</h3>
              <p className="whitespace-pre-line text-sm text-ink-muted">
                {mom.agenda}
              </p>
            </section>
          )}
          {mom.notes && (
            <section>
              <h3 className="mb-2 text-sm font-semibold">
                {c.administrativeNotes}
              </h3>
              <p className="whitespace-pre-line text-sm text-ink-muted">
                {mom.notes}
              </p>
            </section>
          )}
        </DocumentCard>
        {!!mom.discussion_points?.length && (
          <DocumentCard title={c.keyDiscussionPointsMinutes}>
            <ol className="space-y-4">
              {mom.discussion_points.map((point, index) => (
                <li
                  key={index}
                  className="border-s-2 border-outline-variant ps-4"
                >
                  <h3 className="text-sm font-semibold">{point.topic}</h3>
                  {point.speaker && (
                    <p className="text-xs text-ink-muted">{point.speaker}</p>
                  )}
                  <p className="mt-2 whitespace-pre-line text-sm">
                    {point.notes}
                  </p>
                </li>
              ))}
            </ol>
          </DocumentCard>
        )}
        {!!mom.decisions?.length && (
          <DocumentCard title={c.agreedDecisionsCommitments}>
            <ul className="list-disc space-y-2 ps-5 text-sm">
              {mom.decisions.map((decision, index) => (
                <li key={index}>{decision}</li>
              ))}
            </ul>
          </DocumentCard>
        )}
        {!!mom.action_items?.length && (
          <DocumentCard title={c.actionItemsAccountabilities}>
            <DataTable aria-label={c.actionItemsAccountabilities}>
              <thead>
                <tr>
                  <th scope="col">{c.actionItem}</th>
                  <th scope="col">{c.assignee}</th>
                  <th scope="col">{c.dueDate}</th>
                  <th scope="col">{c.status}</th>
                </tr>
              </thead>
              <tbody>
                {mom.action_items.map((action, index) => (
                  <tr key={index}>
                    <td>{action.task}</td>
                    <td>{action.assignee || "—"}</td>
                    <td className="whitespace-nowrap">
                      {action.dueDate || "—"}
                    </td>
                    <td>
                      <StatusBadge status={action.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          </DocumentCard>
        )}
      </div>
      <aside className="min-w-0 space-y-6">
        <DocumentInfoCard
          title={c.meetingContextEntity}
          rows={[
            {
              label: c.meetingContextEntity,
              value: mom.client_name || c.internalSession,
              mono: false,
            },
            {
              label: c.meetingDate,
              value: new Date(mom.meeting_date).toLocaleDateString(
                isArabic ? "ar" : "en",
              ),
            },
            {
              label: c.timing,
              value:
                [mom.start_time, mom.end_time].filter(Boolean).join(" – ") ||
                "—",
            },
            {
              label: c.location,
              value: mom.location || c.locationMissing,
              mono: false,
            },
            {
              label: c.recordedBy,
              value: mom.created_by_name || t.shared.system,
              mono: false,
            },
            {
              label: c.recorderApprover,
              value: mom.approved_by_name || "—",
              mono: false,
            },
          ]}
        />
        {!!mom.attendees?.length && (
          <DocumentCard title={c.attendeesStakeholders} variant="side">
            <ul className="divide-y divide-outline-variant">
              {mom.attendees.map((attendee, index) => (
                <li key={index} className="space-y-1 py-3">
                  <p className="text-sm font-semibold">{attendee.name}</p>
                  <p className="text-xs text-ink-muted">
                    {[attendee.role, attendee.organization]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  <p className="text-xs text-ink-muted">
                    {attendee.attended ? c.attended : c.absent}
                  </p>
                </li>
              ))}
            </ul>
          </DocumentCard>
        )}
      </aside>
    </div>
  );
}

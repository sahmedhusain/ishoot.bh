"use client";
import { DataTable } from "@platform/ui";

import { ROUTES } from "../../constants/routes";
import * as React from "react";
import Link from "next/link";
import type { MinuteOfMeetingItem } from "@platform/database";
import { Card, Button, ConfirmDialog } from "@platform/ui";
import {
  Plus,
  Search,
  Calendar, Trash2,
  ExternalLink,
  Users,
  CheckCircle,
  Clock4,
  Share2
} from "lucide-react";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { deleteMomAction } from "../../app/actions/mom";
import { PageHeader } from "../layout/PageHeader";

interface MomsListViewProps {
  initialMoms: MinuteOfMeetingItem[];
}

export function MomsListView({ initialMoms }: MomsListViewProps) {
  const { t, isRTL } = useAdminLocale();
  const [moms, setMoms] = React.useState<MinuteOfMeetingItem[]>(initialMoms);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [deleteTargetId, setDeleteTargetId] = React.useState<string | null>(null);

  const filteredMoms = moms.filter((m) => {
    const matchesSearch =
      m.mom_number.toLowerCase().includes(search.toLowerCase()) ||
      m.title.toLowerCase().includes(search.toLowerCase()) ||
      (m.title_ar && m.title_ar.includes(search)) ||
      (m.client_name && m.client_name.toLowerCase().includes(search.toLowerCase())) ||
      (m.deal_title && m.deal_title.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus = statusFilter === "all" || m.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleDelete = async (id: string) => {
    setMoms((prev) => prev.filter((item) => item.id !== id));
    await deleteMomAction(id);
    setDeleteTargetId(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30">
            <CheckCircle className="w-3 h-3" />
            {t.momsList.approvedAndSigned}
          </span>
        );
      case "in_review":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <Clock4 className="w-3 h-3" />
            {t.momsList.inReview}
          </span>
        );
      case "shared":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30">
            <Share2 className="w-3 h-3" />
            {t.momsList.shared}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-ink/10 text-ink/70 border border-outline-variant">
            {t.momsList.draft}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      <PageHeader
        actions={<Link href={ROUTES.moms.create}>
          <Button className="bg-accent hover:bg-tone-25 text-accent-foreground flex items-center gap-2 text-xs">
            <Plus className="w-4 h-4" />
            <span>{t.momsList.newMeetingMinutes}</span>
          </Button>
        </Link>}
      />

      <Card className="p-4 bg-surface border border-outline-variant rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-ink-muted absolute start-3 top-2.5" />
          <input
            type="text"
            placeholder={t.momsList.searchMinutesOrClients}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full ps-9 pe-4 py-1.5 text-xs rounded-xl bg-surface-sunken border border-outline-variant text-ink placeholder:text-ink-muted focus:outline-none focus:border-accent"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          {["all", "draft", "in_review", "approved", "shared"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 text-xs rounded-lg font-medium transition-all ${statusFilter === st
                ? "bg-accent text-accent-foreground"
                : "bg-ink/5 text-ink-muted hover:text-ink"
                }`}
            >
              {st === "all"
                ? t.momsList.all
                : st === "approved"
                  ? t.momsList.approved
                  : st === "in_review"
                    ? t.momsList.inReview
                    : st === "shared"
                      ? t.momsList.shared2
                      : t.momsList.draft}
            </button>
          ))}
        </div>
      </Card>

      <Card className="bg-surface border border-outline-variant rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <DataTable className="w-full text-start text-xs">
            <thead className="bg-surface-sunken text-ink-muted uppercase text-[11px] border-b border-outline-variant">
              <tr>
                <th className="p-4 text-start">{t.momsList.mom}</th>
                <th className="p-4 text-start">{t.momsList.meetingTitle}</th>
                <th className="p-4 text-start">{t.momsList.clientDeal}</th>
                <th className="p-4 text-start">{t.momsList.dateAndTime}</th>
                <th className="p-4 text-start">{t.momsList.attendees}</th>
                <th className="p-4 text-start">{t.momsList.status}</th>
                <th className="p-4 text-end">{t.momsList.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant text-ink">
              {filteredMoms.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-xs text-ink-muted">
                    {t.momsList.noMeetingMinutesFound}
                  </td>
                </tr>
              ) : (
                filteredMoms.map((mom) => (
                  <tr key={mom.id} className="hover:bg-ink/[0.02] transition-colors">
                    <td className="p-4 font-mono font-bold text-primary dark:text-mint">
                      <Link
                        href={ROUTES.moms.detail(mom.id)}
                        className="hover:underline flex items-center gap-1.5"
                      >
                        <span>{mom.mom_number}</span>
                      </Link>
                    </td>

                    <td className="p-4 max-w-xs">
                      <div className="font-bold text-ink text-sm truncate">
                        {isRTL && mom.title_ar ? mom.title_ar : mom.title}
                      </div>
                      <div className="text-[11px] text-ink-muted truncate">
                        {mom.location || t.momsList.locationMissing}
                      </div>
                    </td>

                    <td className="p-4">
                      <div className="text-ink font-medium">
                        {mom.client_name || "—"}
                      </div>
                      <div className="text-[11px] text-accent truncate">
                        {mom.deal_title || "—"}
                      </div>
                    </td>

                    <td className="p-4">
                      <div className="flex items-center gap-1.5 text-ink">
                        <Calendar className="w-3.5 h-3.5 text-accent" />
                        <span>{mom.meeting_date}</span>
                      </div>
                      {mom.start_time && (
                        <div className="text-[11px] text-ink-muted">
                          {mom.start_time} - {mom.end_time || ""}
                        </div>
                      )}
                    </td>

                    <td className="p-4">
                      <div className="flex items-center gap-1 text-ink-muted">
                        <Users className="w-3.5 h-3.5 text-accent" />
                        <span>{mom.attendees.length} {t.momsList.attendees2}</span>
                      </div>
                    </td>

                    <td className="p-4">
                      {getStatusBadge(mom.status)}
                    </td>

                    <td className="p-4 text-end">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={ROUTES.moms.detail(mom.id)}
                          className="p-1.5 rounded-lg bg-ink/5 hover:bg-accent/20 text-primary dark:text-mint border border-outline-variant hover:border-accent/40 transition-all"
                          title={t.momsList.viewOfficialDocument}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => setDeleteTargetId(mom.id)}
                          className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all"
                          title={t.momsList.delete}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </DataTable>
        </div>
      </Card>

      {deleteTargetId && (
        <ConfirmDialog
          isOpen={true}
          onClose={() => setDeleteTargetId(null)}
          onConfirm={() => handleDelete(deleteTargetId)}
          title={t.momsList.deleteMeetingMinutes}
          description={
            t.momsList.areYouSureYouWant
          }
          confirmLabel={t.momsList.deleteDocument}
        />
      )}
    </div>
  );
}

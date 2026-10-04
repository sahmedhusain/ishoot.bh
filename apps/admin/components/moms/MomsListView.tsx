"use client";

import { ROUTES } from "../../constants/routes";
import * as React from "react";
import Link from "next/link";
import type { MinuteOfMeetingItem } from "@ishoot/database";
import { Card,Button,ConfirmDestructiveModal } from "@ishoot/ui";
import {
FileSignature,
Plus,
Search,
Calendar,Trash2,
ExternalLink,
Users,
CheckCircle,
Clock4,
Share2
} from "lucide-react";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { deleteMomAction } from "../../app/actions/mom";

interface MomsListViewProps {
  initialMoms: MinuteOfMeetingItem[];
}

export function MomsListView({ initialMoms }: MomsListViewProps) {
  const { isRTL } = useAdminLocale();
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
            {isRTL ? "معتمد وموقّع" : "Approved & Signed"}
          </span>
        );
      case "in_review":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <Clock4 className="w-3 h-3" />
            {isRTL ? "قيد المراجعة" : "In Review"}
          </span>
        );
      case "shared":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30">
            <Share2 className="w-3 h-3" />
            {isRTL ? "تمت المشاركة" : "Shared"}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-white/70 border border-white/15">
            {isRTL ? "مسودة" : "Draft"}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white font-display flex items-center gap-2">
            <FileSignature className="w-6 h-6 text-[#09937F]" />
            <span>{isRTL ? "محاضر الاجتماعات الرسمية (MOM)" : "Minutes of Meetings (MOM)"}</span>
          </h1>
          <p className="text-xs text-[#9EADA9] mt-1">
            {isRTL
              ? "سجل اجتماعات الإنتاج الرسمية وقراراتها ومهام المتابعة المعتمدة بالتوقيع الرقمي والختم"
              : "Official corporate meeting minutes with agenda, action items, digital signatures, and seal"}
          </p>
        </div>

        <Link href={ROUTES.moms.create}>
          <Button className="bg-[#09937F] hover:bg-[#077464] text-white flex items-center gap-2 text-xs">
            <Plus className="w-4 h-4" />
            <span>{isRTL ? "إنشاء محضر جديد" : "New Meeting Minutes"}</span>
          </Button>
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4 bg-[#0B1210] border border-white/10 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[#9EADA9] absolute start-3 top-2.5" />
          <input
            type="text"
            placeholder={isRTL ? "بحث في المحاضر والمشاريع..." : "Search minutes or clients..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full ps-9 pe-4 py-1.5 text-xs rounded-xl bg-[#050807] border border-white/10 text-white placeholder:text-[#9EADA9]/60 focus:outline-none focus:border-[#09937F]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          {["all", "draft", "in_review", "approved", "shared"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 text-xs rounded-lg font-medium transition-all ${
                statusFilter === st
                  ? "bg-[#09937F] text-white"
                  : "bg-white/5 text-[#9EADA9] hover:text-white"
              }`}
            >
              {st === "all"
                ? isRTL ? "الكل" : "All"
                : st === "approved"
                ? isRTL ? "معتمد" : "Approved"
                : st === "in_review"
                ? isRTL ? "قيد المراجعة" : "In Review"
                : st === "shared"
                ? isRTL ? "مشارك" : "Shared"
                : isRTL ? "مسودة" : "Draft"}
            </button>
          ))}
        </div>
      </Card>

      {/* MOM Table */}
      <Card className="bg-[#0B1210] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs">
            <thead className="bg-[#070C0A] text-[#9EADA9] uppercase text-[11px] border-b border-white/10">
              <tr>
                <th className="p-4 text-start">{isRTL ? "رقم المحضر" : "MOM #"}</th>
                <th className="p-4 text-start">{isRTL ? "عنوان الاجتماع" : "Meeting Title"}</th>
                <th className="p-4 text-start">{isRTL ? "الجهة / المشروع" : "Client / Deal"}</th>
                <th className="p-4 text-start">{isRTL ? "تاريخ الاجتماع" : "Date & Time"}</th>
                <th className="p-4 text-start">{isRTL ? "الحضور" : "Attendees"}</th>
                <th className="p-4 text-start">{isRTL ? "الحالة" : "Status"}</th>
                <th className="p-4 text-end">{isRTL ? "إجراءات" : "Actions"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-white">
              {filteredMoms.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-xs text-[#9EADA9]">
                    {isRTL ? "لم يتم العثور على محاضر اجتماعات" : "No meeting minutes found"}
                  </td>
                </tr>
              ) : (
                filteredMoms.map((mom) => (
                  <tr key={mom.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-4 font-mono font-bold text-[#5EEAD4]">
                      <Link
                        href={ROUTES.moms.detail(mom.id)}
                        className="hover:underline flex items-center gap-1.5"
                      >
                        <span>{mom.mom_number}</span>
                      </Link>
                    </td>

                    <td className="p-4 max-w-xs">
                      <div className="font-bold text-white text-sm truncate">
                        {isRTL && mom.title_ar ? mom.title_ar : mom.title}
                      </div>
                      <div className="text-[11px] text-[#9EADA9] truncate">
                        {mom.location || "ishoot HQ"}
                      </div>
                    </td>

                    <td className="p-4">
                      <div className="text-white font-medium">
                        {mom.client_name || "—"}
                      </div>
                      <div className="text-[11px] text-[#09937F] truncate">
                        {mom.deal_title || "—"}
                      </div>
                    </td>

                    <td className="p-4">
                      <div className="flex items-center gap-1.5 text-white">
                        <Calendar className="w-3.5 h-3.5 text-[#09937F]" />
                        <span>{mom.meeting_date}</span>
                      </div>
                      {mom.start_time && (
                        <div className="text-[11px] text-[#9EADA9]">
                          {mom.start_time} - {mom.end_time || ""}
                        </div>
                      )}
                    </td>

                    <td className="p-4">
                      <div className="flex items-center gap-1 text-[#9EADA9]">
                        <Users className="w-3.5 h-3.5 text-[#09937F]" />
                        <span>{mom.attendees.length} {isRTL ? "مشارك" : "attendees"}</span>
                      </div>
                    </td>

                    <td className="p-4">
                      {getStatusBadge(mom.status)}
                    </td>

                    <td className="p-4 text-end">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={ROUTES.moms.detail(mom.id)}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-[#09937F]/20 text-[#5EEAD4] border border-white/10 hover:border-[#09937F]/40 transition-all"
                          title={isRTL ? "عرض المستند الرسمي" : "View Official Document"}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => setDeleteTargetId(mom.id)}
                          className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all"
                          title={isRTL ? "حذف" : "Delete"}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Delete Confirmation Modal */}
      {deleteTargetId && (
        <ConfirmDestructiveModal
          isOpen={true}
          onClose={() => setDeleteTargetId(null)}
          onConfirm={() => handleDelete(deleteTargetId)}
          title={isRTL ? "تأكيد حذف المحضر" : "Delete Meeting Minutes"}
          description={
            isRTL
              ? "هل أنت متأكد من رغبتك في حذف محضر الاجتماع هذا نهائياً من قاعدة البيانات؟ لا يمكن التراجع عن هذا الإجراء."
              : "Are you sure you want to permanently delete this meeting minutes document? This action cannot be undone."
          }
          confirmLabel={isRTL ? "حذف نهائي" : "Delete Document"}
        />
      )}
    </div>
  );
}

"use client";
import {EntityLookup} from "../shared/EntityLookup";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Card, Button, Input, Select } from "@ishoot/ui";
import {
  FileSignature,
  Plus,
  Trash2,
  Calendar,
  Clock,
  MapPin,
  Users,
  CheckCircle,
  Save,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { createMomAction } from "../../app/actions/mom";
import { MomAttendee, MomDiscussionPoint, MomActionItem } from "@ishoot/database";

interface NewMomFormViewProps {
  clients: Array<{ id: string; name: string; company?: string | null }>;
  deals: Array<{ id: string; title: string }>;
}

export function NewMomFormView({ clients, deals }: NewMomFormViewProps) {
  const router = useRouter();
  const { t, isRTL } = useAdminLocale();

  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");

  // Form State
  const [title, setTitle] = React.useState("");
  const [titleAr, setTitleAr] = React.useState("");
  const [meetingDate, setMeetingDate] = React.useState(
    new Date().toISOString().split("T")[0]
  );
  const [startTime, setStartTime] = React.useState("10:00 AM");
  const [endTime, setEndTime] = React.useState("11:30 AM");
  const [location, setLocation] = React.useState("ishoot Studio & Headquarters");
  const [clientId, setClientId] = React.useState("");
  const [dealId, setDealId] = React.useState("");
  const [status, setStatus] = React.useState("draft");

  // Dynamic Attendees
  const [attendees, setAttendees] = React.useState<MomAttendee[]>([
    { name: "", role: "Lead Producer", email: "", organization: "iShoot", attended: true },
  ]);

  // Agenda
  const [agenda, setAgenda] = React.useState("");

  // Discussion Points
  const [discussionPoints, setDiscussionPoints] = React.useState<MomDiscussionPoint[]>([
    { topic: "", speaker: "", notes: "" },
  ]);

  // Action Items
  const [actionItems, setActionItems] = React.useState<MomActionItem[]>([
    { task: "", assignee: "", dueDate: "", status: "pending" },
  ]);

  // Decisions
  const [decisions, setDecisions] = React.useState<string[]>([""]);

  // Notes
  const [notes, setNotes] = React.useState("");

  // Attendees Helpers
  const addAttendee = () => {
    setAttendees([...attendees, { name: "", role: "", email: "", organization: "", attended: true }]);
  };

  const updateAttendee = (index: number, field: keyof MomAttendee, value: any) => {
    const next = [...attendees];
    next[index] = { ...next[index], [field]: value };
    setAttendees(next);
  };

  const removeAttendee = (index: number) => {
    setAttendees(attendees.filter((_, i) => i !== index));
  };

  // Discussion Points Helpers
  const addDiscussionPoint = () => {
    setDiscussionPoints([...discussionPoints, { topic: "", speaker: "", notes: "" }]);
  };

  const updateDiscussionPoint = (index: number, field: keyof MomDiscussionPoint, value: string) => {
    const next = [...discussionPoints];
    next[index] = { ...next[index], [field]: value };
    setDiscussionPoints(next);
  };

  const removeDiscussionPoint = (index: number) => {
    setDiscussionPoints(discussionPoints.filter((_, i) => i !== index));
  };

  // Action Items Helpers
  const addActionItem = () => {
    setActionItems([...actionItems, { task: "", assignee: "", dueDate: "", status: "pending" }]);
  };

  const updateActionItem = (index: number, field: keyof MomActionItem, value: any) => {
    const next = [...actionItems];
    next[index] = { ...next[index], [field]: value };
    setActionItems(next);
  };

  const removeActionItem = (index: number) => {
    setActionItems(actionItems.filter((_, i) => i !== index));
  };

  // Decisions Helpers
  const addDecision = () => {
    setDecisions([...decisions, ""]);
  };

  const updateDecision = (index: number, value: string) => {
    const next = [...decisions];
    next[index] = value;
    setDecisions(next);
  };

  const removeDecision = (index: number) => {
    setDecisions(decisions.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !agenda) {
      setError(isRTL ? "يرجى تعبئة عنوان الاجتماع وجدول الأعمال" : "Please provide a meeting title and agenda");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const validAttendees = attendees.filter((a) => a.name.trim() !== "");
      const validPoints = discussionPoints.filter((p) => p.topic.trim() !== "");
      const validItems = actionItems.filter((item) => item.task.trim() !== "");
      const validDecisions = decisions.filter((d) => d.trim() !== "");

      const res = await createMomAction({
        title,
        titleAr: titleAr || undefined,
        meetingDate,
        startTime,
        endTime,
        location,
        clientId: clientId || undefined,
        dealId: dealId || undefined,
        attendees: validAttendees,
        agenda,
        discussionPoints: validPoints,
        actionItems: validItems,
        decisions: validDecisions,
        notes: notes || undefined,
        status,
      });

      if (res.mom) {
        router.push(`/dashboard/moms/${res.mom.id}`);
      }
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Failed to create meeting minutes");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-5xl mx-auto pb-24 text-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <button
            type="button"
            onClick={() => router.push("/dashboard/moms")}
            className="flex items-center gap-2 text-[#9EADA9] hover:text-white mb-2 transition-colors"
          >
            {isRTL ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
            <span>{isRTL ? "العودة إلى سجل المحاضر" : "Back to Meeting Minutes"}</span>
          </button>
          <h1 className="text-2xl font-bold tracking-tight text-white font-display flex items-center gap-2">
            <FileSignature className="w-6 h-6 text-[#09937F]" />
            <span>{isRTL ? "صياغة محضر اجتماع جديد" : "Compose Minutes of Meeting"}</span>
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/dashboard/moms")}
            className="border-white/10 text-[#9EADA9] hover:text-white"
          >
            {isRTL ? "إلغاء" : "Cancel"}
          </Button>

          <Button
            type="submit"
            disabled={saving}
            className="bg-[#09937F] hover:bg-[#077464] text-white flex items-center gap-2 shadow-lg"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? (isRTL ? "جاري الحفظ..." : "Saving...") : isRTL ? "حفظ واعتماد المحضر" : "Save Document"}</span>
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 font-medium">
          {error}
        </div>
      )}

      {/* Main Details Card */}
      <Card className="p-6 bg-[#0B1210] border border-white/10 rounded-2xl space-y-6">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider border-b border-white/10 pb-3 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#09937F]" />
          <span>{isRTL ? "بيانات الاجتماع الأساسية" : "Meeting Overview"}</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[#9EADA9] font-medium">{isRTL ? "عنوان الاجتماع (إنجليزي)" : "Meeting Title (English)"} *</label>
            <Input
              required
              placeholder="e.g. Q2 Production Alignment & Camera Specs"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[#9EADA9] font-medium">{isRTL ? "عنوان الاجتماع (عربي)" : "Meeting Title (Arabic)"}</label>
            <Input
              placeholder="مثال: اجتماع التنسيق الفني وتجهيز كاميرات الإنتاج"
              value={titleAr}
              onChange={(e) => setTitleAr(e.target.value)}
              dir="rtl"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <label className="text-[#9EADA9] font-medium">{isRTL ? "تاريخ الاجتماع" : "Date"} *</label>
            <Input
              type="date"
              required
              value={meetingDate}
              onChange={(e) => setMeetingDate(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[#9EADA9] font-medium">{isRTL ? "وقت البدء" : "Start Time"}</label>
            <Input
              placeholder="10:00 AM"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[#9EADA9] font-medium">{isRTL ? "وقت الانتهاء" : "End Time"}</label>
            <Input
              placeholder="11:30 AM"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[#9EADA9] font-medium">{isRTL ? "مكان الاجتماع" : "Location"}</label>
            <Input
              placeholder="ishoot Studio Stage A / Zoom"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-[#9EADA9] font-medium">{isRTL ? "العميل المرتبط" : "Linked Client"}</label>
            <EntityLookup domain="contacts" value={clientId} onChange={setClientId} />
          </div>

          <div className="space-y-1.5">
            <label className="text-[#9EADA9] font-medium">{isRTL ? "المشروع أو الصفقة" : "Linked Deal"}</label>
            <EntityLookup domain="deals" value={dealId} onChange={setDealId} />
          </div>

          <div className="space-y-1.5">
            <label className="text-[#9EADA9] font-medium">{isRTL ? "حالة المحضر" : "Document Status"}</label>
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="draft">{isRTL ? "مسودة (Draft)" : "Draft"}</option>
              <option value="in_review">{isRTL ? "قيد المراجعة (In Review)" : "In Review"}</option>
              <option value="approved">{isRTL ? "معتمد رسمياً (Approved)" : "Approved"}</option>
            </Select>
          </div>
        </div>
      </Card>

      {/* Attendees Card */}
      <Card className="p-6 bg-[#0B1210] border border-white/10 rounded-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Users className="w-4 h-4 text-[#09937F]" />
            <span>{isRTL ? "قائمة الحضور والمشاركين" : "Meeting Attendees"}</span>
          </h2>
          <Button
            type="button"
            onClick={addAttendee}
            className="bg-white/5 hover:bg-white/10 text-white border border-white/10 text-[11px] px-3 py-1 flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isRTL ? "إضافة حاضر" : "Add Attendee"}</span>
          </Button>
        </div>

        <div className="space-y-3">
          {attendees.map((attendee, index) => (
            <div
              key={index}
              className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center p-3 rounded-xl bg-[#050807] border border-white/5"
            >
              <div className="sm:col-span-3">
                <Input
                  placeholder={isRTL ? "الاسم الكامل *" : "Full Name *"}
                  value={attendee.name}
                  onChange={(e) => updateAttendee(index, "name", e.target.value)}
                />
              </div>
              <div className="sm:col-span-3">
                <Input
                  placeholder={isRTL ? "المسمى الوظيفي" : "Role / Title"}
                  value={attendee.role}
                  onChange={(e) => updateAttendee(index, "role", e.target.value)}
                />
              </div>
              <div className="sm:col-span-3">
                <Input
                  placeholder={isRTL ? "الجهة / المؤسسة" : "Organization"}
                  value={attendee.organization || ""}
                  onChange={(e) => updateAttendee(index, "organization", e.target.value)}
                />
              </div>
              <div className="sm:col-span-2 flex items-center gap-2">
                <label className="flex items-center gap-1.5 cursor-pointer text-[#9EADA9] hover:text-white">
                  <input
                    type="checkbox"
                    checked={attendee.attended}
                    onChange={(e) => updateAttendee(index, "attended", e.target.checked)}
                    className="rounded border-white/20 text-[#09937F] focus:ring-0"
                  />
                  <span>{isRTL ? "حاضر" : "Attended"}</span>
                </label>
              </div>
              <div className="sm:col-span-1 text-end">
                {attendees.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeAttendee(index)}
                    className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Agenda & Notes */}
      <Card className="p-6 bg-[#0B1210] border border-white/10 rounded-2xl space-y-4">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider border-b border-white/10 pb-3 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#09937F]" />
          <span>{isRTL ? "جدول الأعمال ومحاور الاجتماع" : "Meeting Agenda"} *</span>
        </h2>

        <div className="space-y-1.5">
          <textarea
            required
            rows={5}
            placeholder={
              isRTL
                ? "1. مراجعة تصاريح التصوير الجوي والدرون.\n2. معاينة لقطات المشهد الليلي وألوان العلامة التجارية.\n3. تحديد موعد تسليم النسخة الأولية للمونتاج."
                : "1. Airspace drone filming clearance approval.\n2. Night sequence lighting and color grading look-and-feel.\n3. Initial rough cut timeline cutoff."
            }
            value={agenda}
            onChange={(e) => setAgenda(e.target.value)}
            className="w-full p-3.5 text-xs rounded-xl bg-[#050807] border border-white/10 text-white placeholder:text-[#9EADA9]/60 focus:outline-none focus:border-[#09937F] font-sans leading-relaxed"
          />
        </div>
      </Card>

      {/* Discussion Points Card */}
      <Card className="p-6 bg-[#0B1210] border border-white/10 rounded-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#09937F]" />
            <span>{isRTL ? "النقاط المناقشة والملاحظات" : "Discussion Points"}</span>
          </h2>
          <Button
            type="button"
            onClick={addDiscussionPoint}
            className="bg-white/5 hover:bg-white/10 text-white border border-white/10 text-[11px] px-3 py-1 flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isRTL ? "إضافة محور نقاش" : "Add Topic"}</span>
          </Button>
        </div>

        <div className="space-y-3">
          {discussionPoints.map((point, index) => (
            <div
              key={index}
              className="p-4 rounded-xl bg-[#050807] border border-white/5 space-y-3"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="w-full sm:w-1/2">
                  <Input
                    placeholder={isRTL ? "الموضوع / المحور" : "Topic / Theme"}
                    value={point.topic}
                    onChange={(e) => updateDiscussionPoint(index, "topic", e.target.value)}
                  />
                </div>
                <div className="w-full sm:w-1/3">
                  <Input
                    placeholder={isRTL ? "المتحدث / المناقش" : "Speaker / Presenter"}
                    value={point.speaker || ""}
                    onChange={(e) => updateDiscussionPoint(index, "speaker", e.target.value)}
                  />
                </div>
                {discussionPoints.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeDiscussionPoint(index)}
                    className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <textarea
                rows={2}
                placeholder={isRTL ? "تفاصيل ما تم نقاشه..." : "Summary of discussion..."}
                value={point.notes}
                onChange={(e) => updateDiscussionPoint(index, "notes", e.target.value)}
                className="w-full p-2.5 text-xs rounded-xl bg-black/40 border border-white/5 text-white placeholder:text-[#9EADA9]/60 focus:outline-none focus:border-[#09937F]"
              />
            </div>
          ))}
        </div>
      </Card>

      {/* Action Items & Deadlines Card */}
      <Card className="p-6 bg-[#0B1210] border border-white/10 rounded-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-[#09937F]" />
            <span>{isRTL ? "المهام وإجراءات المتابعة (Action Items)" : "Action Items & Deliverables"}</span>
          </h2>
          <Button
            type="button"
            onClick={addActionItem}
            className="bg-white/5 hover:bg-white/10 text-white border border-white/10 text-[11px] px-3 py-1 flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isRTL ? "إضافة مهمة" : "Add Task"}</span>
          </Button>
        </div>

        <div className="space-y-3">
          {actionItems.map((item, index) => (
            <div
              key={index}
              className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center p-3 rounded-xl bg-[#050807] border border-white/5"
            >
              <div className="sm:col-span-5">
                <Input
                  placeholder={isRTL ? "المهمة المطلوبة *" : "Task Description *"}
                  value={item.task}
                  onChange={(e) => updateActionItem(index, "task", e.target.value)}
                />
              </div>
              <div className="sm:col-span-3">
                <Input
                  placeholder={isRTL ? "المسؤول عن التنفيذ" : "Assignee"}
                  value={item.assignee}
                  onChange={(e) => updateActionItem(index, "assignee", e.target.value)}
                />
              </div>
              <div className="sm:col-span-2">
                <Input
                  type="date"
                  value={item.dueDate || ""}
                  onChange={(e) => updateActionItem(index, "dueDate", e.target.value)}
                />
              </div>
              <div className="sm:col-span-1">
                <select
                  value={item.status}
                  onChange={(e) => updateActionItem(index, "status", e.target.value)}
                  className="w-full bg-[#0B1210] border border-white/10 rounded-lg py-1 px-1.5 text-xs text-white"
                >
                  <option value="pending">{isRTL ? "معلق" : "Pending"}</option>
                  <option value="in_progress">{isRTL ? "جاري" : "In Progress"}</option>
                  <option value="completed">{isRTL ? "مكتمل" : "Done"}</option>
                </select>
              </div>
              <div className="sm:col-span-1 text-end">
                {actionItems.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeActionItem(index)}
                    className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Decisions & Approvals */}
      <Card className="p-6 bg-[#0B1210] border border-white/10 rounded-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#09937F]" />
            <span>{isRTL ? "القرارات المعتمدة" : "Key Decisions Taken"}</span>
          </h2>
          <Button
            type="button"
            onClick={addDecision}
            className="bg-white/5 hover:bg-white/10 text-white border border-white/10 text-[11px] px-3 py-1 flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isRTL ? "إضافة قرار" : "Add Decision"}</span>
          </Button>
        </div>

        <div className="space-y-2">
          {decisions.map((decision, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                placeholder={isRTL ? "نص القرار المعتمد..." : "Documented decision..."}
                value={decision}
                onChange={(e) => updateDecision(index, e.target.value)}
              />
              {decisions.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeDecision(index)}
                  className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Footer Submit */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/dashboard/moms")}
          className="border-white/10 text-[#9EADA9] hover:text-white"
        >
          {isRTL ? "إلغاء" : "Cancel"}
        </Button>

        <Button
          type="submit"
          disabled={saving}
          className="bg-[#09937F] hover:bg-[#077464] text-white flex items-center gap-2 px-6 py-2.5 text-sm font-bold shadow-xl"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? (isRTL ? "جاري الحفظ..." : "Saving...") : isRTL ? "حفظ واعتماد المحضر" : "Save Document"}</span>
        </Button>
      </div>
    </form>
  );
}

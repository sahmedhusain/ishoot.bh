"use client";
import { errorMessage } from "../../lib/error-text";
import { ROUTES } from "../../constants/routes";
import { EntityLookup } from "../shared/EntityLookup";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Card, Button, Input, Select } from "@platform/ui";
import {
  FileSignature,
  Plus,
  Trash2, Users,
  CheckCircle,
  Save,
  ArrowLeft,
  ArrowRight
} from "lucide-react";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { createMomAction } from "../../app/actions/mom";
import type { MomAttendee, MomDiscussionPoint, MomActionItem } from "@platform/database";

interface NewMomFormViewProps {
  clients: Array<{ id: string; name: string; company?: string | null }>;
  deals: Array<{ id: string; title: string }>;
  companyName: string;
  initialAttendee: { name: string; email: string };
}

export function NewMomFormView({ clients, deals, companyName, initialAttendee }: NewMomFormViewProps) {
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
  const [startTime, setStartTime] = React.useState("");
  const [endTime, setEndTime] = React.useState("");
  const [location, setLocation] = React.useState("");
  const [clientId, setClientId] = React.useState("");
  const [dealId, setDealId] = React.useState("");
  const [status, setStatus] = React.useState("draft");

  // Dynamic Attendees
  const [attendees, setAttendees] = React.useState<MomAttendee[]>([
    { ...initialAttendee, role: "", organization: companyName, attended: true },
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
  const [notes] = React.useState("");

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
      setError(t.newMomForm.pleaseProvideAMeetingTitle);
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
        router.push(ROUTES.moms.detail(res.mom.id));
      }
    } catch (err: any) {
      console.error(err);
      setError(errorMessage(err, t, t.newMomForm.failedToCreateMeetingMinutes));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-5xl mx-auto pb-24 text-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-ink/10 pb-6">
        <div>
          <button
            type="button"
            onClick={() => router.push(ROUTES.moms.list)}
            className="flex items-center gap-2 text-ink-muted hover:text-ink mb-2 transition-colors"
          >
            {isRTL ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
            <span>{t.newMomForm.backToMeetingMinutes}</span>
          </button>
          <h1 className="text-2xl font-bold tracking-tight text-ink font-display flex items-center gap-2">
            <FileSignature className="w-6 h-6 text-accent" />
            <span>{t.newMomForm.composeMinutesOfMeeting}</span>
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(ROUTES.moms.list)}
            className="border-ink/10 text-ink-muted hover:text-ink"
          >
            {t.newMomForm.cancel}
          </Button>

          <Button
            type="submit"
            disabled={saving}
            className="bg-accent hover:bg-tone-25 text-white flex items-center gap-2 shadow-lg"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? (t.newMomForm.saving) : t.newMomForm.saveDocument}</span>
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 font-medium">
          {error}
        </div>
      )}

      {/* Main Details Card */}
      <Card className="p-6 bg-surface border border-ink/10 rounded-2xl space-y-6">
        <h2 className="text-sm font-bold text-ink uppercase tracking-wider border-b border-ink/10 pb-3 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-accent" />
          <span>{t.newMomForm.meetingOverview}</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-ink-muted font-medium">{t.newMomForm.meetingTitleEnglish} *</label>
            <Input
              required
              placeholder={t.newMomForm.eGQ2ProductionAlignment}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-ink-muted font-medium">{t.newMomForm.meetingTitleArabic}</label>
            <Input
              placeholder={t.newMomForm.titleArPlaceholder}
              value={titleAr}
              onChange={(e) => setTitleAr(e.target.value)}
              dir="rtl"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <label className="text-ink-muted font-medium">{t.newMomForm.date} *</label>
            <Input
              type="date"
              required
              value={meetingDate}
              onChange={(e) => setMeetingDate(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-ink-muted font-medium">{t.newMomForm.startTime}</label>
            <Input
              placeholder={t.copy.timeStartExample}
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-ink-muted font-medium">{t.newMomForm.endTime}</label>
            <Input
              placeholder={t.copy.timeEndExample}
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-ink-muted font-medium">{t.newMomForm.location}</label>
            <Input
              placeholder={t.newMomForm.locationExample}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-ink-muted font-medium">{t.newMomForm.linkedClient}</label>
            <EntityLookup domain="contacts" value={clientId} onChange={setClientId} />
          </div>

          <div className="space-y-1.5">
            <label className="text-ink-muted font-medium">{t.newMomForm.linkedDeal}</label>
            <EntityLookup domain="deals" value={dealId} onChange={setDealId} />
          </div>

          <div className="space-y-1.5">
            <label className="text-ink-muted font-medium">{t.newMomForm.documentStatus}</label>
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="draft">{t.newMomForm.draft}</option>
              <option value="in_review">{t.newMomForm.inReview}</option>
              <option value="approved">{t.newMomForm.approved}</option>
            </Select>
          </div>
        </div>
      </Card>

      {/* Attendees Card */}
      <Card className="p-6 bg-surface border border-ink/10 rounded-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-ink/10 pb-3">
          <h2 className="text-sm font-bold text-ink uppercase tracking-wider flex items-center gap-2">
            <Users className="w-4 h-4 text-accent" />
            <span>{t.newMomForm.meetingAttendees}</span>
          </h2>
          <Button
            type="button"
            onClick={addAttendee}
            className="bg-ink/5 hover:bg-ink/10 text-ink border border-ink/10 text-[11px] px-3 py-1 flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t.newMomForm.addAttendee}</span>
          </Button>
        </div>

        <div className="space-y-3">
          {attendees.map((attendee, index) => (
            <div
              key={index}
              className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center p-3 rounded-xl bg-surface-sunken border border-ink/5"
            >
              <div className="sm:col-span-3">
                <Input
                  placeholder={t.newMomForm.fullName}
                  value={attendee.name}
                  onChange={(e) => updateAttendee(index, "name", e.target.value)}
                />
              </div>
              <div className="sm:col-span-3">
                <Input
                  placeholder={t.newMomForm.roleTitle}
                  value={attendee.role}
                  onChange={(e) => updateAttendee(index, "role", e.target.value)}
                />
              </div>
              <div className="sm:col-span-3">
                <Input
                  placeholder={t.newMomForm.organization}
                  value={attendee.organization || ""}
                  onChange={(e) => updateAttendee(index, "organization", e.target.value)}
                />
              </div>
              <div className="sm:col-span-2 flex items-center gap-2">
                <label className="flex items-center gap-1.5 cursor-pointer text-ink-muted hover:text-ink">
                  <input
                    type="checkbox"
                    checked={attendee.attended}
                    onChange={(e) => updateAttendee(index, "attended", e.target.checked)}
                    className="rounded border-ink/20 text-accent focus:ring-0"
                  />
                  <span>{t.newMomForm.attended}</span>
                </label>
              </div>
              <div className="sm:col-span-1 text-end">
                {attendees.length > 1 && (
                  <button aria-label={t.actions.delete}
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
      <Card className="p-6 bg-surface border border-ink/10 rounded-2xl space-y-4">
        <h2 className="text-sm font-bold text-ink uppercase tracking-wider border-b border-ink/10 pb-3 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-accent" />
          <span>{t.newMomForm.meetingAgenda} *</span>
        </h2>

        <div className="space-y-1.5">
          <textarea
            required
            rows={5}
            placeholder={
              t.newMomForm.n1AirspaceDroneFilmingClearance
            }
            value={agenda}
            onChange={(e) => setAgenda(e.target.value)}
            className="w-full p-3.5 text-xs rounded-xl bg-surface-sunken border border-ink/10 text-ink placeholder:text-ink-muted/60 focus:outline-none focus:border-accent font-sans leading-relaxed"
          />
        </div>
      </Card>

      {/* Discussion Points Card */}
      <Card className="p-6 bg-surface border border-ink/10 rounded-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-ink/10 pb-3">
          <h2 className="text-sm font-bold text-ink uppercase tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-accent" />
            <span>{t.newMomForm.discussionPoints}</span>
          </h2>
          <Button
            type="button"
            onClick={addDiscussionPoint}
            className="bg-ink/5 hover:bg-ink/10 text-ink border border-ink/10 text-[11px] px-3 py-1 flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t.newMomForm.addTopic}</span>
          </Button>
        </div>

        <div className="space-y-3">
          {discussionPoints.map((point, index) => (
            <div
              key={index}
              className="p-4 rounded-xl bg-surface-sunken border border-ink/5 space-y-3"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="w-full sm:w-1/2">
                  <Input
                    placeholder={t.newMomForm.topicTheme}
                    value={point.topic}
                    onChange={(e) => updateDiscussionPoint(index, "topic", e.target.value)}
                  />
                </div>
                <div className="w-full sm:w-1/3">
                  <Input
                    placeholder={t.newMomForm.speakerPresenter}
                    value={point.speaker || ""}
                    onChange={(e) => updateDiscussionPoint(index, "speaker", e.target.value)}
                  />
                </div>
                {discussionPoints.length > 1 && (
                  <button aria-label={t.actions.delete}
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
                placeholder={t.newMomForm.summaryOfDiscussion}
                value={point.notes}
                onChange={(e) => updateDiscussionPoint(index, "notes", e.target.value)}
                className="w-full p-2.5 text-xs rounded-xl bg-black/40 border border-ink/5 text-white placeholder:text-ink-muted/60 focus:outline-none focus:border-accent"
              />
            </div>
          ))}
        </div>
      </Card>

      {/* Action Items & Deadlines Card */}
      <Card className="p-6 bg-surface border border-ink/10 rounded-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-ink/10 pb-3">
          <h2 className="text-sm font-bold text-ink uppercase tracking-wider flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-accent" />
            <span>{t.newMomForm.actionItemsAndDeliverables}</span>
          </h2>
          <Button
            type="button"
            onClick={addActionItem}
            className="bg-ink/5 hover:bg-ink/10 text-ink border border-ink/10 text-[11px] px-3 py-1 flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t.newMomForm.addTask}</span>
          </Button>
        </div>

        <div className="space-y-3">
          {actionItems.map((item, index) => (
            <div
              key={index}
              className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center p-3 rounded-xl bg-surface-sunken border border-ink/5"
            >
              <div className="sm:col-span-5">
                <Input
                  placeholder={t.newMomForm.taskDescription}
                  value={item.task}
                  onChange={(e) => updateActionItem(index, "task", e.target.value)}
                />
              </div>
              <div className="sm:col-span-3">
                <Input
                  placeholder={t.newMomForm.assignee}
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
                  className="w-full bg-surface border border-ink/10 rounded-lg py-1 px-1.5 text-xs text-ink"
                >
                  <option value="pending">{t.newMomForm.pending}</option>
                  <option value="in_progress">{t.newMomForm.inProgress}</option>
                  <option value="completed">{t.newMomForm.done}</option>
                </select>
              </div>
              <div className="sm:col-span-1 text-end">
                {actionItems.length > 1 && (
                  <button aria-label={t.actions.delete}
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
      <Card className="p-6 bg-surface border border-ink/10 rounded-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-ink/10 pb-3">
          <h2 className="text-sm font-bold text-ink uppercase tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-accent" />
            <span>{t.newMomForm.keyDecisionsTaken}</span>
          </h2>
          <Button
            type="button"
            onClick={addDecision}
            className="bg-ink/5 hover:bg-ink/10 text-ink border border-ink/10 text-[11px] px-3 py-1 flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t.newMomForm.addDecision}</span>
          </Button>
        </div>

        <div className="space-y-2">
          {decisions.map((decision, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                placeholder={t.newMomForm.documentedDecision}
                value={decision}
                onChange={(e) => updateDecision(index, e.target.value)}
              />
              {decisions.length > 1 && (
                <button aria-label={t.actions.delete}
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
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-ink/10">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(ROUTES.moms.list)}
          className="border-ink/10 text-ink-muted hover:text-ink"
        >
          {t.newMomForm.cancel}
        </Button>

        <Button
          type="submit"
          disabled={saving}
          className="bg-accent hover:bg-tone-25 text-white flex items-center gap-2 px-6 py-2.5 text-sm font-bold shadow-xl"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? (t.newMomForm.saving) : t.newMomForm.saveDocument}</span>
        </Button>
      </div>
    </form>
  );
}

"use client";
import { getCurrencyLabel } from "@platform/config/currency";
import { ROUTES } from "../../constants/routes";
import {EntityLookup} from "../shared/EntityLookup";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { CRMDeal, CRMContact, DealStage } from "@platform/database/types";
import type { DealPipelineStage } from "@platform/database";
import { dealStageLabel } from "../../lib/deal-stages";
import { Card, Input, Select, Button, Textarea } from "@platform/ui";
import { ArrowLeft, CheckCircle2, Briefcase, ExternalLink } from "lucide-react";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { updateDealAction } from "../../app/actions/crm";
import { EditConfirmModal, type FieldChange } from "../shared/EditConfirmModal";

interface DealEditFormViewProps {
  deal: CRMDeal;
  contacts: CRMContact[];
  owners: Array<{ id: string; fullName: string }>;
  stages: DealPipelineStage[];
}

export function DealEditFormView({ deal, contacts, owners, stages }: DealEditFormViewProps) {
  const router = useRouter();
  const {t, locale } = useAdminLocale();
  const bhd = getCurrencyLabel("BHD", locale === "ar");

  const [title, setTitle] = React.useState(deal.title || "");
  const [contactId, setContactId] = React.useState(deal.contact_id || "");
  const [dealStage, setDealStage] = React.useState<DealStage>(
    (deal.stage as DealStage) || "lead",
  );
  const [dealValue, setDealValue] = React.useState<number>(
    Number(deal.value) || 0,
  );
  const [probability, setProbability] = React.useState(deal.probability || 50);
  const [expectedCloseDate, setExpectedCloseDate] = React.useState(
    deal.target_close_date
      ? new Date(deal.target_close_date).toISOString().split("T")[0]
      : "",
  );
  const [shootDate, setShootDate] = React.useState(
    deal.shoot_date
      ? new Date(deal.shoot_date).toISOString().split("T")[0]
      : "",
  );
  const [notes, setNotes] = React.useState(deal.notes || "");
  const [assignedTo, setAssignedTo] = React.useState(deal.assigned_to || "");
  const [lostReason, setLostReason] = React.useState(deal.lost_reason || "");
  const [error, setError] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [showConfirmModal, setShowConfirmModal] = React.useState(false);

  const selectedContact = contacts.find((c) => c.id === contactId);

  const changes: FieldChange[] = React.useMemo(() => [
    {
      field: "title",
      label: t.dealEditForm.dealTitle,
      oldValue: deal.title,
      newValue: title,
    },
    {
      field: "stage",
      label: t.dealEditForm.stage,
      oldValue: deal.stage,
      newValue: dealStage,
    },
    {
      field: "value",
      label: t.dealEditForm.dealValue,
      oldValue: `${Number(deal.value || 0).toFixed(3)} ${bhd}`,
      newValue: `${Number(dealValue || 0).toFixed(3)} ${bhd}`,
    },
    {
      field: "probability",
      label: t.dealEditForm.probability,
      oldValue: `${deal.probability}%`,
      newValue: `${probability}%`,
    },
    {
      field: "shoot_date",
      label: t.dealEditForm.shootDate,
      oldValue: deal.shoot_date ? new Date(deal.shoot_date).toISOString().split("T")[0] : "—",
      newValue: shootDate || "—",
    },
    {
      field: "target_close_date",
      label: t.dealEditForm.expectedClose,
      oldValue: deal.target_close_date ? new Date(deal.target_close_date).toISOString().split("T")[0] : "—",
      newValue: expectedCloseDate || "—",
    },
  ], [t, bhd, deal, title, dealStage, dealValue, probability, shootDate, expectedCloseDate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;
    setError("");
    setShowConfirmModal(true);
  };

  const handleConfirmedSave = async () => {
    setSaving(true);
    try {
      await updateDealAction(deal.id, {
        title,
        contact_id: contactId || undefined,
        stage: dealStage,
        value: dealValue,
        probability,
        target_close_date: expectedCloseDate || undefined,
        shoot_date: shootDate || undefined,
        notes: notes || undefined,
        assigned_to: assignedTo || null,
        lost_reason: lostReason.trim() || null,
      });

      router.push(ROUTES.crm.deal(deal.id));
    } catch (err) {
      setError(t.dealEditForm.couldNotSaveTheDeal);
      console.error("Failed to update deal:", err);
    } finally {
      setSaving(false);
      setShowConfirmModal(false);
    }
  };

  const stageOptions = stages.map((stage) => ({ value: stage.id, label: dealStageLabel(stage, t, locale) }));

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-16">
      <div className="flex items-center gap-4">
        <Link href={ROUTES.crm.deal(deal.id)}>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-slate-600 dark:text-slate-300"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t.actions.back}</span>
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white font-display flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-accent" />
            <span>{t.dealEdit.title}</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {t.dealEdit.subtitle}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && <p role="alert" className="text-red-600">{error}</p>}
        <Card className="p-6 space-y-4">
          <div>
            <label htmlFor="deal-owner" className="block mb-2">{t.dealEditForm.dealOwner}</label>
            <select id="deal-owner" value={assignedTo} onChange={(event) => setAssignedTo(event.target.value)} className="w-full rounded border p-2 bg-white dark:bg-slate-900">
              <option value="">{t.dealEditForm.unassigned}</option>
              {owners.map((owner) => <option key={owner.id} value={owner.id}>{owner.fullName}</option>)}
            </select>
          </div>
          {dealStage === "closed_lost" && <div>
            <label htmlFor="lost-reason" className="block mb-2">{t.dealEditForm.lostReason}</label>
            <Textarea id="lost-reason" required value={lostReason} onChange={(event) => setLostReason(event.target.value)} />
          </div>}
        </Card>
        <Card className="p-8 bg-white dark:bg-surface-raised border border-slate-200/80 dark:border-white/10 rounded-2xl shadow-sm space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
                {t.dealEdit.titleLabel} *
              </label>
              <Input
                required
                placeholder={t.dealEdit.titlePlaceholder}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                  {t.dealEdit.clientLabel}
                </label>
                {selectedContact && (
                  <Link
                    href={ROUTES.crm.customer(selectedContact.id)}
                    className="text-[11px] text-primary dark:text-accent hover:underline font-semibold flex items-center gap-1"
                    target="_blank"
                  >
                    <span>{t.crm.customerDossier}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>
              <EntityLookup domain="contacts" value={contactId} onChange={setContactId} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
                {t.dealEdit.stageLabel}
              </label>
              <Select
                value={dealStage}
                onChange={(e) => setDealStage(e.target.value as DealStage)}
              >
                {stageOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
                {t.dealEdit.valueLabel} ({t.financials.currency})
              </label>
              <Input
                type="number"
                step="0.001"
                value={dealValue}
                onChange={(e) => setDealValue(parseFloat(e.target.value) || 0)}
                className=" text-primary dark:text-accent font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
                {t.dealEdit.probabilityLabel}
              </label>
              <Input
                type="number"
                min="0"
                max="100"
                value={probability}
                onChange={(e) => setProbability(parseInt(e.target.value) || 0)}
                className=""
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
                {t.dealEdit.closeDateLabel}
              </label>
              <Input
                type="date"
                value={expectedCloseDate}
                onChange={(e) => setExpectedCloseDate(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
              {t.dealEdit.shootDateLabel}
            </label>
            <Input
              type="date"
              value={shootDate}
              onChange={(e) => setShootDate(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
              {t.dealEdit.notesLabel}
            </label>
            <Textarea
              rows={4}
              placeholder={t.dealEdit.notesPlaceholder}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </Card>

        <div className="pt-4 border-t border-slate-200 dark:border-white/10 flex items-center justify-end gap-4">
          <Link href={ROUTES.crm.deal(deal.id)}>
            <Button type="button" variant="outline" size="sm">
              {t.actions.cancel}
            </Button>
          </Link>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={saving}
            className="gap-2 bg-primary hover:bg-primary/90 text-white"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{saving ? t.dealEdit.saving : t.dealEdit.save}</span>
          </Button>
        </div>
      </form>

      <EditConfirmModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleConfirmedSave}
        title={t.dealEditForm.confirmDealUpdate}
        description={
          t.dealEditForm.pleaseReviewTheChangesBelow
        }
        changes={changes}
        isSaving={saving}
      />
    </div>
  );
}

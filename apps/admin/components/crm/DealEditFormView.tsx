"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { CRMDeal, CRMContact, DealStage } from "@ishoot/database/types";
import { Card, Input, Select, Button, Textarea } from "@ishoot/ui";
import { ArrowLeft, CheckCircle2, Briefcase } from "lucide-react";
import Link from "next/link";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { updateDealAction } from "../../app/actions/crm";

interface DealEditFormViewProps {
  deal: CRMDeal;
  contacts: CRMContact[];
}

export function DealEditFormView({ deal, contacts }: DealEditFormViewProps) {
  const router = useRouter();
  const { t } = useAdminLocale();

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
  const [saving, setSaving] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;
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
      });

      router.push(`/dashboard/crm/deals/${deal.id}`);
    } catch (err) {
      console.error("Failed to update deal:", err);
    } finally {
      setSaving(false);
    }
  };

  const stageOptions = [
    { value: "lead", label: t.stages?.lead || "Lead" },
    {
      value: "proposal_sent",
      label: t.stages?.proposal_sent || "Proposal Sent",
    },
    {
      value: "contract_signed",
      label: t.stages?.contract_signed || "Contract Signed",
    },
    { value: "production", label: t.stages?.production || "Production" },
    {
      value: "post_production",
      label: t.stages?.post_production || "Post Production",
    },
    { value: "delivered", label: t.stages?.delivered || "Delivered" },
    { value: "closed_won", label: t.stages?.closed_won || "Closed Won" },
    { value: "closed_lost", label: t.stages?.closed_lost || "Closed Lost" },
  ];

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-16">
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/crm/deals/${deal.id}`}>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-[#9EADA9]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t.actions.back}</span>
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white font-display flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-[#09937F]" />
            <span>Edit Commercial Deal</span>
          </h1>
          <p className="text-xs text-[#9EADA9] mt-1">
            Update deal details, stage, value, and scheduling
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="p-8 bg-[#0B1210] border border-white/10 rounded-3xl space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="text-xs font-semibold text-white mb-1.5 block">
                Deal Title / Project Name *
              </label>
              <Input
                required
                placeholder="e.g. Zain Bahrain Q4 Campaign"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-white mb-1.5 block">
                Client / Contact
              </label>
              <Select
                value={contactId}
                onChange={(e) => setContactId(e.target.value)}
              >
                <option value="">-- Select Contact --</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.company ? `${c.company} (${c.full_name})` : c.full_name}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="text-xs font-semibold text-white mb-1.5 block">
                Pipeline Stage
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
              <label className="text-xs font-semibold text-white mb-1.5 block">
                Deal Value (BHD)
              </label>
              <Input
                type="number"
                step="0.001"
                value={dealValue}
                onChange={(e) => setDealValue(parseFloat(e.target.value) || 0)}
                className="font-mono text-[#09937F] font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="text-xs font-semibold text-white mb-1.5 block">
                Win Probability (%)
              </label>
              <Input
                type="number"
                min="0"
                max="100"
                value={probability}
                onChange={(e) => setProbability(parseInt(e.target.value) || 0)}
                className="font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-white mb-1.5 block">
                Expected Close Date
              </label>
              <Input
                type="date"
                value={expectedCloseDate}
                onChange={(e) => setExpectedCloseDate(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-white mb-1.5 block">
              Shoot / Production Date
            </label>
            <Input
              type="date"
              value={shootDate}
              onChange={(e) => setShootDate(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-white mb-1.5 block">
              Notes & Background
            </label>
            <Textarea
              rows={4}
              placeholder="Deal background, client requirements, special considerations..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </Card>

        <div className="pt-6 border-t border-white/10 flex items-center justify-end gap-4">
          <Link href={`/dashboard/crm/deals/${deal.id}`}>
            <Button type="button" variant="outline" size="sm">
              {t.actions.cancel}
            </Button>
          </Link>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={saving}
            className="gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{saving ? "Saving Changes..." : "Save Changes"}</span>
          </Button>
        </div>
      </form>
    </div>
  );
}

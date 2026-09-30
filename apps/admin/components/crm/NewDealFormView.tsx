"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, Button, Input, Select } from "@ishoot/ui";
import { ArrowLeft, CheckCircle2, Kanban } from "lucide-react";
import { DEAL_STAGES } from "@ishoot/config/constants";
import { createCRMDealAction } from "../../app/actions/crm";
import { useAdminLocale } from "../../hooks/useAdminLocale";

export function NewDealFormView() {
  const router = useRouter();
  const { t } = useAdminLocale();

  const [title, setTitle] = React.useState("");
  const [value, setValue] = React.useState<number>(0);
  const [stage, setStage] = React.useState<any>("lead");
  const [contactId, setContactId] = React.useState("");
  const [shootDate, setShootDate] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || value < 0) return;
    setSaving(true);

    try {
      await createCRMDealAction({
        title,
        value: Number(value),
        stage,
        contact_id: contactId || undefined,
        shoot_date: shootDate || undefined,
        notes: notes || undefined,
      });

      router.push("/dashboard/crm/deals");
    } catch (err) {
      console.error("Failed to create deal:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-16">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/crm/deals">
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
            <Kanban className="w-6 h-6 text-[#09937F]" />
            <span>{t.dealsNew.title}</span>
          </h1>
          <p className="text-xs text-[#9EADA9] mt-1">{t.dealsNew.subtitle}</p>
        </div>
      </div>

      <Card className="p-8 bg-[#0B1210] border border-white/10 rounded-3xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="text-xs font-semibold text-white mb-1.5 block">
                {t.dealsNew.dealTitleLabel}
              </label>
              <Input
                required
                placeholder={t.dealsNew.titlePlaceholder}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-white mb-1.5 block">
                {t.dealsNew.valueLabel}
              </label>
              <Input
                type="number"
                required
                min={0}
                placeholder={t.dealsNew.valuePlaceholder}
                value={value || ""}
                onChange={(e) => setValue(parseFloat(e.target.value) || 0)}
                className="font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="text-xs font-semibold text-white mb-1.5 block">
                {t.dealsNew.stageLabel}
              </label>
              <Select
                value={stage}
                onChange={(e) => setStage(e.target.value as any)}
              >
                {DEAL_STAGES.map((s) => (
                  <option
                    key={s.value}
                    value={s.value}
                    className="bg-[#0B1210] text-white"
                  >
                    {t.crm.stages[s.value as keyof typeof t.crm.stages] || s.value}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="text-xs font-semibold text-white mb-1.5 block">
                {t.dealsNew.targetDateLabel}
              </label>
              <Input
                type="date"
                value={shootDate}
                onChange={(e) => setShootDate(e.target.value)}
                className="font-mono"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-white mb-1.5 block">
              {t.dealsNew.descriptionLabel}
            </label>
            <textarea
              rows={4}
              placeholder={t.dealsNew.notesPlaceholder}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-[#050807] border border-white/10 rounded-xl p-3 text-xs text-white placeholder-[#9EADA9]/50 focus:outline-none focus:border-[#09937F]"
            />
          </div>

          <div className="pt-6 border-t border-white/10 flex items-center justify-end gap-4">
            <Link href="/dashboard/crm/deals">
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
              <span>{saving ? t.dealsNew.saving : t.dealsNew.submit}</span>
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

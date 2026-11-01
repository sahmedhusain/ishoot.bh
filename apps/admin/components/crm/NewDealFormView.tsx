"use client";

import { ROUTES } from "../../constants/routes";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, Button, Input, Select } from "@platform/ui";
import { CheckCircle2 } from "lucide-react";
import type { DealPipelineStage } from "@platform/database";
import { dealStageLabel } from "../../lib/deal-stages";
import type { CRMContact, DealStage } from "@platform/database/types";
import { toast } from "sonner";
import { createCRMDealAction } from "../../app/actions/crm";
import { ClientAutocomplete } from "./ClientAutocomplete";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { PageHeader } from "../layout/PageHeader";

export function NewDealFormView({
  defaultCurrency,
  canPickContact,
  canCreateContact,
  initialContact,
  stages,
}: {
  defaultCurrency: string;
  canPickContact: boolean;
  canCreateContact: boolean;
  initialContact: CRMContact | null;
  stages: DealPipelineStage[];
}) {
  const router = useRouter();
  const { t, locale } = useAdminLocale();

  const [title, setTitle] = React.useState("");
  const [value, setValue] = React.useState<number>(0);
  const [stage, setStage] = React.useState<DealStage>("lead");
  const [contactId, setContactId] = React.useState(initialContact?.id ?? "");
  const [shootDate, setShootDate] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || value < 0) return;
    setSaving(true);

    try {
      const res = await createCRMDealAction({
        title,
        value: Number(value),
        stage,
        contact_id: contactId || undefined,
        shoot_date: shootDate || undefined,
        notes: notes || undefined,
      });

      router.push(ROUTES.crm.deal(res.deal.id));
    } catch (err) {
      toast.error(err instanceof Error && err.message ? err.message : t.dealsNew.createFailed);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-16">
      <PageHeader
        back={{ href: ROUTES.crm.deals }}
      />

      <Card className="p-8 bg-surface border border-outline-variant rounded-3xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <label>
              <span className="text-xs font-semibold text-ink mb-1.5 block">
                {t.dealsNew.dealTitleLabel}
              </span>
              <Input
                required
                placeholder={t.dealsNew.titlePlaceholder}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </label>
            <label>
              <span className="text-xs font-semibold text-ink mb-1.5 block">
                {t.dealsNew.valueLabel} ({defaultCurrency})
              </span>
              <Input
                type="number"
                required
                min={0}
                placeholder={t.dealsNew.valuePlaceholder}
                value={value || ""}
                onChange={(e) => setValue(parseFloat(e.target.value) || 0)}
                className=""
              />
            </label>
          </div>

          {canPickContact && (
            <ClientAutocomplete
              label={t.dealsNew.contactLabel}
              contacts={initialContact ? [initialContact] : []}
              selectedContactId={contactId}
              onSelect={(contact) => setContactId(contact?.id ?? "")}
              allowCreate={canCreateContact}
            />
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <label>
              <span className="text-xs font-semibold text-ink mb-1.5 block">
                {t.dealsNew.stageLabel}
              </span>
              <Select
                value={stage}
                onChange={(e) => setStage(e.target.value as DealStage)}
              >
                {stages.map((s) => (
                  <option key={s.id} value={s.id} className="bg-surface text-ink">
                    {dealStageLabel(s, t, locale)}
                  </option>
                ))}
              </Select>
            </label>
            <label>
              <span className="text-xs font-semibold text-ink mb-1.5 block">
                {t.dealsNew.targetDateLabel}
              </span>
              <Input
                type="date"
                value={shootDate}
                onChange={(e) => setShootDate(e.target.value)}
                className=""
              />
            </label>
          </div>

          <label>
            <span className="text-xs font-semibold text-ink mb-1.5 block">
              {t.dealsNew.descriptionLabel}
            </span>
            <textarea
              rows={4}
              placeholder={t.dealsNew.notesPlaceholder}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-surface-sunken border border-outline-variant rounded-xl p-3 text-xs text-ink placeholder-ink-muted/50 focus:outline-none focus:border-accent"
            />
          </label>

          <div className="pt-6 border-t border-outline-variant flex items-center justify-end gap-4">
            <Link href={ROUTES.crm.deals}>
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

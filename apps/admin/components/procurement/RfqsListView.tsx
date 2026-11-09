"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileQuestion, Loader2, Plus } from "lucide-react";
import { Button, Card, Input, formatDate } from "@platform/ui";
import { formatMessage } from "@platform/locales";
import type { ProcurementProductOption } from "@platform/database";
import { ROUTES } from "../../constants/routes";
import { createRfqAction } from "../../app/actions/procurement";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { errorMessage } from "../../lib/error-text";
import { Field } from "../setup/LanguageFields";
import { LinesEditor, emptyLine, linesInput, type LineDraft } from "./LinesEditor";
import { StatusPill } from "./StatusPill";
import { PageHeader } from "../layout/PageHeader";

interface Row {
  id: string;
  number: string;
  title: string;
  status: string;
  due_date: string | null;
  lines: number;
  suppliers: number;
}

export function RfqsListView({ rows, products, canEdit }: { rows: Row[]; products: ProcurementProductOption[]; canEdit: boolean }) {
  const { t, locale } = useAdminLocale();
  const copy = t.procurement.rfqs;
  const router = useRouter();
  const [draft, setDraft] = React.useState<{ title: string; dueDate: string; lines: LineDraft[] } | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const create = async () => {
    if (!draft) return;
    setBusy(true);
    setError("");
    try {
      const result = await createRfqAction({ title: draft.title, dueDate: draft.dueDate, note: "", lines: linesInput(draft.lines) });
      router.push(ROUTES.procurement.rfq(result.id));
    } catch (err) {
      setError(errorMessage(err, t));
      setBusy(false);
    }
  };
  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      <PageHeader
        actions={canEdit && !draft && (
          <Button type="button" variant="primary" size="sm" className="rounded-full gap-1.5" onClick={() => setDraft({ title: "", dueDate: "", lines: [emptyLine()] })}>
            <Plus className="w-3.5 h-3.5" />
            {copy.new}
          </Button>
        )}
      />
      {draft && (
        <Card className="p-5 space-y-4" data-testid="rfq-new">
          <div className="grid sm:grid-cols-3 gap-4">
            <Field label={copy.titleField} wide>
              {(id) => <Input id={id} name="rfqTitle" maxLength={200} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} className="rounded-lg" />}
            </Field>
            <Field label={copy.dueDate}>
              {(id) => <Input id={id} type="date" value={draft.dueDate} onChange={(e) => setDraft({ ...draft, dueDate: e.target.value })} className="rounded-lg" />}
            </Field>
          </div>
          <LinesEditor lines={draft.lines} onChange={(lines) => setDraft({ ...draft, lines })} products={products} priceLabel="" showPrice={false} />
          {error && <p role="alert" className="text-sm rounded-xl px-4 py-3 bg-rose-500/10 text-rose-700 dark:text-rose-300">{error}</p>}
          <div className="flex gap-2">
            <Button type="button" variant="primary" size="sm" className="rounded-full gap-1.5" disabled={busy} onClick={create} data-testid="rfq-create">
              {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {t.procurement.common.save}
            </Button>
            <Button type="button" variant="ghost" size="sm" className="rounded-full" onClick={() => setDraft(null)}>{t.procurement.common.cancel}</Button>
          </div>
        </Card>
      )}
      <Card className="overflow-hidden">
        {rows.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <FileQuestion className="w-8 h-8 text-ink-muted" aria-hidden="true" />
            <p className="text-sm text-ink-muted">{copy.empty}</p>
          </div>
        ) : (
          <ul className="divide-y divide-outline-variant">
            {rows.map((r) => (
              <li key={r.id}>
                <Link href={ROUTES.procurement.rfq(r.id)} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 hover:bg-ink/[0.02]">
                  <span className="font-mono text-xs font-semibold text-ink" dir="ltr">{r.number}</span>
                  <StatusPill status={r.status} />
                  <span className="text-sm text-ink"><bdi dir="auto">{r.title}</bdi></span>
                  <span className="text-xs text-ink-muted">{formatMessage(copy.suppliers, { count: r.suppliers })}</span>
                  {r.due_date && <span className="ms-auto text-xs text-ink-muted">{`${copy.dueDate}: ${formatDate(r.due_date, locale)}`}</span>}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

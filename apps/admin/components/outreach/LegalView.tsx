"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileBadge, FileSignature, Plus, Scale, Search } from "lucide-react";
import { Button, Card, Input, Select, Textarea, formatCurrencyValue, formatDate } from "@platform/ui";
import { formatMessage } from "@platform/locales";
import { LEGAL_KINDS, LEGAL_STATUSES } from "@platform/database/constants/outreach";
import type { LegalMatterInput, LegalMatterRecord, LegalMatterRow, contractRegister, licenceRegister } from "@platform/database";
import { ROUTES } from "../../constants/routes";
import { addLegalNoteAction, saveLegalMatterAction } from "../../app/actions/outreach";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { errorMessage } from "../../lib/error-text";
import { Field } from "../setup/LanguageFields";
import { PageHeader } from "../layout/PageHeader";

type Licence = Awaited<ReturnType<typeof licenceRegister>>[number];
type ContractRow = Awaited<ReturnType<typeof contractRegister>>[number];
type Person = { id: string; name: string };

const blank: LegalMatterInput = { title: "", kind: "dispute", status: "open", counterparty: "", reference: "", nextDate: "", assigneeId: "", amountAtStake: "", description: "", outcome: "" };

function MatterForm({ initial, currency, people, onDone, onCancel }: { initial: LegalMatterInput; currency: string; people: Person[]; onDone: (id: string) => void; onCancel: () => void }) {
  const { t } = useAdminLocale();
  const copy = t.legal;
  const [form, setForm] = React.useState(initial);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const save = async () => {
    setBusy(true);
    setError("");
    try {
      onDone((await saveLegalMatterAction(form)).id);
    } catch (err) {
      setError(errorMessage(err, t));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="grid sm:grid-cols-3 gap-3" data-testid="legal-form">
      <div className="sm:col-span-2"><Field label={copy.fields.title}>{(id) => <Input id={id} name="matterTitle" maxLength={200} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="rounded-lg" />}</Field></div>
      <Field label={copy.fields.kind}>
        {(id) => (
          <Select id={id} name="matterKind" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })} className="rounded-lg">
            {LEGAL_KINDS.map((k) => <option key={k} value={k}>{copy.kinds[k]}</option>)}
          </Select>
        )}
      </Field>
      <Field label={copy.fields.counterparty}>{(id) => <Input id={id} name="matterCounterparty" maxLength={200} value={form.counterparty} onChange={(e) => setForm({ ...form, counterparty: e.target.value })} className="rounded-lg" />}</Field>
      <Field label={copy.fields.reference}>{(id) => <Input id={id} maxLength={120} value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} className="rounded-lg" />}</Field>
      <Field label={copy.fields.status}>
        {(id) => (
          <Select id={id} name="matterStatus" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="rounded-lg">
            {LEGAL_STATUSES.map((s) => <option key={s} value={s}>{copy.statuses[s]}</option>)}
          </Select>
        )}
      </Field>
      <Field label={copy.fields.nextDate}>{(id) => <Input id={id} name="matterNextDate" type="date" value={form.nextDate} onChange={(e) => setForm({ ...form, nextDate: e.target.value })} className="rounded-lg" />}</Field>
      <Field label={copy.fields.assignee}>
        {(id) => (
          <Select id={id} name="matterAssignee" value={form.assigneeId ?? ""} onChange={(e) => setForm({ ...form, assigneeId: e.target.value })} className="rounded-lg">
            <option value="">{copy.fields.noAssignee}</option>
            {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
        )}
      </Field>
      <Field label={formatMessage(copy.fields.amount, { currency })}>{(id) => <Input id={id} type="number" min={0} step="any" value={form.amountAtStake} onChange={(e) => setForm({ ...form, amountAtStake: e.target.value })} className="rounded-lg" />}</Field>
      <div className="sm:col-span-3"><Field label={copy.fields.description}>{(id) => <Textarea id={id} rows={3} maxLength={10000} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="rounded-lg" />}</Field></div>
      {form.status === "closed" && <div className="sm:col-span-3"><Field label={copy.fields.outcome}>{(id) => <Textarea id={id} name="matterOutcome" rows={2} maxLength={10000} value={form.outcome} onChange={(e) => setForm({ ...form, outcome: e.target.value })} className="rounded-lg" />}</Field></div>}
      {error && <p role="alert" className="sm:col-span-3 text-sm text-rose-600">{error}</p>}
      <div className="sm:col-span-3 flex gap-2">
        <Button type="button" size="sm" variant="primary" className="rounded-full" disabled={busy || !form.title.trim()} onClick={() => void save()} data-testid="legal-save">{copy.save}</Button>
        <Button type="button" size="sm" variant="ghost" className="rounded-full" onClick={onCancel}>{copy.cancel}</Button>
      </div>
    </div>
  );
}

/** Legal: matters by next date, with the licence and contract registers. */
export function LegalView({ matters, licences, contracts, filters, currency, canEdit, people, today }: { matters: LegalMatterRow[]; licences: Licence[]; contracts: ContractRow[]; filters: { status: string; q: string }; currency: string; canEdit: boolean; people: Person[]; today: string }) {
  const { t, locale } = useAdminLocale();
  const copy = t.legal;
  const router = useRouter();
  const [adding, setAdding] = React.useState(false);
  const [search, setSearch] = React.useState(filters.q);
  const href = (next: { status?: string; q?: string }) => {
    const params = new URLSearchParams();
    const status = next.status ?? filters.status;
    const q = next.q ?? filters.q;
    if (status === "all") params.set("status", "all");
    if (q) params.set("q", q);
    return params.toString() ? `${ROUTES.legal.matters}?${params}` : ROUTES.legal.matters;
  };
  const documentStatus = (status: string) => (t.documents.contractStatuses as Record<string, string>)[status] ?? status;
  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      <PageHeader
        actions={canEdit && !adding && <Button type="button" size="sm" variant="primary" className="rounded-full gap-1.5" onClick={() => setAdding(true)} data-testid="legal-new"><Plus className="w-4 h-4" />{copy.new}</Button>}
      />
      {adding && (
        <Card className="p-5">
          <MatterForm initial={blank} currency={currency} people={people} onCancel={() => setAdding(false)} onDone={(id) => router.push(ROUTES.legal.matter(id))} />
        </Card>
      )}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="inline-flex rounded-full border border-outline-variant p-1 text-xs font-semibold">
          {(["open", "all"] as const).map((s) => (
            <Link key={s} href={href({ status: s })} aria-current={filters.status === s ? "page" : undefined} className={`rounded-full px-3 py-1.5 ${filters.status === s ? "bg-primary text-primary-foreground" : "text-ink-muted"}`}>{s === "open" ? copy.openOnly : copy.all}</Link>
          ))}
        </div>
        <form role="search" className="relative flex-1" onSubmit={(e) => { e.preventDefault(); router.push(href({ q: search.trim() })); }}>
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" aria-hidden="true" />
          <Input type="search" aria-label={copy.search} placeholder={copy.search} value={search} onChange={(e) => setSearch(e.target.value)} className="ps-9 rounded-xl" />
        </form>
      </div>
      <Card className="overflow-hidden">
        {matters.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
            <Scale className="w-8 h-8 text-ink-muted" aria-hidden="true" />
            <p className="text-sm text-ink-muted">{copy.empty}</p>
          </div>
        ) : (
          <ul className="divide-y divide-outline-variant" data-testid="legal-list">
            {matters.map((m) => (
              <li key={m.id}>
                <Link href={ROUTES.legal.matter(m.id)} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-sm hover:bg-ink/[0.02]">
                  <span className="font-mono text-xs font-semibold" dir="ltr">{m.number}</span>
                  <span className="font-medium text-ink"><bdi dir="auto">{m.title}</bdi></span>
                  <span className="text-xs text-ink-muted">{(copy.kinds as Record<string, string>)[m.kind]} · {(copy.statuses as Record<string, string>)[m.status]}</span>
                  {m.counterparty && <span className="text-xs text-ink-muted">{m.counterparty}</span>}
                  {m.next_date && <span className={`ms-auto text-xs font-semibold ${m.next_date < today ? "text-rose-600" : "text-ink"}`}>{formatMessage(copy.next, { date: formatDate(m.next_date, locale) })}</span>}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-5 space-y-3" data-page-section>
          <h2 className="font-bold text-ink flex items-center gap-2"><FileBadge className="w-4 h-4 text-accent" aria-hidden="true" />{copy.licences}</h2>
          <p className="text-xs text-ink-muted">{copy.licencesHint}</p>
          {licences.length === 0 ? (
            <p className="text-sm text-ink-muted">{copy.noLicences}</p>
          ) : (
            <ul className="divide-y divide-outline-variant text-sm">
              {licences.map((l) => (
                <li key={l.id} className="flex items-center gap-3 py-2">
                  <Link href={ROUTES.company.documents} className="flex-1 hover:text-accent">{locale === "ar" ? l.title_ar : l.title_en}</Link>
                  {l.valid_until && <span className={`text-xs ${l.valid_until < today ? "text-rose-600 font-semibold" : "text-ink-muted"}`}>{formatDate(l.valid_until, locale)}</span>}
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card className="p-5 space-y-3" data-page-section>
          <h2 className="font-bold text-ink flex items-center gap-2"><FileSignature className="w-4 h-4 text-accent" aria-hidden="true" />{copy.contracts}</h2>
          {contracts.length === 0 ? (
            <p className="text-sm text-ink-muted">—</p>
          ) : (
            <ul className="divide-y divide-outline-variant text-sm">
              {contracts.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
                  {c.deal_id ? <Link href={ROUTES.crm.deal(c.deal_id)} className="font-medium hover:text-accent">{locale === "ar" ? c.title_ar : c.title_en}</Link> : <span className="font-medium">{locale === "ar" ? c.title_ar : c.title_en}</span>}
                  <span className="text-xs text-ink-muted">{[c.party, documentStatus(c.status)].filter(Boolean).join(" · ")}</span>
                  {c.valid_until && <span className={`ms-auto text-xs ${c.valid_until < today ? "text-rose-600 font-semibold" : "text-ink-muted"}`}>{formatDate(c.valid_until, locale)}</span>}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

/** One legal matter: its details (editable), history and notes. */
export function LegalMatterView({ matter, currency, canEdit, people }: { matter: LegalMatterRecord; currency: string; canEdit: boolean; people: Person[] }) {
  const { t, locale } = useAdminLocale();
  const copy = t.legal;
  const router = useRouter();
  const [editing, setEditing] = React.useState(false);
  const [note, setNote] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const eventText = (e: LegalMatterRecord["events"][number]) =>
    e.kind === "status" ? formatMessage(copy.events.status, { value: (copy.statuses as Record<string, string>)[e.body] ?? e.body }) : e.kind === "date" ? formatMessage(copy.events.date, { value: formatDate(e.body, locale) }) : e.body;
  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16" >
      <PageHeader
        title={matter.title}
        description={<><span className="font-mono" dir="ltr">{matter.number}</span>
          <span>{(copy.kinds as Record<string, string>)[matter.kind]}</span>
          <span data-testid="legal-status">{(copy.statuses as Record<string, string>)[matter.status]}</span>
          {matter.counterparty && <span>{matter.counterparty}</span>}
          {matter.reference && <span dir="auto"><bdi dir="ltr">{matter.reference}</bdi></span>}
          {matter.next_date && <span className="font-semibold text-ink">{formatMessage(copy.next, { date: formatDate(matter.next_date, locale) })}</span>}
          {matter.assignee && <span>{matter.assignee}</span>}
          {matter.amount_at_stake != null && <span>{formatCurrencyValue(matter.amount_at_stake, currency, locale === "ar")}</span>}</>}
        back={{ href: ROUTES.legal.matters, label: copy.back }}
      />
      <Card className="p-5 space-y-3">
        {editing ? (
          <MatterForm
            initial={{ id: matter.id, title: matter.title, kind: matter.kind, status: matter.status, counterparty: matter.counterparty, reference: matter.reference, nextDate: matter.next_date ?? "", assigneeId: matter.assignee_id, amountAtStake: matter.amount_at_stake?.toString() ?? "", description: matter.description, outcome: matter.outcome }}
            currency={currency}
            people={people}
            onCancel={() => setEditing(false)}
            onDone={() => { setEditing(false); router.refresh(); }}
          />
        ) : (
          <>
            {matter.description && <p className="text-sm whitespace-pre-line">{matter.description}</p>}
            {matter.outcome && <p className="text-sm whitespace-pre-line rounded-xl bg-ink/[0.03] p-3"><span className="font-semibold">{copy.fields.outcome}: </span>{matter.outcome}</p>}
            {canEdit && <Button type="button" size="sm" variant="outline" className="rounded-full" onClick={() => setEditing(true)} data-testid="legal-edit">{copy.edit}</Button>}
          </>
        )}
      </Card>
      <Card className="p-5 space-y-3" data-page-section>
        <h2 className="font-bold text-ink">{copy.history}</h2>
        <ol className="space-y-2 text-sm" data-testid="legal-history">
          {matter.events.map((e) => (
            <li key={e.id} className="flex flex-wrap gap-x-3">
              <span className="text-xs text-ink-muted w-36">{formatDate(e.at, locale, "time")}</span>
              <span className={e.kind === "note" ? "whitespace-pre-line" : "font-medium"}>{eventText(e)}</span>
              {e.by && <span className="text-xs text-ink-muted">{e.by}</span>}
            </li>
          ))}
        </ol>
        {canEdit && (
          <div className="flex gap-2">
            <Textarea aria-label={copy.note} placeholder={copy.note} name="legalNote" rows={2} maxLength={5000} value={note} onChange={(e) => setNote(e.target.value)} className="rounded-lg" />
            <Button type="button" size="sm" variant="outline" className="rounded-full shrink-0 self-end" disabled={busy || !note.trim()} onClick={async () => { setBusy(true); try { await addLegalNoteAction(matter.id, note); setNote(""); router.refresh(); } finally { setBusy(false); } }} data-testid="legal-note-add">{copy.addNote}</Button>
          </div>
        )}
      </Card>
    </div>
  );
}

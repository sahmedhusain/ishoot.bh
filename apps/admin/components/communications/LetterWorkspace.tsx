"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Select, Button, Input, Textarea } from "@platform/ui";
import type {
  OfficialLetterDetail,
  OfficialLetterInput,
  listLetterTemplates,
  LetterTemplateInput,
} from "@platform/database";
import { LETTER_PLACEHOLDERS } from "@platform/database/constants/communications";
import {
  saveOfficialLetterAction,
  submitOfficialLetterAction,
  cancelOfficialLetterAction,
  draftLetterTemplateAction,
  saveLetterTemplateAction,
} from "../../app/actions/communications";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { errorMessage } from "../../lib/error-text";
import { ROUTES } from "../../constants/routes";
import { ApprovalDecisionPanel } from "../approvals/ApprovalDecisionPanel";
import { BilingualPdfActions } from "../shared/BilingualPdfActions";
import { PageHeader } from "../layout/PageHeader";
type Templates = Awaited<ReturnType<typeof listLetterTemplates>>;
export function LetterWorkspace({
  letter,
  initialTemplateId,
  templates,
  employees,
  canEdit,
  canDelete,
  canExport,
  approvalId,
  live,
}: {
  letter?: OfficialLetterDetail;
  initialTemplateId?: string;
  templates: Templates;
  employees: Array<{ id: string; name: string }>;
  canEdit: boolean;
  canDelete: boolean;
  canExport: boolean;
  approvalId?: string | null;
  live?: boolean;
}) {
  const { t, locale } = useAdminLocale();
  const c = t.communications;
  const labels: Record<string, string> = c;
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [purpose, setPurpose] = useState("");
  const [form, setForm] = useState<OfficialLetterInput>({
    template_id:
      letter?.templateId ??
      (templates.some((t) => t.id === initialTemplateId)
        ? initialTemplateId
        : ""),
    employee_id: letter?.employeeId ?? "",
    languages: letter?.languages ?? ["ar", "en"],
    recipient_name: letter?.recipientName ?? "",
    recipient_title: letter?.recipientTitle ?? "",
    recipient_organization: letter?.recipientOrganization ?? "",
    recipient_address: letter?.recipientAddress ?? "",
    subject_en: letter?.subjectEn ?? "",
    subject_ar: letter?.subjectAr ?? "",
    body_en: letter?.bodyEn ?? "",
    body_ar: letter?.bodyAr ?? "",
    letter_date:
      letter?.letterDate ??
      new Date(Date.now() + 3 * 3600000).toISOString().slice(0, 10),
    classification: letter?.classification ?? "external",
    show_signature: letter?.showSignature ?? true,
    show_stamp: letter?.showStamp ?? true,
  });
  const patch = (next: Partial<OfficialLetterInput>) =>
    setForm({ ...form, ...next });
  const editable =
    canEdit && (!letter || ["draft", "rejected"].includes(letter.status));
  const run = async (work: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await work();
      router.refresh();
    } catch (err) {
      toast.error(errorMessage(err, t, c.failed));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <PageHeader
        title={letter ? `${letter.reference} · ${labels[letter.status]}` : c.new}
        back={{ href: ROUTES.letters.list(), label: c.letters }}
      />
      {editable ? (
        <form
          className="space-y-5 rounded-3xl border border-outline-variant p-6"
          onSubmit={(e) => {
            e.preventDefault();
            void run(async () => {
              const result = await saveOfficialLetterAction(form, letter?.id);
              router.push(ROUTES.letters.detail(result.id));
            });
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <label>
              {c.template}
              <Select
                className="block w-full rounded border p-2 bg-surface"
                value={form.template_id ?? ""}
                onChange={(e) => patch({ template_id: e.target.value })}
              >
                <option value="">{c.custom}</option>
                {templates
                  .filter((t) => t.isActive)
                  .map((v) => (
                    <option key={v.id} value={v.id}>
                      {locale === "ar" ? v.nameAr : v.nameEn}
                    </option>
                  ))}
              </Select>
            </label>
            <label>
              {c.employee}
              <Select
                className="block w-full rounded border p-2 bg-surface"
                value={form.employee_id ?? ""}
                onChange={(e) => patch({ employee_id: e.target.value })}
              >
                <option value="">—</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </Select>
            </label>
          </div>
          <label className="block">
            {c.purpose}
            <Input
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
            />
          </label>
          <Button
            variant="outline"
            type="button"
            disabled={busy || !form.template_id}
            onClick={() =>
              run(async () => {
                const filled = await draftLetterTemplateAction(
                  form.template_id!,
                  form.employee_id || undefined,
                  purpose,
                  {
                    name: form.recipient_name ?? "",
                    title: form.recipient_title ?? "",
                    organization: form.recipient_organization ?? "",
                  },
                );
                patch({
                  subject_en: filled.subjectEn,
                  subject_ar: filled.subjectAr,
                  body_en: filled.bodyEn,
                  body_ar: filled.bodyAr,
                });
              })
            }
          >
            {c.applyTemplate}
          </Button>
          <div className="grid gap-4 sm:grid-cols-2">
            {(
              [
                ["recipient_name", "recipient"],
                ["recipient_title", "recipientTitle"],
                ["recipient_organization", "organization"],
                ["recipient_address", "address"],
              ] as const
            ).map(([key, label]) => (
              <label key={key}>
                {c[label]}
                <Input
                  value={form[key] ?? ""}
                  onChange={(e) => patch({ [key]: e.target.value })}
                />
              </label>
            ))}
          </div>
          <div className="flex gap-5">
            {(["ar", "en"] as const).map((lang) => (
              <label key={lang}>
                <input
                  type="checkbox"
                  checked={form.languages.includes(lang)}
                  onChange={(e) =>
                    patch({
                      languages: e.target.checked
                        ? [...form.languages, lang]
                        : form.languages.filter((l) => l !== lang),
                    })
                  }
                />{" "}
                {t.salaryDocumentLanguages.names[lang]}
              </label>
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {(
              [
                ["subject_en", "titleEn"],
                ["subject_ar", "titleAr"],
                ["body_en", "bodyEn"],
                ["body_ar", "bodyAr"],
              ] as const
            ).map(([key, label]) => (
              <label key={key}>
                {c[label]}
                {key.startsWith("body") ? (
                  <Textarea
                    rows={10}
                    dir={key.endsWith("ar") ? "rtl" : "ltr"}
                    value={form[key]}
                    onChange={(e) => patch({ [key]: e.target.value })}
                  />
                ) : (
                  <Input
                    dir={key.endsWith("ar") ? "rtl" : "ltr"}
                    value={form[key]}
                    onChange={(e) => patch({ [key]: e.target.value })}
                  />
                )}
              </label>
            ))}
          </div>
          <div className="flex flex-wrap gap-5">
            <label>
              {c.date}
              <Input
                type="date"
                required
                value={form.letter_date}
                onChange={(e) => patch({ letter_date: e.target.value })}
              />
            </label>
            <label>
              {c.classification}
              <Select
                className="block rounded border p-2 bg-surface"
                value={form.classification}
                onChange={(e) => patch({ classification: e.target.value })}
              >
                {["external", "internal", "confidential"].map((v) => (
                  <option key={v} value={v}>
                    {labels[v]}
                  </option>
                ))}
              </Select>
            </label>
            {(
              [
                ["show_signature", "showSignature"],
                ["show_stamp", "showStamp"],
              ] as const
            ).map(([key, label]) => (
              <label key={key}>
                <input
                  type="checkbox"
                  checked={form[key]}
                  onChange={(e) => patch({ [key]: e.target.checked })}
                />{" "}
                {c[label]}
              </label>
            ))}
          </div>
          <Button type="submit" disabled={busy}>
            {c.save}
          </Button>
        </form>
      ) : (
        <article className="rounded-3xl border p-6" data-page-section>
          <p>
            {letter?.recipientOrganization} · {letter?.recipientName}
          </p>
          <h2 className="text-xl font-bold my-4">
            {locale === "ar" ? letter?.subjectAr : letter?.subjectEn}
          </h2>
          <p className="whitespace-pre-wrap leading-8">
            {locale === "ar" ? letter?.bodyAr : letter?.bodyEn}
          </p>
        </article>
      )}
      {letter && (
        <div className="flex flex-wrap gap-3">
          {editable && (
            <Button
              disabled={busy}
              onClick={() => run(() => submitOfficialLetterAction(letter.id))}
            >
              {c.submit}
            </Button>
          )}
          {canDelete && letter.status !== "cancelled" && (
            <Button
              disabled={busy}
              variant="outline"
              onClick={() => run(() => cancelOfficialLetterAction(letter.id))}
            >
              {t.actions.cancel}
            </Button>
          )}
          {canExport && (
            <BilingualPdfActions
              languages={letter.languages}
              pdfUrl={(lang, download) =>
                `/api/letters/${letter.id}/pdf?locale=${lang}${download ? "&download=true" : ""}`
              }
            />
          )}
        </div>
      )}
      {approvalId && (
        <ApprovalDecisionPanel
          approvalId={approvalId}
          requiresSignature={live}
        />
      )}{" "}
      {letter?.decisionNotes && <p>{letter.decisionNotes}</p>}
    </div>
  );
}
export function LetterTemplatesView({
  templates,
  canEdit,
}: {
  templates: Templates;
  canEdit: boolean;
}) {
  const { t, locale } = useAdminLocale();
  const c = t.communications;
  const router = useRouter();
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const empty: LetterTemplateInput = {
    name_en: "",
    name_ar: "",
    subject_en: "",
    subject_ar: "",
    body_en: "",
    body_ar: "",
    about_employee: false,
    is_active: true,
  };
  const [form, setForm] = useState(empty);
  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <h1 className="text-2xl font-bold">{c.templates}</h1>
      {canEdit && (
        <Button
          onClick={() => {
            setForm(empty);
            setEditing("new");
          }}
        >
          {c.new}
        </Button>
      )}
      {templates.map((v) => (
        <div key={v.id} className="flex justify-between rounded-xl border p-4">
          <span>{locale === "ar" ? v.nameAr : v.nameEn}</span>
          <div className="flex gap-3">
            <Link href={ROUTES.letters.create({ templateId: v.id })}>
              {c.new}
            </Link>
            {canEdit && (
              <button
                onClick={() => {
                  setEditing(v.id);
                  setForm({
                    name_en: v.nameEn,
                    name_ar: v.nameAr,
                    subject_en: v.subjectEn,
                    subject_ar: v.subjectAr,
                    body_en: v.bodyEn,
                    body_ar: v.bodyAr,
                    about_employee: v.aboutEmployee,
                    is_active: v.isActive,
                  });
                }}
              >
                {t.actions.edit}
              </button>
            )}
          </div>
        </div>
      ))}
      {editing && (
        <form
          className="space-y-4 rounded-2xl border p-5"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            try {
              await saveLetterTemplateAction(
                form,
                editing === "new" ? undefined : editing,
              );
              setEditing(null);
              router.refresh();
            } catch (err) {
              toast.error(errorMessage(err, t, c.failed));
            } finally {
              setBusy(false);
            }
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            {(
              [
                ["name_en", "nameEn"],
                ["name_ar", "nameAr"],
                ["subject_en", "titleEn"],
                ["subject_ar", "titleAr"],
                ["body_en", "bodyEn"],
                ["body_ar", "bodyAr"],
              ] as const
            ).map(([key, label]) => (
              <label key={key}>
                {c[label]}
                <Textarea
                  rows={key.startsWith("body") ? 6 : 1}
                  dir={key.endsWith("ar") ? "rtl" : "ltr"}
                  value={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                />
              </label>
            ))}
          </div>
          <p className="text-sm">
            {c.placeholders}:{" "}
            {LETTER_PLACEHOLDERS.map((p) => `{{${p}}}`).join(", ")}
          </p>
          <label>
            <input
              type="checkbox"
              checked={form.about_employee}
              onChange={(e) =>
                setForm({ ...form, about_employee: e.target.checked })
              }
            />{" "}
            {c.aboutEmployee}
          </label>
          <label className="ms-4">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) =>
                setForm({ ...form, is_active: e.target.checked })
              }
            />{" "}
            {c.active}
          </label>
          <div className="flex gap-3">
            <Button disabled={busy}>{c.save}</Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditing(null)}
            >
              {t.actions.cancel}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

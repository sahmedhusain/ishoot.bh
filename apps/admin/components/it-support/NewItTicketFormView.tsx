"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Select } from "@platform/ui";
import { CheckCircle2, Loader2, Paperclip, X } from "lucide-react";
import {
  TICKET_CATEGORIES,
  TICKET_DEFAULT_PRIORITY,
  TICKET_PRIORITIES,
  fileFolder,
  ticketCategory,
} from "@platform/contracts";
import { ROUTES } from "../../constants/routes";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { useUnsavedChanges } from "../../hooks/useUnsavedChanges";
import { errorMessage } from "../../lib/error-text";
import { uploadFileDirectly } from "../../lib/upload-client";
import { createItTicketAction } from "../../app/actions/it-support";
import { PageHeader } from "../layout/PageHeader";
import { useTicketText } from "./ticket-text";

const ACCEPT = fileFolder("general")?.types.join(",") ?? "";

export function NewItTicketFormView() {
  const router = useRouter();
  const { t } = useAdminLocale();
  const s = t.itSupport;
  const text = useTicketText();
  const fileRef = React.useRef<HTMLInputElement>(null);

  const [category, setCategory] = React.useState(
    TICKET_CATEGORIES[0]?.key ?? "",
  );
  const [subcategory, setSubcategory] = React.useState(
    TICKET_CATEGORIES[0]?.subcategories[0]?.key ?? "",
  );
  const [priority, setPriority] = React.useState(TICKET_DEFAULT_PRIORITY);
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [assetRef, setAssetRef] = React.useState("");
  const [files, setFiles] = React.useState<{ url: string; name: string }[]>([]);
  const [uploading, setUploading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");

  const markSaved = useUnsavedChanges({
    category,
    subcategory,
    priority,
    title,
    description,
    assetRef,
    files,
    uploading,
  });
  const selected = ticketCategory(category);

  const chooseCategory = (key: string) => {
    setCategory(key);
    setSubcategory(ticketCategory(key)?.subcategories[0]?.key ?? "");
  };

  const upload = async (file: File) => {
    setUploading(true);
    setError("");
    try {
      const data = await uploadFileDirectly(file, {
        entityType: "it_ticket",
        entityId: "pending",
      });
      setFiles((current) => [
        ...current,
        { url: data.fileUrl, name: file.name },
      ]);
    } catch (err) {
      setError(errorMessage(err, t, s.uploadFailed));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await createItTicketAction({
        category,
        subcategory,
        priority,
        title,
        description,
        assetRef: selected?.linksAsset ? assetRef : undefined,
        attachmentUrls: files.map((f) => f.url),
      });
      if (!markSaved()) return;
      router.push(ROUTES.itSupport.detail(res.id));
    } catch (err) {
      setError(errorMessage(err, t, s.submitFailed));
      setSaving(false);
    }
  };

  const label = "text-xs font-semibold text-ink mb-1.5 block";
  const select =
    "w-full rounded-xl border border-outline-variant bg-surface px-3 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30";

  return (
    <div
      inert={saving}
      aria-busy={saving}
      className="space-y-6 max-w-3xl mx-auto pb-16"
    >
      <PageHeader back={{ href: ROUTES.itSupport.list() }} />

      <form onSubmit={submit} className="space-y-6">
        {error && (
          <p
            role="alert"
            className="p-3 rounded-xl bg-rose-500/10 text-rose-600 text-sm"
          >
            {error}
          </p>
        )}

        <Card className="p-6 sm:p-8 bg-surface border border-outline-variant rounded-3xl space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div>
              <label className={label} htmlFor="ticket-category">
                {s.category}
              </label>
              <Select
                id="ticket-category"
                className={select}
                value={category}
                onChange={(e) => chooseCategory(e.target.value)}
              >
                {TICKET_CATEGORIES.map((c) => (
                  <option key={c.key} value={c.key}>
                    {text.name(c)}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className={label} htmlFor="ticket-subcategory">
                {s.subcategory}
              </label>
              <Select
                id="ticket-subcategory"
                className={select}
                value={subcategory}
                onChange={(e) => setSubcategory(e.target.value)}
              >
                {selected?.subcategories.map((sub) => (
                  <option key={sub.key} value={sub.key}>
                    {text.name(sub)}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className={label} htmlFor="ticket-priority">
                {s.priority}
              </label>
              <Select
                id="ticket-priority"
                className={select}
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              >
                {TICKET_PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {text.priority(p)}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div>
            <label className={label} htmlFor="ticket-title">
              {s.ticketTitle}
            </label>
            <Input
              id="ticket-title"
              required
              maxLength={200}
              placeholder={s.titlePlaceholder}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div>
            <label className={label} htmlFor="ticket-description">
              {s.description}
            </label>
            <textarea
              id="ticket-description"
              required
              maxLength={10000}
              rows={5}
              placeholder={s.descriptionPlaceholder}
              className="w-full rounded-xl border border-outline-variant bg-surface px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          {selected?.linksAsset && (
            <div>
              <label className={label} htmlFor="ticket-asset">
                {s.assetRef}
              </label>
              <Input
                id="ticket-asset"
                maxLength={100}
                dir="ltr"
                value={assetRef}
                onChange={(e) => setAssetRef(e.target.value)}
              />
              <p className="text-[11px] text-ink-muted mt-1">
                {s.assetRefHint}
              </p>
            </div>
          )}
        </Card>

        <Card className="p-6 sm:p-8 bg-surface border border-outline-variant rounded-3xl space-y-3">
          <span className={label}>{s.attachments}</span>
          {files.map((file) => (
            <div
              key={file.url}
              className="flex items-center gap-3 p-3 rounded-2xl border border-outline-variant"
            >
              <Paperclip className="w-4 h-4 text-ink-muted" />
              <span className="text-sm text-ink truncate flex-1">
                <bdi dir="auto">{file.name}</bdi>
              </span>
              <button
                type="button"
                onClick={() =>
                  setFiles((current) =>
                    current.filter((f) => f.url !== file.url),
                  )
                }
                className="p-2 rounded-lg text-ink-muted hover:text-rose-500"
                aria-label={s.removeAttachment}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="w-full flex flex-col items-center gap-2 p-6 rounded-2xl border-2 border-dashed border-outline-variant text-ink-muted hover:border-accent hover:text-accent"
          >
            {uploading ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <Paperclip className="w-6 h-6" />
            )}
            <span className="text-sm font-semibold">
              {uploading ? s.uploading : s.addAttachment}
            </span>
            <span className="text-[11px]">{s.attachmentsHint}</span>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept={ACCEPT}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void upload(file);
            }}
          />
        </Card>

        <div className="flex justify-end gap-3">
          <Link href={ROUTES.itSupport.list()}>
            <Button type="button" variant="outline" size="sm">
              {t.actions.cancel}
            </Button>
          </Link>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={saving || uploading}
            className="gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            {saving ? s.submitting : s.submit}
          </Button>
        </div>
      </form>
    </div>
  );
}

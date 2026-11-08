"use client";

import * as React from "react";
import { Input } from "@platform/ui";
import { formatMessage } from "@platform/locales";
import type { WebsiteDocument } from "@platform/database/constants/website-documents";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { uploadFileDirectly } from "../../lib/upload-client";

export function WebsiteDocumentsFields({
  documents,
  onChange,
}: {
  documents: WebsiteDocument[];
  onChange: (documents: WebsiteDocument[]) => void;
}) {
  const { t } = useAdminLocale();
  const copy = t.setupWizard.website.documents;
  const [busy, setBusy] = React.useState<number | null>(null);
  const [error, setError] = React.useState("");
  const patch = (index: number, data: Partial<WebsiteDocument>) =>
    onChange(
      documents.map((doc, i) => (i === index ? { ...doc, ...data } : doc)),
    );
  return (
    <section className="rounded-xl border border-outline-variant p-4 sm:p-5 space-y-4">
      <h3 className="font-bold">
        {copy.title}
      </h3>
      <p className="text-sm text-ink-muted">
        {copy.hint}
      </p>
      {documents.map((doc, index) => (
        <fieldset
          key={index}
          className="rounded-lg border border-outline-variant p-4 grid gap-3 sm:grid-cols-2"
          disabled={busy !== null}
        >
          <legend className="px-1 text-sm">{index + 1}</legend>
          <label className="space-y-1 text-sm">
            <span>{copy.titleEn}</span>
            <Input
              value={doc.titleEn}
              maxLength={200}
              onChange={(e) => patch(index, { titleEn: e.target.value })}
            />
          </label>
          <label className="space-y-1 text-sm">
            <span>{copy.titleAr}</span>
            <Input
              value={doc.titleAr}
              dir="rtl"
              maxLength={200}
              onChange={(e) => patch(index, { titleAr: e.target.value })}
            />
          </label>
          <label className="space-y-1 text-sm">
            <span>{copy.urlOrFile}</span>
            <Input
              value={doc.url}
              dir="ltr"
              maxLength={2000}
              onChange={(e) => patch(index, { url: e.target.value })}
            />
          </label>
          <label className="space-y-1 text-sm">
            <span>{copy.itemSlug}</span>
            <Input
              value={doc.itemSlug}
              dir="ltr"
              maxLength={150}
              onChange={(e) => patch(index, { itemSlug: e.target.value })}
            />
          </label>
          <label className="space-y-1 text-sm">
            <span>
              {busy === index
                ? copy.uploading
                : formatMessage(copy.uploadPdfHelp, { maxSize: 10 })}
            </span>
            <input
              type="file"
              accept="application/pdf"
              onChange={async (e) => {
                const input = e.currentTarget;
                const file = input.files?.[0];
                if (!file) return;
                setError("");
                setBusy(index);
                try {
                  const result = await uploadFileDirectly(file, {
                    entityType: "cms_document",
                    entityId: "portfolio",
                  });
                  patch(index, { url: result.fileUrl });
                } catch (err) {
                  setError(
                    err instanceof Error
                      ? err.message
                      : copy.uploadFailed,
                  );
                } finally {
                  input.value = "";
                  setBusy(null);
                }
              }}
            />
          </label>
          <button
            type="button"
            className="text-start text-sm text-m3-error"
            onClick={() => onChange(documents.filter((_, i) => i !== index))}
          >
            {copy.remove}
          </button>
        </fieldset>
      ))}
      {error && (
        <p role="alert" className="text-sm text-m3-error">
          {error}
        </p>
      )}
      <button
        type="button"
        disabled={busy !== null || documents.length >= 100}
        className="rounded-lg border border-outline-variant px-4 py-2 text-sm"
        onClick={() =>
          onChange([
            ...documents,
            { titleEn: "", titleAr: "", url: "", itemSlug: "" },
          ])
        }
      >
        {copy.add}
      </button>
    </section>
  );
}

"use client";
import * as React from "react";
import { primaryButton } from "../account/ui";
import { useTranslation } from "../../hooks/useTranslation";

/** Attachments follow a successful submission, so a failed upload never duplicates the inquiry. */
export function InquiryAttachments({
  token,
  locale,
}: {
  token: string;
  locale: string;
}) {
  const { t } = useTranslation();
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const [error, setError] = React.useState("");
  return (
    <form
      className="space-y-3 rounded-brand bg-m3-surface-container p-4 max-w-lg mx-auto text-start"
      onSubmit={async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const file = (form.elements.namedItem("file") as HTMLInputElement)
          .files?.[0];
        if (!file) return;
        setBusy(true);
        setError("");
        setMessage("");
        try {
          const result = await fetch("/api/inquiry/attachments", {
            method: "POST",
            headers: {
              "x-inquiry-upload-token": token,
              "x-file-name": encodeURIComponent(file.name),
              "Content-Type": file.type || "application/octet-stream",
            },
            body: file,
          });
          if (!result.ok)
            throw new Error(t("contact.attachments.uploadFailed"));
          form.reset();
          setMessage(t("contact.attachments.fileAttached"));
        } catch (err) {
          setError(
            err instanceof Error
              ? err.message
              : t("contact.attachments.uploadFailedGeneric"),
          );
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="space-y-2">
        <label htmlFor="inquiry-file" className="block text-sm font-semibold">
          {t("contact.attachments.title")}
        </label>
        <p className="text-xs text-ink-muted">
          {t("contact.attachments.intro")}
        </p>
        <input
          id="inquiry-file"
          type="file"
          name="file"
          accept="application/pdf,image/png,image/jpeg,image/webp"
          required
          disabled={busy}
          className="block w-full min-h-11 text-sm"
        />
      </div>
      <button type="submit" disabled={busy} className={primaryButton}>
        {busy
          ? t("contact.attachments.uploading")
          : t("contact.attachments.attachFile")}
      </button>
      {message && (
        <p role="status" className="text-sm">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-m3-error">
          {error}
        </p>
      )}
    </form>
  );
}

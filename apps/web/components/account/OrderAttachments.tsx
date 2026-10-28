"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { primaryButton } from "./ui";
import { useTranslation } from "../../hooks/useTranslation";

export function OrderAttachments({
  orderId,
  files,
  enabled,
  locale,
}: {
  orderId: string;
  files: { id: string; fileName: string }[];
  enabled: boolean;
  locale: string;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const [message, setMessage] = React.useState("");
  if (!enabled && !files.length) return null;
  return (
    <section className="space-y-4" aria-labelledby="order-attachments">
      <h2 id="order-attachments" className="text-xl font-semibold">
        {t("account.orderAttachments.title")}
      </h2>
      <p className="text-sm text-ink-muted">
        {t("account.orderAttachments.intro")}
      </p>
      <ul className="space-y-2">
        {files.map((file) => (
          <li key={file.id}>
            <a
              className="inline-flex min-h-11 items-center text-m3-primary underline"
              href={`/api/account/orders/${orderId}/attachments/${file.id}`}
            >
              {file.fileName}
            </a>
          </li>
        ))}
      </ul>
      {enabled && files.length < 10 && (
        <form
          className="space-y-3"
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
              const result = await fetch(
                `/api/account/orders/${orderId}/attachments`,
                {
                  method: "POST",
                  headers: {
                    "Content-Type": file.type || "application/octet-stream",
                    "x-file-name": encodeURIComponent(file.name),
                  },
                  body: file,
                },
              );
              if (!result.ok)
                throw new Error(
                  result.status === 413
                    ? t("account.orderAttachments.fileLimit")
                    : t("account.orderAttachments.uploadFailed"),
                );
              form.reset();
              setMessage(t("account.orderAttachments.uploaded"));
              router.refresh();
            } catch (err) {
              setError(
                err instanceof Error
                  ? err.message
                  : t("account.orderAttachments.uploadFailedGeneric"),
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          <label className="block text-sm space-y-2">
            <span>
              {t("account.orderAttachments.inputHelp")}
            </span>
            <input
              name="file"
              type="file"
              accept="application/pdf,image/png,image/jpeg,image/webp"
              required
              disabled={busy}
              className="block w-full min-h-11"
            />
          </label>
          <button disabled={busy} type="submit" className={primaryButton}>
            {busy
              ? t("account.orderAttachments.uploading")
              : t("account.orderAttachments.upload")}
          </button>
        </form>
      )}
      {error && (
        <p role="alert" className="text-sm text-m3-error">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="text-sm text-m3-primary">
          {message}
        </p>
      )}
    </section>
  );
}

export function PrintOrder({ locale }: { locale: string }) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      className={primaryButton}
      onClick={() => window.print()}
    >
      {t("account.orderAttachments.printReceipt")}
    </button>
  );
}

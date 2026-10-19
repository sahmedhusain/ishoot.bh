"use client";

import * as React from "react";
import {
  ExternalLink,
  FileText,
  Link2,
  Loader2,
  UploadCloud,
  X,
} from "lucide-react";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { errorMessage } from "../../lib/error-text";

const DOCUMENT_ACCEPT =
  "application/pdf,image/png,image/jpeg,image/webp";

/** True for an https address the server accepts as a linked document. */
export function isHttpsLink(value: string) {
  try {
    const url = new URL(value.trim());
    return (
      url.protocol === "https:" &&
      url.hostname.includes(".") &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}

/**
 * A document given either as an uploaded file or as a link to where it is kept (an official portal, a shared
 * drive). `upload` stores the file and returns its address; the chosen address is reported through `onChange`.
 */
export function LinkOrUploadField({
  value,
  onChange,
  upload,
  accept = DOCUMENT_ACCEPT,
  required,
  disabled,
  label,
  hint,
  id,
}: {
  value: string;
  onChange: (
    url: string,
    meta?: { fileName?: string; isLink: boolean },
  ) => void;
  /** Without it only a link can be given (e.g. before the record the file belongs to exists). */
  upload?: (file: File) => Promise<{ fileUrl: string; fileName?: string }>;
  accept?: string;
  required?: boolean;
  disabled?: boolean;
  label?: string;
  hint?: string;
  id?: string;
}) {
  const { t } = useAdminLocale();
  const f = t.linkOrUpload;
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [mode, setMode] = React.useState<"upload" | "link">(() =>
    !upload || (value && isHttpsLink(value)) ? "link" : "upload",
  );
  const [link, setLink] = React.useState(() =>
    value && isHttpsLink(value) ? value : "",
  );
  const [fileName, setFileName] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const generatedId = React.useId();
  const fieldId = id ?? generatedId;

  const choose = async (file: File) => {
    if (!upload) return;
    setBusy(true);
    setError("");
    try {
      const stored = await upload(file);
      setFileName(stored.fileName ?? file.name);
      onChange(stored.fileUrl, {
        fileName: stored.fileName ?? file.name,
        isLink: false,
      });
    } catch (err) {
      setError(errorMessage(err, t, f.uploadFailed));
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const applyLink = (text: string) => {
    setLink(text);
    const trimmed = text.trim();
    if (!trimmed) {
      setError("");
      onChange("", { isLink: true });
      return;
    }
    if (!isHttpsLink(trimmed)) {
      setError(f.invalidLink);
      return;
    }
    setError("");
    onChange(trimmed, { isLink: true });
  };

  const tab = (active: boolean) =>
    `inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${active ? "bg-white text-ink shadow-sm dark:bg-white/10" : "text-ink-muted hover:text-ink"}`;
  const hasUpload = value && !isHttpsLink(value);

  return (
    <div className="space-y-2">
      {label && (
        <label
          htmlFor={fieldId}
          className="block text-xs font-semibold text-ink"
        >
          {label}
          {required ? <span className="text-rose-500"> *</span> : null}
        </label>
      )}
      {upload ? (
        <div
          role="tablist"
          aria-label={label ?? f.source}
          className="inline-flex rounded-xl bg-ink/5 p-1"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mode === "upload"}
            className={tab(mode === "upload")}
            disabled={disabled}
            onClick={() => {
              setMode("upload");
              setError("");
            }}
          >
            <UploadCloud className="h-3.5 w-3.5" aria-hidden /> {f.uploadTab}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "link"}
            className={tab(mode === "link")}
            disabled={disabled}
            onClick={() => {
              setMode("link");
              setError("");
            }}
          >
            <Link2 className="h-3.5 w-3.5" aria-hidden /> {f.linkTab}
          </button>
        </div>
      ) : null}

      {mode === "upload" ? (
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileRef}
            id={fieldId}
            type="file"
            accept={accept}
            className="hidden"
            onChange={(e) => e.target.files?.[0] && choose(e.target.files[0])}
          />
          <button
            type="button"
            disabled={busy || disabled}
            onClick={() => fileRef.current?.click()}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-dashed border-ink/25 px-4 text-xs font-semibold text-ink hover:border-accent hover:bg-accent/5 disabled:opacity-60"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <UploadCloud className="h-4 w-4" aria-hidden />
            )}
            {busy ? f.uploading : hasUpload ? f.replace : f.chooseFile}
          </button>
          {hasUpload ? (
            <span className="inline-flex min-w-0 items-center gap-1.5 rounded-lg bg-emerald-500/10 px-2.5 py-1.5 text-xs text-emerald-800 dark:text-emerald-200">
              <FileText className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span className="truncate max-w-[220px]">
                {fileName || f.uploaded}
              </span>
              <button
                type="button"
                aria-label={f.remove}
                onClick={() => {
                  setFileName("");
                  onChange("", { isLink: false });
                }}
                className="text-emerald-700 hover:text-rose-600"
              >
                <X className="h-3.5 w-3.5" aria-hidden />
              </button>
            </span>
          ) : null}
        </div>
      ) : (
        <div className="flex items-stretch gap-2">
          <input
            id={fieldId}
            type="url"
            inputMode="url"
            dir="ltr"
            disabled={disabled}
            placeholder={t.copy.urlExample}
            value={link}
            onChange={(e) => applyLink(e.target.value)}
            className="h-10 min-w-0 flex-1 rounded-xl border border-ink/15 bg-white px-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/40 dark:bg-surface"
          />
          {link && isHttpsLink(link) ? (
            <a
              href={link.trim()}
              target="_blank"
              rel="noreferrer noopener"
              aria-label={f.open}
              className="inline-flex items-center rounded-xl border border-ink/15 px-3 text-ink-muted hover:text-ink"
            >
              <ExternalLink className="h-4 w-4" aria-hidden />
            </a>
          ) : null}
        </div>
      )}
      {error ? (
        <p className="text-xs font-medium text-rose-600 dark:text-rose-400">
          {error}
        </p>
      ) : hint ? (
        <p className="text-[11px] text-ink-muted">
          {mode === "link" ? f.linkHint : hint}
        </p>
      ) : mode === "link" ? (
        <p className="text-[11px] text-ink-muted">{f.linkHint}</p>
      ) : null}
    </div>
  );
}

/** A small "or add a link" control placed next to an existing upload button. */
export function AddLinkInline({
  onLink,
  disabled,
}: {
  onLink: (url: string) => void | Promise<void>;
  disabled?: boolean;
}) {
  const { t } = useAdminLocale();
  const f = t.linkOrUpload;
  const [open, setOpen] = React.useState(false);
  const [value, setValue] = React.useState("");
  const [error, setError] = React.useState("");
  if (!open)
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent hover:underline disabled:opacity-50"
      >
        <Link2 className="h-3 w-3" aria-hidden /> {f.addLink}
      </button>
    );
  const submit = async () => {
    const url = value.trim();
    if (!isHttpsLink(url)) return setError(f.invalidLink);
    setError("");
    await onLink(url);
    setValue("");
    setOpen(false);
  };
  return (
    <div className="w-full space-y-1">
      <div className="flex items-stretch gap-1.5">
        <input
          type="url"
          inputMode="url"
          dir="ltr"
          autoFocus
          placeholder={t.copy.urlExample}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void submit();
            }
          }}
          className="h-8 min-w-0 flex-1 rounded-lg border border-ink/15 bg-white px-2 text-xs text-ink dark:bg-surface"
        />
        <button
          type="button"
          disabled={disabled}
          onClick={() => void submit()}
          className="rounded-lg bg-accent px-3 text-[11px] font-semibold text-white disabled:opacity-50"
        >
          {f.useLink}
        </button>
        <button
          type="button"
          aria-label={f.remove}
          onClick={() => {
            setOpen(false);
            setError("");
          }}
          className="rounded-lg px-1.5 text-ink-muted hover:text-ink"
        >
          <X className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>
      {error ? <p className="text-[11px] text-rose-600">{error}</p> : null}
    </div>
  );
}

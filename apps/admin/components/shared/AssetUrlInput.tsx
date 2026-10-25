"use client";

import * as React from "react";
import { Input } from "@platform/ui";
import { Loader2, UploadCloud, X } from "lucide-react";
import { ContentImage } from "./ContentImage";
import { websiteMedia } from "../../lib/website-media";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { uploadFileDirectly } from "../../lib/upload-client";

type CmsAssetResource = "banners" | "portfolio" | "clients" | "equipment" | "reviews" | "settings" | "pages" | "articles" | "products";

interface AssetUrlInputProps {
  value: string;
  onChange: (url: string) => void;
  /** CMS resource the upload is filed under; the uploader needs write access to it. */
  resource: CmsAssetResource;
  placeholder?: string;
  required?: boolean;
  id?: string;
}

/** An image field that accepts either an uploaded file or a pasted URL, with a live preview. */
export function AssetUrlInput({ value, onChange, resource, placeholder, required, id }: AssetUrlInputProps) {
  const { t } = useAdminLocale();
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState("");
  const previewable = value.startsWith("/") || /^https?:\/\//i.test(value);

  const upload = async (file: File) => {
    setUploading(true);
    setError("");
    try {
      const data = await uploadFileDirectly(file, { entityType: "cms_asset", entityId: resource });
      onChange(data.fileUrl);
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : t.assetField.uploadFailed);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-stretch gap-2">
        <div className="w-11 shrink-0 rounded-xl bg-ink/5 border border-ink/10 flex items-center justify-center overflow-hidden">
          {previewable ? (
            <ContentImage src={websiteMedia(value)} alt="" className="w-full h-full object-contain p-1" />
          ) : (
            <UploadCloud className="w-4 h-4 text-ink-muted" />
          )}
        </div>
        <Input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || t.assetField.urlPlaceholder}
          required={required}
          className="flex-1 min-w-0"
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="shrink-0 px-2 rounded-xl text-ink-muted hover:text-rose-500 hover:bg-rose-500/10"
            title={t.assetField.clear}
            aria-label={t.assetField.clear}
          >
            <X className="w-4 h-4" />
          </button>
        )}
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="shrink-0 inline-flex items-center gap-1.5 px-3 rounded-xl border border-ink/15 text-xs font-semibold text-ink hover:bg-ink/5 disabled:opacity-60"
        >
          {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UploadCloud className="w-3.5 h-3.5" />}
          <span>{uploading ? t.assetField.uploading : t.assetField.upload}</span>
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void upload(file);
          }}
        />
      </div>
      <p className={`text-[11px] ${error ? "text-rose-500" : "text-ink-muted"}`}>{error || t.assetField.hint}</p>
    </div>
  );
}

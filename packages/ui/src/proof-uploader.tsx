"use client";

import * as React from "react";
import {
  Upload,
  X,
  FileText,
  Image as ImageIcon,
} from "lucide-react";

export interface ProofFile {
  id: string;
  name: string;
  url: string;
  file?: File;
  size?: number;
  type?: string;
}

interface ProofUploaderProps {
  label?: string;
  hint?: string;
  clickText?: string;
  dropText?: string;
  value?: ProofFile[];
  onChange?: (files: ProofFile[]) => void;
  maxFiles?: number;
}

export function ProofUploader({
  label,
  hint,
  clickText = "Click to upload",
  dropText = "or drag and drop files",
  value = [],
  onChange,
  maxFiles = 5,
}: ProofUploaderProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newFiles: ProofFile[] = Array.from(files).map((file, idx) => ({
      id: `file-${Date.now()}-${idx}`,
      file,
      name: file.name,
      url: URL.createObjectURL(file),
      size: file.size,
      type: file.type,
    }));

    const updated = [...value, ...newFiles].slice(0, maxFiles);
    onChange?.(updated);
  };

  const handleRemove = (id: string) => {
    const removed = value.find(f=>f.id===id); if(removed?.url.startsWith("blob:")) URL.revokeObjectURL(removed.url);
    const updated = value.filter((f) => f.id !== id);
    onChange?.(updated);
  };

  return (
    <div className="space-y-3">
      {label && (
        <label className="block text-xs font-semibold text-ink tracking-wide">
          {label}
        </label>
      )}

      <div
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed border-ink/15 hover:border-accent/60 bg-surface-sunken/60 hover:bg-surface-sunken rounded-2xl p-5 text-center cursor-pointer transition-all duration-200 group"
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,application/pdf"
          className="hidden"
          onChange={handleFileChange}
        />

        <div className="flex flex-col items-center justify-center space-y-2">
          <div className="w-10 h-10 rounded-full bg-ink/5 border border-ink/10 group-hover:border-accent group-hover:bg-accent/10 flex items-center justify-center text-ink-muted group-hover:text-accent transition-colors">
            <Upload className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-ink">
              <span className="text-accent underline font-bold">
                {clickText}
              </span>{" "}
              {dropText}
            </p>
            {hint && <p className="text-[11px] text-ink-muted mt-1">{hint}</p>}
          </div>
        </div>
      </div>

      {value.length > 0 && (
        <div className="space-y-2">
          {value.map((file) => {
            const isImage =
              file.type?.startsWith("image/") ||
              /\.(jpg|jpeg|png|webp|svg)$/i.test(file.name);

            return (
              <div
                key={file.id}
                className="flex items-center justify-between p-3 rounded-xl bg-surface-sunken border border-ink/10 text-xs text-ink"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-8 h-8 rounded-lg bg-ink/5 flex items-center justify-center text-accent shrink-0">
                    {isImage ? (
                      <ImageIcon className="w-4 h-4" />
                    ) : (
                      <FileText className="w-4 h-4" />
                    )}
                  </div>
                  <div className="truncate">
                    <p className="font-semibold truncate">{file.name}</p>
                    {file.size && (
                      <p className="text-[10px] text-ink-muted font-mono">
                        {(file.size / 1024).toFixed(1)} KB
                      </p>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove(file.id);
                  }}
                  className="p-1 rounded-lg text-ink-muted hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

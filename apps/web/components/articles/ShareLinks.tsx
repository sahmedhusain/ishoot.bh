"use client";

import * as React from "react";
import { Link2, Linkedin, Twitter } from "lucide-react";
import { useSnackbar } from "../ui/snackbar";

export function ShareLinks({
  url,
  title,
  labels,
}: {
  url: string;
  title: string;
  labels: { share: string; x: string; linkedin: string; copy: string; copied: string };
}) {
  const snackbar = useSnackbar();
  const [manualCopy, setManualCopy] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const encoded = encodeURIComponent(url);
  const links = [
    {
      href: `https://twitter.com/intent/tweet?url=${encoded}&text=${encodeURIComponent(title)}`,
      label: labels.x,
      Icon: Twitter,
    },
    {
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encoded}`,
      label: labels.linkedin,
      Icon: Linkedin,
    },
  ];
  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-m3-outline-variant pt-6">
      <span className="text-sm font-medium text-m3-on-surface-variant me-2">{labels.share}</span>
      {links.map(({ href, label, Icon }) => (
        <a
          key={label}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={label}
          title={label}
          className="h-11 w-11 grid place-items-center rounded-full border border-m3-outline-variant bg-m3-surface-container-low text-m3-on-surface-variant hover:text-m3-on-surface hover:border-m3-primary hover:bg-m3-surface-container-high transition-colors"
        >
          <Icon aria-hidden="true" className="w-4 h-4" />
        </a>
      ))}
      <button
        type="button"
        aria-label={copied ? labels.copied : labels.copy}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setManualCopy(false);
            snackbar.show({ message: labels.copied, variant: "success" });
            setTimeout(() => setCopied(false), 2000);
          } catch {
            setCopied(false);
            setManualCopy(true);
          }
        }}
        className="inline-flex items-center gap-2 min-h-11 px-4 rounded-full border border-m3-outline-variant bg-m3-surface-container-low text-xs font-semibold text-m3-on-surface-variant hover:text-m3-on-surface hover:border-m3-primary hover:bg-m3-surface-container-high transition-colors cursor-pointer"
      >
        <Link2 aria-hidden="true" className="w-4 h-4 text-m3-primary" />
        <span role="status">{copied ? labels.copied : labels.copy}</span>
      </button>
      {manualCopy && (
        <input
          autoFocus
          aria-label={labels.copy}
          value={url}
          readOnly
          onFocus={(event) => event.currentTarget.select()}
          className="w-full rounded-[var(--md-sys-shape-corner-small,8px)] border border-m3-outline bg-m3-surface-container-lowest p-3 text-sm text-m3-on-surface"
          dir="ltr"
        />
      )}
    </div>
  );
}

"use client";

import * as React from "react";
import { Link2, Linkedin, Twitter } from "lucide-react";

export function ShareLinks({ url, title, labels }: { url: string; title: string; labels: { share: string; x: string; linkedin: string; copy: string; copied: string } }) {
  const [manualCopy, setManualCopy] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const encoded = encodeURIComponent(url);
  const links = [
    { href: `https://twitter.com/intent/tweet?url=${encoded}&text=${encodeURIComponent(title)}`, label: labels.x, Icon: Twitter },
    { href: `https://www.linkedin.com/sharing/share-offsite/?url=${encoded}`, label: labels.linkedin, Icon: Linkedin },
  ];
  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-white/10 pt-6">
      <span className="text-sm text-ink-muted me-2">{labels.share}</span>
      {links.map(({ href, label, Icon }) => (
        <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label} title={label} className="h-11 w-11 grid place-items-center rounded-full border border-white/15 text-ink-muted hover:text-white hover:border-accent transition-colors">
          <Icon className="w-4 h-4" />
        </a>
      ))}
      <button
        type="button"
        aria-label={copied ? labels.copied : labels.copy}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            setCopied(true); setManualCopy(false);
            setTimeout(() => setCopied(false), 2000);
          } catch { setCopied(false); setManualCopy(true); }
        }}
        className="inline-flex items-center gap-1.5 min-h-11 px-3 rounded-full border border-white/15 text-xs text-ink-muted hover:text-white hover:border-accent transition-colors"
      >
        <Link2 className="w-4 h-4" />
        <span role="status">{copied ? labels.copied : labels.copy}</span>
      </button>
      {manualCopy && <input autoFocus aria-label={labels.copy} value={url} readOnly onFocus={event => event.currentTarget.select()} className="w-full rounded-brand border border-m3-outline bg-m3-surface-container p-3 text-sm text-ink" dir="ltr" />}
    </div>
  );
}

"use client";

import * as React from "react";
import { Link2, Linkedin, MessageCircle, Twitter } from "lucide-react";

/** Share an article on X, LinkedIn or WhatsApp, or copy its address. */
export function ShareLinks({ url, title, labels }: { url: string; title: string; labels: { share: string; x: string; linkedin: string; whatsapp: string; copy: string; copied: string } }) {
  const [copied, setCopied] = React.useState(false);
  const encoded = encodeURIComponent(url);
  const links = [
    { href: `https://twitter.com/intent/tweet?url=${encoded}&text=${encodeURIComponent(title)}`, label: labels.x, Icon: Twitter },
    { href: `https://www.linkedin.com/sharing/share-offsite/?url=${encoded}`, label: labels.linkedin, Icon: Linkedin },
    { href: `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`, label: labels.whatsapp, Icon: MessageCircle },
  ];
  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-white/10 pt-6">
      <span className="text-sm text-ink-muted me-2">{labels.share}</span>
      {links.map(({ href, label, Icon }) => (
        <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label} title={label} className="h-9 w-9 grid place-items-center rounded-full border border-white/15 text-ink-muted hover:text-white hover:border-accent transition-colors">
          <Icon className="w-4 h-4" />
        </a>
      ))}
      <button
        type="button"
        onClick={async () => {
          await navigator.clipboard?.writeText(url).catch(() => undefined);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
        className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full border border-white/15 text-xs text-ink-muted hover:text-white hover:border-accent transition-colors"
      >
        <Link2 className="w-4 h-4" />
        <span role="status">{copied ? labels.copied : labels.copy}</span>
      </button>
    </div>
  );
}

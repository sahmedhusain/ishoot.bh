"use client";

import * as React from "react";
import Link from "next/link";
import { Heart } from "lucide-react";
import { useTranslation } from "../../hooks/useTranslation";
import { accountPost } from "./ui";

export function WishlistButton({ itemId, initiallySaved, signedIn, next }: { itemId: string; initiallySaved: boolean; signedIn: boolean; next: string }) {
  const { t, locale } = useTranslation();
  const [saved, setSaved] = React.useState(initiallySaved);
  const [busy, setBusy] = React.useState(false);
  const className = "inline-flex min-h-10 items-center gap-2 rounded-full border border-m3-outline-variant bg-m3-surface px-4 py-2 text-xs font-semibold text-m3-on-surface hover:border-m3-primary hover:text-m3-primary transition-colors";
  const text = saved ? t("account.removeFromWishlist") : t("account.saveToWishlist");
  if (!signedIn)
    return (
      <Link href={`/${locale}/account?next=${encodeURIComponent(next)}`} className={className}>
        <Heart className="w-4 h-4" aria-hidden="true" />
        {text}
      </Link>
    );
  return (
    <button
      type="button"
      aria-pressed={saved}
      disabled={busy}
      className={className}
      data-testid="wishlist-toggle"
      onClick={async () => {
        setBusy(true);
        try {
          setSaved((await accountPost<{ saved: boolean }>("wishlist", { itemId })).saved);
        } finally {
          setBusy(false);
        }
      }}
    >
      <Heart className={`w-4 h-4 ${saved ? "fill-current text-m3-error" : ""}`} aria-hidden="true" />
      {text}
    </button>
  );
}

"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { AssetCategoryRecord } from "@platform/database";
import { ROUTES } from "../../constants/routes";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { AssetForm } from "./AssetForm";

export function NewAssetView({ categories }: { categories: AssetCategoryRecord[] }) {
  const { t } = useAdminLocale();
  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      <div className="flex items-center gap-3">
        <Link href={ROUTES.assets.list()} aria-label={t.actions.back} className="rounded-full border border-ink/15 p-2 text-ink-muted hover:text-ink"><ArrowLeft className="h-4 w-4 rtl:-scale-x-100" /></Link>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-ink">{t.assets.newTitle}</h1>
          <p className="text-xs text-ink-muted mt-1">{t.assets.newSubtitle}</p>
        </div>
      </div>
      <div className="rounded-3xl border border-ink/10 bg-white dark:bg-surface-raised p-5"><AssetForm categories={categories} /></div>
    </div>
  );
}

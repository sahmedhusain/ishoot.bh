"use client";

import type { AssetCategoryRecord } from "@platform/database";
import { ROUTES } from "../../constants/routes";
import { AssetForm } from "./AssetForm";
import { PageHeader } from "../layout/PageHeader";

export function NewAssetView({ categories }: { categories: AssetCategoryRecord[] }) {
  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      <PageHeader back={{ href: ROUTES.assets.list() }} />
      <div className="rounded-3xl border border-outline-variant bg-surface-raised p-5"><AssetForm categories={categories} /></div>
    </div>
  );
}

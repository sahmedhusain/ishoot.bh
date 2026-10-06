"use client";

import Link from "next/link";
import { SearchX } from "lucide-react";
import { ROUTES } from "@ishoot/database/constants/routes";
import { useAdminLocale } from "../../hooks/useAdminLocale";

export function NotFoundView() {
  const { t } = useAdminLocale();
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10 text-accent">
        <SearchX className="h-7 w-7" aria-hidden />
      </span>
      <h1 className="text-xl font-bold text-slate-900 dark:text-white">{t.notFound.title}</h1>
      <p className="text-sm text-slate-600 dark:text-slate-300">{t.notFound.body}</p>
      <Link href={ROUTES.home} className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary-light dark:bg-[#5ad8c2] dark:text-[#00201c]">
        {t.notFound.back}
      </Link>
    </main>
  );
}

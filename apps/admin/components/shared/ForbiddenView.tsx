"use client";

import Link from "next/link";
import { ShieldOff } from "lucide-react";
import { ROUTES } from "@platform/database/constants/routes";
import { useAdminLocale } from "../../hooks/useAdminLocale";

export function ForbiddenView() {
  const { t } = useAdminLocale();
  return (
    <section role="alert" className="mx-auto flex max-w-lg flex-col items-center gap-4 px-6 py-16 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-700 dark:text-rose-300">
        <ShieldOff className="h-7 w-7" />
      </span>
      <h1 className="text-xl font-bold text-ink">{t.forbidden.title}</h1>
      <p className="text-sm text-ink-muted dark:text-ink">{t.forbidden.body}</p>
      <Link href={ROUTES.home} className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-light dark:bg-tone-60 dark:text-tone-5">
        {t.forbidden.back}
      </Link>
    </section>
  );
}

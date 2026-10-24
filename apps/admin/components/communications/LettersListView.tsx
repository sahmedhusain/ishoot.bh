"use client";
import Link from "next/link";
import type { listOfficialLetters } from "@platform/database";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { ROUTES } from "../../constants/routes";
export function LettersListView({
  items,
  canCreate,
  canTemplates,
}: {
  items: Awaited<ReturnType<typeof listOfficialLetters>>;
  canCreate: boolean;
  canTemplates: boolean;
}) {
  const { t, locale } = useAdminLocale();
  const c = t.communications;
  const labels: Record<string, string> = c;
  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <h1 className="text-2xl font-bold">{c.letters}</h1>
      <nav className="flex gap-4">
        {canCreate && <Link href={ROUTES.letters.create()}>{c.new}</Link>}
        {canTemplates && (
          <Link href={ROUTES.letters.templates}>{c.templates}</Link>
        )}
      </nav>
      {!items.length && <p>{c.empty}</p>}
      {items.map((l) => (
        <Link
          key={l.id}
          href={ROUTES.letters.detail(l.id)}
          className="block rounded-2xl border p-5"
        >
          <h2 className="font-bold">
            {l.reference} · {locale === "ar" ? l.subjectAr : l.subjectEn}
          </h2>
          <p className="text-sm text-ink-muted">
            {l.recipient} · {labels[l.status]} · {l.letterDate}
          </p>
        </Link>
      ))}
    </div>
  );
}

"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { AnnouncementItem } from "@platform/database";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { ROUTES } from "../../constants/routes";
import { communicationSettingsAction } from "../../app/actions/communications";
export function AnnouncementsListView({
  items,
  view,
  canCreate,
  canSettings,
  managersAnnounce,
}: {
  items: AnnouncementItem[];
  view: string;
  canCreate: boolean;
  canSettings: boolean;
  managersAnnounce: boolean;
}) {
  const { t, locale } = useAdminLocale();
  const c = t.communications;
  const labels: Record<string, string> = c;
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <header className="flex justify-between" data-page-header>
        <h1 className="text-2xl font-bold">{c.announcements}</h1>
        {canCreate && (
          <Link
            href={ROUTES.announcements.create}
            className="rounded-full bg-accent px-4 py-2 text-accent-foreground"
          >
            {c.new}
          </Link>
        )}
      </header>
      <nav className="flex gap-3 flex-wrap">
        {["inbox", "unread", "hidden", "manage"].map((v) => (
          <Link
            key={v}
            href={ROUTES.announcements.list({ view: v })}
            className={`rounded-full border px-4 py-2 ${v === view ? "bg-accent/10 border-accent" : ""}`}
          >
            {labels[v]}
          </Link>
        ))}
      </nav>
      {canSettings && (
        <label className="block rounded-xl border p-3">
          <input
            type="checkbox"
            checked={managersAnnounce}
            disabled={busy}
            onChange={async (e) => {
              setBusy(true);
              try {
                await communicationSettingsAction(e.target.checked);
                router.refresh();
              } catch {
                toast.error(c.failed);
              } finally {
                setBusy(false);
              }
            }}
          />{" "}
          {c.managerSetting}
        </label>
      )}
      {!items.length && <p>{c.empty}</p>}
      {items.map((a) => (
        <Link
          href={ROUTES.announcements.detail(a.id)}
          key={a.id}
          className="block rounded-2xl border border-outline-variant p-5"
        >
          <div className="flex justify-between">
            <h2 className={`text-lg ${a.readAt ? "" : "font-bold"}`}>
              {locale === "ar" ? a.titleAr : a.titleEn}
            </h2>
            <span className="text-xs text-ink-muted">{labels[a.status]}</span>
          </div>
          <p className="mt-2 line-clamp-2 text-sm text-ink-muted">
            {locale === "ar" ? a.bodyAr : a.bodyEn}
          </p>
          <p className="mt-2 text-xs">
            <bdi dir="ltr">{a.reference}</bdi> · {labels[a.priority]}{" "}
            {a.official ? `· ${c.official}` : ""}
          </p>
        </Link>
      ))}
    </div>
  );
}

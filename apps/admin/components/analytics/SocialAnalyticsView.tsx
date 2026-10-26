"use client";

import { formatMessage } from "@platform/locales";
import { errorMessage } from "../../lib/error-text";
import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  CalendarClock,
  ExternalLink,
  Eye,
  Heart,
  MessageCircle,
  Pencil,
  Plus,
  RefreshCw,
  Repeat2,
  Trash2,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import { Button, Card, ConfirmDialog, DateDisplay, Modal } from "@platform/ui";
import {
  SOCIAL_PLAN_STATUSES,
  sumSocialCounts,
  SOCIAL_PLATFORM_IDS,
  type SocialPlanStatus,
  type SocialPlatformId,
} from "@platform/database/constants/integrations";
import type { SocialAnalytics, SocialPlanView, SocialPostView } from "@platform/database/queries/social-analytics";
import { ROUTES } from "@platform/database/constants/routes";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { usePermissions } from "../../hooks/usePermissions";
import { refreshSocialAnalyticsAction, saveSocialPlanAction, deleteSocialPlanAction } from "../../app/actions/social";
import { SocialBrandIcon } from "../shared/PlatformPicker";

type Tab = "overview" | "posts" | "planner";

const fieldClass =
  "w-full min-w-0 rounded-lg border border-ink/15 bg-white dark:bg-surface px-3 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent/40";

const planTone: Record<SocialPlanStatus, string> = {
  idea: "bg-slate-500/10 text-slate-700 dark:text-slate-300",
  draft: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  scheduled: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  published: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  cancelled: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
};

function useNumber() {
  const { locale } = useAdminLocale();
  return React.useMemo(() => {
    const full = new Intl.NumberFormat(locale === "ar" ? "ar-BH-u-nu-latn" : "en-BH");
    const compact = new Intl.NumberFormat(locale === "ar" ? "ar-BH-u-nu-latn" : "en-BH", { notation: "compact", maximumFractionDigits: 1 });
    return { full: (n: number | null) => n == null ? "—" : full.format(n), compact: (n: number | null) => n == null ? "—" : (Math.abs(n) >= 10_000 ? compact.format(n) : full.format(n)) };
  }, [locale]);
}

function Delta({ current, previous }: { current: number | null; previous: number | null }) {
  const { t } = useAdminLocale();
  if (current == null || !previous) return null;
  const change = Math.round(((current - previous) / previous) * 100);
  const up = change >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[11px] font-medium ${up ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400"}`}>
      {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      <bdi dir="ltr">{up ? "+" : ""}{change}%</bdi>
      <span className="text-slate-500 font-normal">{t.socialAnalytics.kpi.vsPrevious}</span>
    </span>
  );
}

function Kpi({ icon, label, value, footer }: { icon: React.ReactNode; label: string; value: string; footer?: React.ReactNode }) {
  return (
    <Card className="space-y-2 p-4 dark:bg-surface-raised">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{label}</span>
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary dark:bg-white/10 dark:text-accent">{icon}</span>
      </div>
      <p className="text-2xl font-bold text-slate-900 dark:text-white"><bdi dir="ltr">{value}</bdi></p>
      {footer && <div className="min-h-4">{footer}</div>}
    </Card>
  );
}

/** Interactions per day as bars; long periods are grouped into weeks so bars stay readable. */
function InteractionsChart({ daily }: { daily: SocialAnalytics["daily"] }) {
  const { t, locale } = useAdminLocale();
  const number = useNumber();
  const bucket = daily.length > 90 ? 7 : 1;
  const points = React.useMemo(() => {
    const out: Array<{ date: string; interactions: number | null; posts: number }> = [];
    for (let i = 0; i < daily.length; i += bucket) {
      const slice = daily.slice(i, i + bucket);
      out.push({ date: slice[0].date, interactions: sumSocialCounts(slice.map(d => d.interactions)), posts: slice.reduce((s, d) => s + d.posts, 0) });
    }
    return out;
  }, [daily, bucket]);
  const max = Math.max(1, ...points.map((p) => p.interactions ?? 0));
  const fmt = new Intl.DateTimeFormat(locale === "ar" ? "ar-BH-u-nu-latn" : "en-BH", { day: "numeric", month: "short" });
  const labelEvery = Math.max(1, Math.ceil(points.length / 6));
  return (
    <div className="space-y-2">
      <div className="flex h-44 items-end gap-[2px]" dir="ltr" role="img" aria-label={t.socialAnalytics.chartTitle}>
        {points.map((point) => (
          <div key={point.date} className="group relative flex h-full flex-1 items-end">
            <div
              className={`w-full rounded-t-sm ${point.interactions ? "bg-accent/80 group-hover:bg-accent" : "bg-ink/10"}`}
              style={{ height: `${Math.max(2, ((point.interactions ?? 0) / max) * 100)}%` }}
            />
            <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[11px] text-white shadow group-hover:block dark:bg-white dark:text-slate-900">
              {fmt.format(new Date(point.date))} · {number.full(point.interactions)} · {point.posts} {t.socialAnalytics.chartPosts}
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-slate-500" dir="ltr">
        {points.filter((_, i) => i % labelEvery === 0).map((point) => (
          <span key={point.date}>{fmt.format(new Date(point.date))}</span>
        ))}
      </div>
    </div>
  );
}

function PostRow({ post }: { post: SocialPostView }) {
  const { t, locale } = useAdminLocale();
  const s = t.socialAnalytics;
  const number = useNumber();
  return (
    <li className="flex gap-3 py-3">
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-slate-100 dark:bg-white/5">
        {post.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.thumbnailUrl} alt="" className="h-full w-full object-cover" loading="lazy" referrerPolicy="no-referrer" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-slate-400">
            <SocialBrandIcon name={post.platform} className="w-5 h-5" />
          </span>
        )}
        <span className="absolute bottom-0.5 end-0.5 rounded bg-white/90 p-0.5 text-slate-800 dark:bg-black/70 dark:text-white">
          <SocialBrandIcon name={post.platform} className="w-3 h-3" />
        </span>
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <p className="line-clamp-2 text-sm text-slate-800 dark:text-slate-100" dir="auto">{post.caption || s.noCaption}</p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-600 dark:text-slate-400">
          <DateDisplay date={post.publishedAt} locale={locale} />
          <span className="inline-flex items-center gap-1" title={s.likes}><Heart className="w-3 h-3" />{number.compact(post.likes)}</span>
          <span className="inline-flex items-center gap-1" title={s.comments}><MessageCircle className="w-3 h-3" />{number.compact(post.comments)}</span>
          <span className="inline-flex items-center gap-1" title={s.shares}><Repeat2 className="w-3 h-3" />{number.compact(post.shares)}</span>
          {post.views != null && <span className="inline-flex items-center gap-1" title={t.socialAnalytics.kpi.views}><Eye className="w-3 h-3" />{number.compact(post.views)}</span>}
          {post.engagementRate != null && <span className="font-medium text-primary dark:text-accent">{s.rate} <bdi dir="ltr">{post.engagementRate}%</bdi></span>}
        </div>
      </div>
      {post.permalink && (
        <a href={post.permalink} target="_blank" rel="noreferrer" className="self-start rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-primary dark:hover:bg-white/5" aria-label={s.open}>
          <ExternalLink className="w-4 h-4" />
        </a>
      )}
    </li>
  );
}

function PlanForm({
  plan,
  team,
  onClose,
}: {
  plan: SocialPlanView | null;
  team: Array<{ id: string; fullName: string }>;
  onClose: () => void;
}) {
  const { t } = useAdminLocale();
  const p = t.socialAnalytics.plan;
  const router = useRouter();
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState(() => ({
    title: plan?.title ?? "",
    caption: plan?.caption ?? "",
    platforms: plan?.platforms ?? (["instagram"] as SocialPlatformId[]),
    mediaUrl: plan?.mediaUrl ?? "",
    scheduledFor: plan?.scheduledFor ? plan.scheduledFor.slice(0, 16) : "",
    status: plan?.status ?? ("idea" as SocialPlanStatus),
    publishedUrl: plan?.publishedUrl ?? "",
    assigneeId: plan?.assignee?.id ?? "",
  }));
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await saveSocialPlanAction(plan?.id ?? null, {
        ...form,
        scheduledFor: form.scheduledFor ? new Date(form.scheduledFor).toISOString() : null,
        assigneeId: form.assigneeId || null,
      });
      toast.success(p.saved);
      onClose();
      router.refresh();
    } catch (error) {
      toast.error(errorMessage(error, t, p.save));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <label className="block space-y-1 text-xs font-medium text-slate-700 dark:text-slate-200">
        {p.title}
        <input required maxLength={200} className={fieldClass} value={form.title} onChange={(e) => set("title", e.target.value)} />
      </label>
      <label className="block space-y-1 text-xs font-medium text-slate-700 dark:text-slate-200">
        {p.caption}
        <textarea rows={4} maxLength={5000} className={fieldClass} value={form.caption} onChange={(e) => set("caption", e.target.value)} />
      </label>
      <fieldset>
        <legend className="mb-1.5 text-xs font-medium text-slate-700 dark:text-slate-200">{p.platforms}</legend>
        <div className="flex flex-wrap gap-1.5">
          {SOCIAL_PLATFORM_IDS.map((id) => {
            const on = form.platforms.includes(id);
            return (
              <label key={id} className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs focus-within:ring-2 focus-within:ring-accent/40 ${on ? "border-accent bg-accent/10 text-slate-900 dark:text-white" : "border-ink/15 text-slate-600 dark:text-slate-300"}`}>
                <input type="checkbox" className="sr-only" checked={on} onChange={() => set("platforms", on ? form.platforms.filter((x) => x !== id) : [...form.platforms, id])} />
                <SocialBrandIcon name={id} className="w-3.5 h-3.5" />
                {t.socialAnalytics.platforms[id]}
              </label>
            );
          })}
        </div>
      </fieldset>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1 text-xs font-medium text-slate-700 dark:text-slate-200">
          {p.status}
          <select className={fieldClass} value={form.status} onChange={(e) => set("status", e.target.value as SocialPlanStatus)}>
            {SOCIAL_PLAN_STATUSES.map((status) => <option key={status} value={status}>{p.statuses[status]}</option>)}
          </select>
        </label>
        <label className="block space-y-1 text-xs font-medium text-slate-700 dark:text-slate-200">
          {p.scheduledFor}
          <input type="datetime-local" className={fieldClass} required={form.status === "scheduled"} value={form.scheduledFor} onChange={(e) => set("scheduledFor", e.target.value)} />
        </label>
        <label className="block space-y-1 text-xs font-medium text-slate-700 dark:text-slate-200">
          {p.assignee}
          <select className={fieldClass} value={form.assigneeId} onChange={(e) => set("assigneeId", e.target.value)}>
            <option value="">{p.unassigned}</option>
            {team.map((member) => <option key={member.id} value={member.id}>{member.fullName}</option>)}
          </select>
        </label>
        <label className="block space-y-1 text-xs font-medium text-slate-700 dark:text-slate-200">
          {p.media}
          <input type="url" dir="ltr" className={fieldClass} placeholder={t.copy.urlExample} value={form.mediaUrl} onChange={(e) => set("mediaUrl", e.target.value)} />
        </label>
      </div>
      {form.status === "published" && (
        <label className="block space-y-1 text-xs font-medium text-slate-700 dark:text-slate-200">
          {p.publishedUrl}
          <input type="url" dir="ltr" className={fieldClass} placeholder={t.copy.urlExample} value={form.publishedUrl} onChange={(e) => set("publishedUrl", e.target.value)} />
        </label>
      )}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>{p.cancel}</Button>
        <Button type="submit" size="sm" disabled={saving || !form.platforms.length}>{p.save}</Button>
      </div>
    </form>
  );
}

function Planner({ plans, team, canEdit, canDelete }: { plans: SocialPlanView[]; team: Array<{ id: string; fullName: string }>; canEdit: boolean; canDelete: boolean }) {
  const { t, locale } = useAdminLocale();
  const p = t.socialAnalytics.plan;
  const router = useRouter();
  const [editing, setEditing] = React.useState<SocialPlanView | "new" | null>(null);
  const [deleting, setDeleting] = React.useState<SocialPlanView | null>(null);
  const [filter, setFilter] = React.useState<SocialPlanStatus | "all">("all");
  const now = Date.now();
  const shown = plans.filter((plan) => filter === "all" || plan.status === filter);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1.5" role="tablist">
          {(["all", ...SOCIAL_PLAN_STATUSES] as const).map((status) => (
            <button
              key={status}
              type="button"
              role="tab"
              aria-selected={filter === status}
              onClick={() => setFilter(status)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${filter === status ? "bg-primary text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"}`}
            >
              {status === "all" ? p.all : p.statuses[status]}
              <span className="ms-1 opacity-70">{status === "all" ? plans.length : plans.filter((x) => x.status === status).length}</span>
            </button>
          ))}
        </div>
        {canEdit && (
          <Button type="button" size="sm" className="ms-auto" onClick={() => setEditing("new")}>
            <Plus className="w-3.5 h-3.5 me-1" />
            {p.add}
          </Button>
        )}
      </div>

      {shown.length === 0 ? (
        <Card className="p-10 text-center text-sm text-slate-600 dark:text-slate-300 dark:bg-surface-raised">{p.empty}</Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {shown.map((plan) => {
            const overdue = plan.status === "scheduled" && plan.scheduledFor && new Date(plan.scheduledFor).getTime() < now;
            return (
              <Card key={plan.id} className="flex flex-col gap-2 p-4 dark:bg-surface-raised">
                <div className="flex items-start gap-2">
                  <h3 className="min-w-0 flex-1 text-sm font-semibold text-slate-900 dark:text-white" dir="auto">{plan.title}</h3>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${planTone[plan.status]}`}>{p.statuses[plan.status]}</span>
                </div>
                {plan.caption && <p className="line-clamp-3 text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap" dir="auto">{plan.caption}</p>}
                <div className="flex flex-wrap items-center gap-2 text-slate-600 dark:text-slate-300">
                  {plan.platforms.map((id) => (
                    <span key={id} title={t.socialAnalytics.platforms[id]}><SocialBrandIcon name={id} className="w-3.5 h-3.5" /></span>
                  ))}
                </div>
                <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-[11px] text-slate-600 dark:text-slate-400">
                  <span className={`inline-flex items-center gap-1 ${overdue ? "font-semibold text-rose-700 dark:text-rose-400" : ""}`}>
                    <CalendarClock className="w-3 h-3" />
                    {plan.scheduledFor ? <DateDisplay date={plan.scheduledFor} locale={locale} /> : p.unscheduled}
                    {overdue && ` · ${p.overdue}`}
                  </span>
                  {plan.assignee && <span className="truncate">{plan.assignee.fullName}</span>}
                  {plan.publishedUrl && (
                    <a href={plan.publishedUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary dark:text-accent hover:underline">
                      <ExternalLink className="w-3 h-3" />{t.socialAnalytics.open}
                    </a>
                  )}
                  <span className="ms-auto flex gap-1">
                    {canEdit && (
                      <button type="button" className="rounded-md p-1 hover:bg-slate-100 dark:hover:bg-white/10" aria-label={p.edit} onClick={() => setEditing(plan)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {canDelete && (
                      <button type="button" className="rounded-md p-1 text-rose-600 hover:bg-rose-500/10 dark:text-rose-400" aria-label={p.delete} onClick={() => setDeleting(plan)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal isOpen={editing !== null} onClose={() => setEditing(null)} title={editing === "new" ? p.add : p.edit} closeLabel={p.cancel}>
        {editing !== null && <PlanForm plan={editing === "new" ? null : editing} team={team} onClose={() => setEditing(null)} />}
      </Modal>
      <ConfirmDialog
        isOpen={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await deleteSocialPlanAction(deleting.id);
            toast.success(p.deleted);
            router.refresh();
          } catch (error) {
            toast.error(errorMessage(error, t, p.delete));
          }
          setDeleting(null);
        }}
        title={p.deleteTitle}
        description={deleting?.title ?? ""}
        confirmLabel={p.delete}
        cancelLabel={p.cancel}
      />
    </div>
  );
}

export function SocialAnalyticsView({
  analytics,
  plans,
  team,
  platform,
}: {
  analytics: SocialAnalytics;
  plans: SocialPlanView[];
  team: Array<{ id: string; fullName: string }>;
  platform: string | null;
}) {
  const { t, locale } = useAdminLocale();
  const s = t.socialAnalytics;
  const { can } = usePermissions();
  const router = useRouter();
  const searchParams = useSearchParams();
  const number = useNumber();
  const [tab, setTab] = React.useState<Tab>("overview");
  const [refreshing, setRefreshing] = React.useState(false);
  const connected = analytics.accounts.filter((account) => account.connected);
  const totalFollowers = sumSocialCounts(connected.map(a => a.followers));
  const followersChange = sumSocialCounts(connected.map(a => a.followersChange));
  const hasData = connected.some(account => account.followers != null) || analytics.totals.posts > 0;
  const lastSynced = connected.map((a) => a.lastSyncedAt).filter(Boolean).sort().at(-1) ?? null;
  const maxPlatform = Math.max(1, ...analytics.byPlatform.map((row) => row.interactions ?? 0));

  const setParam = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const refresh = async () => {
    setRefreshing(true);
    try {
      const { results } = await refreshSocialAnalyticsAction();
      const failed = results.filter((r) => !r.ok);
      if (failed.length) toast.error(`${s.refreshPartial}: ${failed.map((f) => `${t.integrations.providers[f.provider as keyof typeof t.integrations.providers]?.name ?? f.provider}${errorMessage(f.error, t, "") ? ` — ${errorMessage(f.error, t, "")}` : ""}`).join("; ")}`);
      else toast.success(s.refreshed);
      router.refresh();
    } catch (error) {
      toast.error(errorMessage(error, t, s.refreshPartial));
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="space-y-6 pb-16">
      <header className="flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{s.title}</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{s.subtitle}</p>
          <p className="mt-1 text-xs text-slate-500">{s.snapshotScope}</p>
          {analytics.partial && <p role="status" className="mt-1 text-xs text-amber-700 dark:text-amber-400">{s.partial}</p>}
          {lastSynced && (
            <p className="mt-1 flex flex-wrap items-center gap-1 text-xs text-slate-500">
              {s.updated} <DateDisplay date={lastSynced} locale={locale} format="time" />
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select aria-label={s.period} className={`${fieldClass} w-auto`} value={String(analytics.periodDays)} onChange={(e) => setParam("days", e.target.value === "30" ? null : e.target.value)}>
            {(["7", "30", "90", "365"] as const).map((days) => <option key={days} value={days}>{s.periods[days]}</option>)}
          </select>
          <select aria-label={s.allPlatforms} className={`${fieldClass} w-auto`} value={platform ?? ""} onChange={(e) => setParam("platform", e.target.value || null)}>
            <option value="">{s.allPlatforms}</option>
            {SOCIAL_PLATFORM_IDS.map((id) => <option key={id} value={id}>{s.platforms[id]}</option>)}
          </select>
          {can("social", "write") && connected.length > 0 && (
            <Button type="button" size="sm" variant="outline" disabled={refreshing} onClick={refresh}>
              <RefreshCw className={`w-3.5 h-3.5 me-1 ${refreshing ? "animate-spin" : ""}`} />
              {refreshing ? s.refreshing : s.refresh}
            </Button>
          )}
        </div>
      </header>

      <div className="flex gap-1 border-b border-ink/10" role="tablist">
        {(["overview", "posts", "planner"] as const).map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors ${tab === key ? "border-primary text-primary dark:border-accent dark:text-accent" : "border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"}`}
          >
            {s.tabs[key]}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="space-y-6">
          {!hasData && (
            <Card data-testid="social-empty" className="flex flex-col items-center gap-3 p-8 text-center dark:bg-surface-raised">
              <p className="max-w-md text-sm text-slate-600 dark:text-slate-300">{connected.length ? s.noData : s.empty}</p>
              {can("settings", "write") && (
                <Link href={ROUTES.settings.integrations} className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white hover:bg-primary-light">
                  {s.connect}
                </Link>
              )}
            </Card>
          )}

          {hasData && <div data-testid="social-kpis" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <Kpi
              icon={<Users className="w-4 h-4" />}
              label={s.kpi.followers}
              value={number.compact(totalFollowers)}
              footer={followersChange != null && followersChange !== 0 && (
                <span className={`text-[11px] font-medium ${followersChange > 0 ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400"}`}>
                  {formatMessage(s.followersGained, { n: `${followersChange > 0 ? "+" : ""}${number.full(followersChange)}` })}
                </span>
              )}
            />
            <Kpi icon={<CalendarClock className="w-4 h-4" />} label={s.kpi.posts} value={number.full(analytics.totals.posts)} footer={<Delta current={analytics.totals.posts} previous={analytics.previousTotals.posts} />} />
            <Kpi icon={<Heart className="w-4 h-4" />} label={s.kpi.interactions} value={number.compact(analytics.totals.interactions)} footer={<Delta current={analytics.totals.interactions} previous={analytics.previousTotals.interactions} />} />
            <Kpi icon={<Eye className="w-4 h-4" />} label={s.kpi.views} value={number.compact(analytics.totals.views)} footer={<Delta current={analytics.totals.views} previous={analytics.previousTotals.views} />} />
            <Kpi icon={<TrendingUp className="w-4 h-4" />} label={s.kpi.engagementRate} value={analytics.totals.avgEngagementRate != null ? `${analytics.totals.avgEngagementRate}%` : "—"} />
          </div>}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {analytics.accounts.map((account) => (
              <Card key={account.platform} data-testid={`social-account-${account.platform}`} className="flex items-center gap-3 p-4 dark:bg-surface-raised">
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${account.connected ? "bg-primary/10 text-primary dark:bg-white/10 dark:text-white" : "bg-slate-100 text-slate-400 dark:bg-white/5"}`}>
                  <SocialBrandIcon name={account.platform} className="w-5 h-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{s.platforms[account.platform]}</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {account.followers != null ? (
                      <>
                        <bdi dir="ltr" className="font-semibold text-slate-800 dark:text-slate-100">{number.full(account.followers)}</bdi> {s.metrics.followers}
                        {account.followersChange ? (
                          <span className={account.followersChange > 0 ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400"}>
                            {" "}<bdi dir="ltr">({account.followersChange > 0 ? "+" : ""}{number.full(account.followersChange)})</bdi>
                          </span>
                        ) : null}
                      </>
                    ) : account.connected ? s.noData : s.notConnected}
                  </p>
                  {account.connected && (account.isStale || account.lastError) && (
                    <p className="truncate text-[11px] text-amber-700 dark:text-amber-400" title={account.lastError ?? undefined}>{account.needsReconnect ? s.reconnect : s.stale}</p>
                  )}
                  {(!account.connected || account.needsReconnect) && can("settings", "write") && (
                    <Link href={ROUTES.settings.integrations} className="mt-1 inline-block text-xs font-semibold text-primary dark:text-accent underline">{account.needsReconnect ? s.reconnect : s.connect}</Link>
                  )}
                </div>
              </Card>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="space-y-3 p-4 sm:p-5 lg:col-span-2 dark:bg-surface-raised">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">{s.chartTitle}</h2>
              {analytics.daily.some(day => day.interactions != null) ? <InteractionsChart daily={analytics.daily} /> : <p className="text-xs text-slate-500">{s.noData}</p>}
            </Card>
            <Card className="space-y-3 p-4 sm:p-5 dark:bg-surface-raised">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">{s.byPlatform}</h2>
              {analytics.byPlatform.length === 0 ? (
                <p className="text-xs text-slate-500">{s.noPosts}</p>
              ) : (
                <ul className="space-y-3">
                  {analytics.byPlatform.map((row) => (
                    <li key={row.platform} className="space-y-1">
                      <div className="flex items-center gap-2 text-xs">
                        <SocialBrandIcon name={row.platform} className="w-3.5 h-3.5" />
                        <span className="font-medium text-slate-800 dark:text-slate-100">{s.platforms[row.platform]}</span>
                        <span className="ms-auto text-slate-600 dark:text-slate-400"><bdi dir="ltr">{number.compact(row.interactions)}</bdi> · {row.posts} {s.chartPosts}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-ink/10">
                        <div className="h-full rounded-full bg-accent" style={{ width: `${((row.interactions ?? 0) / maxPlatform) * 100}%` }} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <Card className="p-4 sm:p-5 dark:bg-surface-raised">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">{s.topPosts}</h2>
            {analytics.topPosts.length === 0 ? (
              <p className="mt-3 text-xs text-slate-500">{s.noPosts}</p>
            ) : (
              <ol className="divide-y divide-ink/10">
                {analytics.topPosts.map((post) => <PostRow key={post.id} post={post} />)}
              </ol>
            )}
          </Card>
        </div>
      )}

      {tab === "posts" && (
        <Card className="p-4 sm:p-5 dark:bg-surface-raised">
          {analytics.recentPosts.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-600 dark:text-slate-300">{s.noPosts}</p>
          ) : (
            <ul className="divide-y divide-ink/10">
              {analytics.recentPosts.map((post) => <PostRow key={post.id} post={post} />)}
            </ul>
          )}
        </Card>
      )}

      {tab === "planner" && (
        <Planner plans={plans} team={team} canEdit={can("social", "create") || can("social", "edit")} canDelete={can("social", "delete")} />
      )}
    </div>
  );
}

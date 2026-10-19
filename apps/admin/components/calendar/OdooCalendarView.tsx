"use client";
import { formatMessage } from "@platform/locales";
import { EntityLookup } from "../shared/EntityLookup";

import * as React from "react";
import Link from "next/link";
import type {
  CalendarEvent,
  CalendarLayer,
  CalendarVisibility,
} from "@platform/database/types";
import {
  createCalendarEventAction,
  updateCalendarEventAction,
  deleteCalendarEventAction,
} from "../../app/actions/calendar";
import { toast } from "sonner";
import {
  Card,
  Button,
  Modal,
  Input,
  Select,
  ConfirmDestructiveModal,
} from "@platform/ui";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  MapPin,
  ExternalLink,
  Trash2,
  Pencil,
  RefreshCw,
  Users,
  Lock,
} from "lucide-react";
import { ROUTES } from "../../constants/routes";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { errorMessage } from "../../lib/error-text";

const EVENT_TYPE_COLORS: Record<CalendarEvent["event_type"], string> = {
  shoot: "#09937F",
  meeting: "#3B82F6",
  deadline: "#E11D48",
  reminder: "#F59E0B",
};
const LAYERS: CalendarLayer[] = [
  "own",
  "shared",
  "leave",
  "holidays",
  "sales",
  "finance",
  "hr",
  "payroll",
  "meetings",
  "requests",
];
const LAYER_COLORS: Record<CalendarLayer, string> = {
  own: "#09937F",
  shared: "#3B82F6",
  leave: "#8B5CF6",
  holidays: "#F59E0B",
  sales: "#0EA5E9",
  finance: "#E11D48",
  hr: "#14B8A6",
  payroll: "#10B981",
  meetings: "#6366F1",
  requests: "#F97316",
};
const VISIBILITIES: CalendarVisibility[] = [
  "private",
  "team",
  "department",
  "company",
  "custom",
];

/** `datetime-local` inputs take local wall-clock time, not UTC. */
const toLocalInput = (value: string | number | Date) => {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
};
const dayKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const isoDay = (date: Date) =>
  new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
    .toISOString()
    .slice(0, 10);

interface Props {
  initialEvents: CalendarEvent[];
  currentUserId: string;
  people: Array<{ id: string; name: string }>;
  departments: Array<{ id: string; nameEn: string; nameAr: string }>;
  roles: Array<{ id: string; nameEn: string; nameAr: string }>;
  feedConnected: boolean;
}

/** Month, week and day views of everything on the person's calendar, filtered by layer. */
export function OdooCalendarView({
  initialEvents,
  people,
  departments,
  roles,
  feedConnected,
}: Props) {
  const { t, locale, isRTL } = useAdminLocale();
  const c = t.calendarSharing;
  const isAr = locale === "ar";
  const [events, setEvents] = React.useState<CalendarEvent[]>(initialEvents);
  const [loading, setLoading] = React.useState(false);
  const [currentDate, setCurrentDate] = React.useState(new Date());
  const [viewMode, setViewMode] = React.useState<"month" | "week" | "day">(
    "month",
  );
  const [layers, setLayers] = React.useState<Set<CalendarLayer>>(
    new Set(LAYERS),
  );
  const [selected, setSelected] = React.useState<CalendarEvent | null>(null);
  const [formOpen, setFormOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = React.useState<string | null>(
    null,
  );
  const [saving, setSaving] = React.useState(false);
  const [peopleFilter, setPeopleFilter] = React.useState("");
  const blank = () => ({
    title: "",
    titleAr: "",
    description: "",
    location: "",
    dealId: "",
    eventType: "meeting" as CalendarEvent["event_type"],
    start: toLocalInput(Date.now()),
    end: toLocalInput(Date.now() + 2 * 3600000),
    visibility: "team" as CalendarVisibility,
    users: [] as string[],
    departmentIds: [] as string[],
    roleIds: [] as string[],
  });
  const [form, setForm] = React.useState(blank);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const title = (ev: CalendarEvent) =>
    isAr && ev.title_ar ? ev.title_ar : ev.title;
  const fmtTime = (value: string) =>
    new Date(value).toLocaleTimeString(isAr ? "ar-BH-u-nu-latn" : "en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });
  const fmtDateTime = (value: string) =>
    new Date(value).toLocaleString(isAr ? "ar-BH-u-nu-latn" : "en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
    });

  // Load the visible range whenever the period changes.
  const load = React.useCallback(async (from: Date, to: Date) => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/calendar/events?start=${isoDay(from)}&end=${isoDay(to)}`,
        { cache: "no-store" },
      );
      if (response.ok) setEvents(await response.json());
    } finally {
      setLoading(false);
    }
  }, []);
  const range = React.useMemo(() => {
    const from = new Date(year, month, 1);
    from.setDate(from.getDate() - 7);
    const to = new Date(year, month + 1, 0);
    to.setDate(to.getDate() + 8);
    return { from, to };
  }, [year, month]);
  const firstLoad = React.useRef(true);
  React.useEffect(() => {
    if (firstLoad.current) {
      firstLoad.current = false;
      return;
    }
    void load(range.from, range.to);
  }, [range, load]);
  const refresh = () => load(range.from, range.to);

  const visible = events.filter((ev) => !ev.layer || layers.has(ev.layer));
  const onDay = (date: Date) => {
    const key = dayKey(date);
    return visible.filter((ev) => {
      const s = dayKey(new Date(ev.start_date));
      const e = dayKey(new Date(ev.end_date));
      return s <= key && key <= e;
    });
  };

  const move = (direction: -1 | 1) => {
    const d = new Date(currentDate);
    if (viewMode === "month") d.setMonth(d.getMonth() + direction, 1);
    else d.setDate(d.getDate() + direction * (viewMode === "week" ? 7 : 1));
    setCurrentDate(d);
  };

  const openCreate = (date?: Date) => {
    const next = blank();
    if (date) {
      const at = new Date(date);
      at.setHours(9, 0, 0, 0);
      next.start = toLocalInput(at);
      next.end = toLocalInput(at.getTime() + 3 * 3600000);
    }
    setEditingId(null);
    setForm(next);
    setFormOpen(true);
  };
  const openEdit = (ev: CalendarEvent) => {
    setEditingId(ev.id);
    setForm({
      title: ev.title,
      titleAr: ev.title_ar ?? "",
      description: ev.description ?? "",
      location: ev.location ?? "",
      dealId: ev.deal_id ?? "",
      eventType: ev.event_type,
      start: toLocalInput(ev.start_date),
      end: toLocalInput(ev.end_date),
      visibility: ev.visibility ?? "company",
      users: ev.audience_user_ids ?? [],
      departmentIds: ev.audience_department_ids ?? [],
      roleIds: ev.audience_roles ?? [],
    });
    setSelected(null);
    setFormOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.start || !form.end) return;
    setSaving(true);
    try {
      const payload = {
        title: form.title,
        title_ar: form.titleAr,
        description: form.description,
        start_date: new Date(form.start).toISOString(),
        end_date: new Date(form.end).toISOString(),
        location: form.location,
        color: EVENT_TYPE_COLORS[form.eventType],
        event_type: form.eventType,
        visibility: form.visibility,
        audience_user_ids: form.users,
        audience_department_ids: form.departmentIds,
        audience_roles: form.roleIds,
      };
      if (editingId)
        await updateCalendarEventAction(editingId, {
          ...payload,
          deal_id: form.dealId || null,
        });
      else
        await createCalendarEventAction({
          ...payload,
          title_ar: form.titleAr || undefined,
          description: form.description || undefined,
          location: form.location || undefined,
          deal_id: form.dealId || undefined,
        });
      setFormOpen(false);
      toast.success(c.saved);
      await refresh();
    } catch (err) {
      toast.error(errorMessage(err, t, t.calendarView.saveFailed));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await deleteCalendarEventAction(id);
      setSelected(null);
      await refresh();
    } catch (err) {
      toast.error(errorMessage(err, t, t.calendarView.saveFailed));
    }
  };

  const toggle = <T,>(list: T[], value: T) =>
    list.includes(value) ? list.filter((x) => x !== value) : [...list, value];
  const pill = (ev: CalendarEvent, compact = true) => {
    const color = ev.layer ? LAYER_COLORS[ev.layer] : ev.color || "#09937F";
    return (
      <button
        key={ev.id}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setSelected(ev);
        }}
        className={`block w-full truncate rounded-md border px-1.5 py-0.5 text-start text-[10px] font-semibold transition-transform hover:scale-[1.02] ${compact ? "" : "py-1.5 text-xs"}`}
        style={{
          backgroundColor: `${color}1f`,
          color,
          borderColor: `${color}55`,
        }}
      >
        {!ev.all_day && !compact ? (
          <span className="me-1 tabular-nums opacity-80">
            {fmtTime(ev.start_date)}
          </span>
        ) : null}
        {ev.visibility === "private" ? (
          <Lock className="me-0.5 inline h-2.5 w-2.5" aria-hidden />
        ) : null}
        {title(ev)}
      </button>
    );
  };

  // Month grid starts on Sunday, like the weekday header.
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();
  const weekStart = new Date(currentDate);
  weekStart.setDate(currentDate.getDate() - currentDate.getDay());
  const weekDays = Array.from(
    { length: 7 },
    (_, i) =>
      new Date(
        weekStart.getFullYear(),
        weekStart.getMonth(),
        weekStart.getDate() + i,
      ),
  );
  const today = dayKey(new Date());
  const heading =
    viewMode === "month"
      ? `${t.calendarView.months[month]} ${year}`
      : viewMode === "week"
        ? `${weekDays[0].getDate()} ${t.calendarView.months[weekDays[0].getMonth()]} – ${weekDays[6].getDate()} ${t.calendarView.months[weekDays[6].getMonth()]} ${weekDays[6].getFullYear()}`
        : `${currentDate.getDate()} ${t.calendarView.months[month]} ${year}`;
  const filteredPeople = people.filter(
    (p) =>
      !peopleFilter ||
      p.name.toLowerCase().includes(peopleFilter.toLowerCase()),
  );

  return (
    <div className="mx-auto max-w-7xl space-y-5 pb-16">
      <div className="flex flex-col justify-between gap-4 rounded-3xl border border-ink/10 bg-surface p-5 shadow-xl md:flex-row md:items-center">
        <div>
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-accent" aria-hidden />
            <h1 className="font-display text-xl font-bold tracking-tight text-ink sm:text-2xl">
              {t.calendar.title}
            </h1>
          </div>
          <p className="mt-1 text-xs text-ink-muted">{c.subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 rounded-xl border border-ink/10 bg-surface-sunken p-1">
            <button
              aria-label={isRTL ? t.actions.next : t.actions.previous}
              onClick={() => move(isRTL ? 1 : -1)}
              className="rounded-lg p-1.5 text-ink-muted hover:bg-ink/10 hover:text-ink"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-[150px] px-2 text-center text-xs font-bold text-ink">
              {heading}
            </span>
            <button
              aria-label={isRTL ? t.actions.previous : t.actions.next}
              onClick={() => move(isRTL ? -1 : 1)}
              className="rounded-lg p-1.5 text-ink-muted hover:bg-ink/10 hover:text-ink"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentDate(new Date())}
            className="text-xs"
          >
            {t.calendar.today}
          </Button>
          <div className="flex items-center rounded-xl border border-ink/10 bg-surface-sunken p-1 text-xs font-semibold">
            {(["month", "week", "day"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setViewMode(m)}
                className={`rounded-lg px-3 py-1 transition-all ${viewMode === m ? "bg-accent text-white shadow-sm" : "text-ink-muted hover:text-ink"}`}
              >
                {t.calendar[`${m}View` as "monthView" | "weekView" | "dayView"]}
              </button>
            ))}
          </div>
          {/* Calendar sync lives with the other integrations; this takes the person straight there. */}
          <Link
            href={`${ROUTES.settings.integrations}#calendar-sync`}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-accent/40 px-3 text-xs font-semibold text-accent hover:bg-accent/5"
          >
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            {feedConnected ? c.syncConnected : c.syncConnect}
          </Link>
          <Button
            variant="primary"
            size="sm"
            onClick={() => openCreate()}
            className="gap-1.5 shadow-lg shadow-accent/20"
          >
            <Plus className="h-4 w-4" aria-hidden />
            <span>{c.newEvent}</span>
          </Button>
        </div>
      </div>

      <div
        className="flex flex-wrap items-center gap-2"
        role="group"
        aria-label={c.layersLabel}
      >
        {LAYERS.map((layer) => {
          const on = layers.has(layer);
          return (
            <button
              key={layer}
              type="button"
              aria-pressed={on}
              onClick={() =>
                setLayers((prev) => {
                  const next = new Set(prev);
                  if (next.has(layer)) next.delete(layer);
                  else next.add(layer);
                  return next;
                })
              }
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold transition-colors ${on ? "text-ink" : "text-ink-muted opacity-60"}`}
              style={{
                borderColor: on ? `${LAYER_COLORS[layer]}88` : undefined,
                backgroundColor: on ? `${LAYER_COLORS[layer]}14` : undefined,
              }}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: LAYER_COLORS[layer] }}
              />
              {c.layers[layer]}
            </button>
          );
        })}
        <button
          type="button"
          onClick={refresh}
          aria-label={c.refresh}
          className="ms-auto rounded-full p-1.5 text-ink-muted hover:bg-ink/5 hover:text-ink"
        >
          <RefreshCw
            className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
            aria-hidden
          />
        </button>
      </div>

      {viewMode === "month" && (
        <Card className="overflow-hidden rounded-3xl border border-ink/10 bg-surface p-3 shadow-2xl sm:p-5">
          <div className="grid grid-cols-7 gap-1 border-b border-ink/10 pb-3 text-center text-xs font-bold uppercase text-ink-muted">
            {t.calendarView.weekdays.map((d) => (
              <div key={d} className="py-1">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1 pt-2 sm:gap-2">
            {Array.from({ length: firstDayIndex }).map((_, i) => (
              <div
                key={`blank-${i}`}
                className="min-h-[90px] rounded-2xl border border-ink/[0.03] bg-ink/[0.01] sm:min-h-[110px]"
              />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const date = new Date(year, month, i + 1);
              const items = onDay(date);
              const isToday = dayKey(date) === today;
              return (
                <div
                  key={i}
                  role="button"
                  tabIndex={0}
                  onClick={() => openCreate(date)}
                  onKeyDown={(e) => e.key === "Enter" && openCreate(date)}
                  className={`flex min-h-[90px] cursor-pointer flex-col rounded-2xl border p-1.5 transition-all sm:min-h-[110px] ${isToday ? "border-accent bg-primary/10" : "border-ink/5 bg-surface-sunken hover:border-ink/20"}`}
                >
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${isToday ? "bg-accent text-white" : "text-ink-muted"}`}
                  >
                    {i + 1}
                  </span>
                  <div className="mt-1 space-y-1 overflow-hidden">
                    {items.slice(0, 3).map((ev) => pill(ev))}
                    {items.length > 3 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrentDate(date);
                          setViewMode("day");
                        }}
                        className="w-full text-center text-[9px] text-ink-muted hover:text-ink"
                      >
                        +{items.length - 3} {t.calendarView.more}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {viewMode === "week" && (
        <Card className="overflow-x-auto rounded-3xl border border-ink/10 bg-surface p-3 sm:p-5">
          <div className="grid min-w-[700px] grid-cols-7 gap-2">
            {weekDays.map((date) => {
              const items = onDay(date).sort(
                (a, b) =>
                  Number(b.all_day) - Number(a.all_day) ||
                  a.start_date.localeCompare(b.start_date),
              );
              return (
                <div
                  key={dayKey(date)}
                  className={`min-h-[320px] rounded-2xl border p-2 ${dayKey(date) === today ? "border-accent bg-primary/5" : "border-ink/5 bg-surface-sunken"}`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentDate(date);
                      setViewMode("day");
                    }}
                    className="mb-2 w-full text-start"
                  >
                    <div className="text-[10px] font-bold uppercase text-ink-muted">
                      {t.calendarView.weekdays[date.getDay()]}
                    </div>
                    <div className="text-lg font-bold text-ink">
                      {date.getDate()}
                    </div>
                  </button>
                  <div className="space-y-1">
                    {items.map((ev) => pill(ev, false))}
                  </div>
                  <button
                    type="button"
                    onClick={() => openCreate(date)}
                    className="mt-2 w-full rounded-lg border border-dashed border-ink/15 py-1 text-[10px] text-ink-muted hover:text-ink"
                    aria-label={c.newEvent}
                  >
                    +
                  </button>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {viewMode === "day" && (
        <Card className="space-y-3 rounded-3xl border border-ink/10 bg-surface p-5">
          {onDay(currentDate).length === 0 ? (
            <p className="py-10 text-center text-sm text-ink-muted">
              {c.nothingThisDay}
            </p>
          ) : null}
          {onDay(currentDate)
            .sort(
              (a, b) =>
                Number(b.all_day) - Number(a.all_day) ||
                a.start_date.localeCompare(b.start_date),
            )
            .map((ev) => (
              <button
                key={ev.id}
                type="button"
                onClick={() => setSelected(ev)}
                className="flex w-full flex-col gap-1 rounded-2xl border border-ink/5 bg-surface-sunken p-4 text-start hover:border-accent/50 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className="rounded px-2 py-0.5 text-[10px] font-bold uppercase"
                      style={{
                        backgroundColor: `${LAYER_COLORS[ev.layer ?? "own"]}20`,
                        color: LAYER_COLORS[ev.layer ?? "own"],
                      }}
                    >
                      {c.layers[ev.layer ?? "own"]}
                    </span>
                    <h3 className="text-sm font-bold text-ink">{title(ev)}</h3>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-ink-muted">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-accent" aria-hidden />
                      {ev.all_day
                        ? t.calendar.allDay
                        : `${fmtTime(ev.start_date)} – ${fmtTime(ev.end_date)}`}
                    </span>
                    {ev.location ? (
                      <span className="flex items-center gap-1">
                        <MapPin
                          className="h-3.5 w-3.5 text-accent"
                          aria-hidden
                        />
                        {ev.location}
                      </span>
                    ) : null}
                    {ev.created_by_name && ev.layer === "shared" ? (
                      <span>{formatMessage(c.by, { name: ev.created_by_name })}</span>
                    ) : null}
                  </div>
                </div>
              </button>
            ))}
        </Card>
      )}

      {selected && (
        <Modal
          closeLabel={t.actions.close}
          isOpen
          onClose={() => setSelected(null)}
          title={title(selected)}
        >
          <div className="space-y-4 text-xs">
            <div className="space-y-2 rounded-2xl border border-ink/10 bg-surface-sunken p-4">
              <Row label={c.layer} value={c.layers[selected.layer ?? "own"]} />
              <Row
                label={t.calendarView.startTime}
                value={
                  selected.all_day
                    ? `${new Date(selected.start_date).toLocaleDateString(isAr ? "ar-BH-u-nu-latn" : "en-GB")} · ${t.calendar.allDay}`
                    : fmtDateTime(selected.start_date)
                }
              />
              {!selected.all_day ? (
                <Row
                  label={t.calendarView.endTime}
                  value={fmtDateTime(selected.end_date)}
                />
              ) : null}
              {selected.location ? (
                <Row
                  label={t.calendarView.location}
                  value={selected.location}
                />
              ) : null}
              {selected.deal ? (
                <Row
                  label={t.calendarView.linkedDeal}
                  value={selected.deal.title}
                />
              ) : null}
              {selected.source === "event" ? (
                <Row
                  label={c.whoSees}
                  value={c.visibility[selected.visibility ?? "company"]}
                />
              ) : null}
              {selected.created_by_name ? (
                <Row label={c.createdBy} value={selected.created_by_name} />
              ) : null}
            </div>
            {selected.description ? (
              <p className="rounded-xl border border-ink/5 bg-surface-sunken p-4 text-sm text-ink-muted">
                {selected.description}
              </p>
            ) : null}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink/10 pt-3">
              {selected.href ? (
                <Link
                  href={selected.href}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline"
                >
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                  {c.openRecord}
                </Link>
              ) : (
                <span />
              )}
              <div className="flex items-center gap-2">
                {selected.editable ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEdit(selected)}
                      className="gap-1.5"
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden />
                      {t.actions.edit}
                    </Button>
                    <Button
                      aria-label={t.actions.delete}
                      variant="danger"
                      size="sm"
                      onClick={() => setDeleteTargetId(selected.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </>
                ) : selected.source === "system" ? (
                  <span className="text-[11px] text-ink-muted">
                    {c.systemNote}
                  </span>
                ) : null}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setSelected(null)}
                >
                  {t.actions.close}
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      <Modal
        closeLabel={t.actions.close}
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        title={editingId ? t.calendarView.editEvent : c.newEvent}
      >
        <form onSubmit={save} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="space-y-1.5">
              <span className="font-medium text-ink-muted">
                {t.calendarView.eventTitleEnLabel}
              </span>
              <Input
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </label>
            <label className="space-y-1.5">
              <span className="font-medium text-ink-muted">
                {t.calendarView.eventTitleArLabel}
              </span>
              <Input
                dir="rtl"
                value={form.titleAr}
                onChange={(e) => setForm({ ...form, titleAr: e.target.value })}
              />
            </label>
            <label className="space-y-1.5">
              <span className="font-medium text-ink-muted">
                {t.calendarView.startDateTime}
              </span>
              <Input
                type="datetime-local"
                required
                value={form.start}
                onChange={(e) => setForm({ ...form, start: e.target.value })}
              />
            </label>
            <label className="space-y-1.5">
              <span className="font-medium text-ink-muted">
                {t.calendarView.endDateTime}
              </span>
              <Input
                type="datetime-local"
                required
                value={form.end}
                onChange={(e) => setForm({ ...form, end: e.target.value })}
              />
            </label>
            <label className="space-y-1.5">
              <span className="font-medium text-ink-muted">
                {t.calendarView.eventTypeLabel}
              </span>
              <Select
                value={form.eventType}
                onChange={(e) =>
                  setForm({
                    ...form,
                    eventType: e.target.value as CalendarEvent["event_type"],
                  })
                }
              >
                <option value="meeting">{t.calendarView.meeting}</option>
                <option value="shoot">{t.calendarView.shoot}</option>
                <option value="deadline">{t.calendarView.deadline}</option>
                <option value="reminder">{t.calendarView.reminder}</option>
              </Select>
            </label>
            <div className="space-y-1.5">
              <span className="font-medium text-ink-muted">
                {t.calendarView.linkDeal}
              </span>
              <EntityLookup
                domain="deals"
                value={form.dealId}
                onChange={(id) => setForm({ ...form, dealId: id })}
              />
            </div>
          </div>
          <label className="block space-y-1.5">
            <span className="font-medium text-ink-muted">
              {t.calendarView.locationAddress}
            </span>
            <Input
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder={t.calendarView.locationPlaceholder}
            />
          </label>
          <label className="block space-y-1.5">
            <span className="font-medium text-ink-muted">{c.description}</span>
            <Input
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
            />
          </label>

          <fieldset className="space-y-3 rounded-2xl border border-ink/10 p-3">
            <legend className="flex items-center gap-1.5 px-1 text-xs font-bold text-ink">
              <Users className="h-3.5 w-3.5 text-accent" aria-hidden />
              {c.whoSees}
            </legend>
            <Select
              aria-label={c.whoSees}
              value={form.visibility}
              onChange={(e) =>
                setForm({
                  ...form,
                  visibility: e.target.value as CalendarVisibility,
                })
              }
            >
              {VISIBILITIES.map((v) => (
                <option key={v} value={v}>
                  {c.visibility[v]}
                </option>
              ))}
            </Select>
            <p className="text-[11px] text-ink-muted">
              {c.visibilityHints[form.visibility]}
            </p>
            <div>
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="font-medium text-ink-muted">
                  {form.visibility === "custom" || form.visibility === "private"
                    ? c.people
                    : c.alsoPeople}
                </span>
                <input
                  value={peopleFilter}
                  onChange={(e) => setPeopleFilter(e.target.value)}
                  placeholder={c.searchPeople}
                  aria-label={c.searchPeople}
                  className="h-7 w-40 rounded-lg border border-ink/15 bg-white px-2 text-[11px] dark:bg-surface"
                />
              </div>
              <div className="flex max-h-32 flex-wrap gap-1.5 overflow-y-auto">
                {filteredPeople.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    aria-pressed={form.users.includes(p.id)}
                    onClick={() =>
                      setForm({ ...form, users: toggle(form.users, p.id) })
                    }
                    className={`rounded-full border px-2.5 py-1 text-[11px] ${form.users.includes(p.id) ? "border-accent bg-accent/10 font-semibold text-ink" : "border-ink/15 text-ink-muted"}`}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
            {form.visibility !== "private" && (
              <>
                <div>
                  <span className="mb-1 block font-medium text-ink-muted">
                    {form.visibility === "custom"
                      ? c.departments
                      : c.alsoDepartments}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {departments.map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        aria-pressed={form.departmentIds.includes(d.id)}
                        onClick={() =>
                          setForm({
                            ...form,
                            departmentIds: toggle(form.departmentIds, d.id),
                          })
                        }
                        className={`rounded-full border px-2.5 py-1 text-[11px] ${form.departmentIds.includes(d.id) ? "border-accent bg-accent/10 font-semibold text-ink" : "border-ink/15 text-ink-muted"}`}
                      >
                        {isAr ? d.nameAr : d.nameEn}
                      </button>
                    ))}
                  </div>
                </div>
                {form.visibility === "custom" && (
                  <div>
                    <span className="mb-1 block font-medium text-ink-muted">
                      {c.roles}
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {roles.map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          aria-pressed={form.roleIds.includes(r.id)}
                          onClick={() =>
                            setForm({
                              ...form,
                              roleIds: toggle(form.roleIds, r.id),
                            })
                          }
                          className={`rounded-full border px-2.5 py-1 text-[11px] ${form.roleIds.includes(r.id) ? "border-accent bg-accent/10 font-semibold text-ink" : "border-ink/15 text-ink-muted"}`}
                        >
                          {isAr ? r.nameAr : r.nameEn}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </fieldset>

          <div className="flex items-center justify-end gap-3 border-t border-ink/10 pt-4">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setFormOpen(false)}
            >
              {t.actions.cancel}
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={saving}>
              {saving ? t.calendarView.saving : t.actions.save}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDestructiveModal
        isOpen={!!deleteTargetId}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={async () => {
          if (deleteTargetId) {
            await remove(deleteTargetId);
            setDeleteTargetId(null);
          }
        }}
        title={t.actions.delete}
        description={t.calendarView.deleteConfirm}
        confirmLabel={t.actions.delete}
        cancelLabel={t.actions.cancel}
      />
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-ink-muted">{label}</span>
      <span className="text-end font-semibold text-ink">{value}</span>
    </div>
  );
}

"use client";
import * as React from "react";
import "./calendar.css";
import Link from "next/link";
import { Button, Select } from "@platform/ui";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Filter,
  Lock,
  Plus,
  RefreshCw,
} from "lucide-react";
import type { CalendarEvent, CalendarLayer } from "@platform/database/types";
import {
  calendarEventLanes,
  calendarMonthDays,
} from "../../lib/calendar-layout";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { ROUTES } from "../../constants/routes";

type Props = {
  date: Date;
  mode: "month" | "week" | "day";
  heading: string;
  loading: boolean;
  feedConnected: boolean;
  layers: {
    id: CalendarLayer;
    label: string;
    color: string;
    enabled: boolean;
  }[];
  setDate: (date: Date) => void;
  setMode: (mode: Props["mode"]) => void;
  move: (direction: -1 | 1) => void;
  toggleLayer: (layer: CalendarLayer) => void;
  refresh: () => void;
  create: (date?: Date, minute?: number) => void;
  select: (event: CalendarEvent) => void;
  title: (event: CalendarEvent) => string;
  time: (value: string) => string;
  onDay: (date: Date) => CalendarEvent[];
};
const keyOf = (date: Date) =>
  `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;

export function CalendarCanvas({
  date,
  mode,
  heading,
  loading,
  feedConnected,
  layers,
  setDate,
  setMode,
  move,
  toggleLayer,
  refresh,
  create,
  select,
  title,
  time,
  onDay,
}: Props) {
  const { t, locale, isRTL } = useAdminLocale();
  const c = t.calendarSharing;
  const panelId = React.useId();
  const [filters, setFilters] = React.useState(false);
  const [direction, setDirection] = React.useState(1);
  const [focusedDay, setFocusedDay] = React.useState(
    date.getDate() +
      new Date(date.getFullYear(), date.getMonth(), 1).getDay() -
      1,
  );
  React.useEffect(() => {
    setFocusedDay(
      date.getDate() +
        new Date(date.getFullYear(), date.getMonth(), 1).getDay() -
        1,
    );
  }, [date]);
  const grid = React.useRef<HTMLDivElement>(null);
  const days = calendarMonthDays(date);
  const today = keyOf(new Date());
  const fullDate = (day: Date) =>
    day.toLocaleDateString(locale === "ar" ? "ar-BH-u-nu-latn" : "en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  const navigate = (delta: -1 | 1) => {
    setDirection(delta * (isRTL ? -1 : 1));
    move(delta);
    setFocusedDay(0);
  };
  const color = (event: CalendarEvent) =>
    layers.find((layer) => layer.id === (event.layer ?? "own"))?.color ??
    "var(--md-sys-color-primary)";
  const chip = (event: CalendarEvent, compact = false) => (
    <button
      type="button"
      key={event.id}
      className={`calendar-event ${event.all_day ? "calendar-event-all-day" : ""}`}
      onClick={() => select(event)}
      style={{ "--event-color": color(event) } as React.CSSProperties}
      title={`${title(event)}${event.all_day ? "" : ` · ${time(event.start_date)}`}`}
    >
      {!event.all_day && <i aria-hidden />}
      {event.visibility === "private" && <Lock aria-hidden />}
      <bdi dir="auto">{title(event)}</bdi>
      {!compact && !event.all_day && (
        <time dir="ltr">{time(event.start_date)}</time>
      )}
    </button>
  );
  const miniMonth = (
    <div role="group" className="calendar-mini" aria-label={t.calendar.title}>
      <div className="calendar-mini-title">
        <bdi dir="auto">
          {t.calendarView.months[date.getMonth()]} {date.getFullYear()}
        </bdi>
      </div>
      <div className="calendar-mini-grid">
        {t.calendarView.weekdays.map((day, index) => (
          <span key={index} aria-label={day}>
            {day.slice(0, locale === "ar" ? 3 : 1)}
          </span>
        ))}
        {days.map((day) => (
          <button
            key={keyOf(day)}
            type="button"
            data-today={keyOf(day) === today}
            data-selected={keyOf(day) === keyOf(date)}
            data-outside={day.getMonth() !== date.getMonth()}
            aria-label={fullDate(day)}
            aria-current={keyOf(day) === today ? "date" : undefined}
            onClick={() => setDate(day)}
          >
            {day.getDate()}
          </button>
        ))}
      </div>
    </div>
  );
  const layerControls = (
    <fieldset className="calendar-layers">
      <legend>{c.layersLabel}</legend>
      {layers.map((layer) => (
        <label
          key={layer.id}
          style={
            {
              "--event-color": layer.color,
              "--layer-check-foreground":
                layer.id === "own"
                  ? "var(--md-sys-color-on-primary)"
                  : ["holidays", "sales", "hr", "payroll", "requests"].includes(
                        layer.id,
                      )
                    ? "#111111"
                    : "#ffffff",
            } as React.CSSProperties
          }
        >
          <input
            type="checkbox"
            checked={layer.enabled}
            onChange={() => toggleLayer(layer.id)}
          />
          <span className="calendar-layer-check" aria-hidden />{" "}
          <bdi dir="auto">{layer.label}</bdi>
        </label>
      ))}
    </fieldset>
  );
  const weekStart = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate() - date.getDay(),
  );
  const timelineDays =
    mode === "day"
      ? [date]
      : Array.from(
          { length: 7 },
          (_, index) =>
            new Date(
              weekStart.getFullYear(),
              weekStart.getMonth(),
              weekStart.getDate() + index,
            ),
        );

  return (
    <section className="calendar-workbench" aria-label={t.calendar.title}>
      <header className="calendar-toolbar">
        <div className="calendar-toolbar-title">
          <CalendarDays aria-hidden />
          <h1>{t.calendar.title}</h1>
        </div>
        <div className="calendar-period-controls">
          <Button variant="outline" onClick={() => setDate(new Date())}>
            {t.calendar.today}
          </Button>
          <div className="calendar-period-arrows">
            <Button
              variant="ghost"
              size="icon"
              aria-label={t.actions.previous}
              onClick={() => navigate(-1)}
            >
              {isRTL ? (
                <ChevronRight aria-hidden />
              ) : (
                <ChevronLeft aria-hidden />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label={t.actions.next}
              onClick={() => navigate(1)}
            >
              {isRTL ? (
                <ChevronLeft aria-hidden />
              ) : (
                <ChevronRight aria-hidden />
              )}
            </Button>
          </div>
          <h2 aria-live="polite">
            <bdi dir="auto">{heading}</bdi>
          </h2>
        </div>
        <div className="calendar-toolbar-actions">
          <Button
            className="calendar-compact-create"
            size="icon"
            aria-label={c.newEvent}
            onClick={() => create()}
          >
            <Plus aria-hidden />
          </Button>
          <Button
            className="calendar-filter-toggle"
            variant="outline"
            size="icon"
            aria-label={c.layersLabel}
            aria-expanded={filters}
            aria-controls={panelId}
            onClick={() => setFilters(!filters)}
          >
            <Filter aria-hidden />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={refresh}
            aria-label={c.refresh}
          >
            <RefreshCw aria-hidden className={loading ? "animate-spin" : ""} />
          </Button>
          <Select
            aria-label={t.calendar.title}
            value={mode}
            onChange={(event) => setMode(event.target.value as Props["mode"])}
            className="calendar-view-select"
          >
            {(["month", "week", "day"] as const).map((view) => (
              <option key={view} value={view}>
                {t.calendar[`${view}View`]}
              </option>
            ))}
          </Select>
        </div>
      </header>
      <div className="calendar-layout">
        <aside
          id={panelId}
          aria-label={t.calendar.title}
          className="calendar-supporting"
          data-open={filters}
        >
          <Button className="calendar-create" onClick={() => create()}>
            <Plus aria-hidden />
            {c.newEvent}
          </Button>
          {miniMonth}
          {layerControls}
          <Link
            className="calendar-sync-link"
            href={`${ROUTES.settings.integrations}#calendar-sync`}
          >
            <ExternalLink aria-hidden />
            {feedConnected ? c.syncConnected : c.syncConnect}
          </Link>
        </aside>
        <div className="calendar-surface" aria-busy={loading}>
          {loading && (
            <div
              role="progressbar"
              aria-label={c.refresh}
              className="calendar-loading"
            />
          )}
          <div
            key={`${mode}-${date.getFullYear()}-${date.getMonth()}-${mode === "month" ? "" : date.getDate()}`}
            className="calendar-period"
            style={{ "--calendar-direction": direction } as React.CSSProperties}
          >
            {mode === "month" ? (
              <>
                <div className="calendar-weekdays">
                  {t.calendarView.weekdays.map((day) => (
                    <span key={day}>
                      <span className="calendar-weekday-full">{day}</span>
                      <span className="calendar-weekday-short" aria-hidden>
                        {day.slice(0, locale === "ar" ? 3 : 3)}
                      </span>
                    </span>
                  ))}
                </div>
                <div
                  ref={grid}
                  className="calendar-month-grid"
                  style={
                    {
                      "--calendar-weeks": days.length / 7,
                    } as React.CSSProperties
                  }
                  onKeyDown={(event) => {
                    if (
                      !(event.target as HTMLElement).matches(
                        "[data-calendar-day]",
                      )
                    )
                      return;
                    const change =
                      event.key === "ArrowRight"
                        ? isRTL
                          ? -1
                          : 1
                        : event.key === "ArrowLeft"
                          ? isRTL
                            ? 1
                            : -1
                          : event.key === "ArrowDown"
                            ? 7
                            : event.key === "ArrowUp"
                              ? -7
                              : 0;
                    if (!change) return;
                    event.preventDefault();
                    const next = Math.max(
                      0,
                      Math.min(days.length - 1, focusedDay + change),
                    );
                    setFocusedDay(next);
                    grid.current
                      ?.querySelectorAll<HTMLButtonElement>(
                        "[data-calendar-day]",
                      )
                      [next]?.focus();
                  }}
                >
                  {days.map((day, index) => {
                    const items = onDay(day);
                    return (
                      <div
                        key={keyOf(day)}
                        className="calendar-day"
                        data-outside={day.getMonth() !== date.getMonth()}
                        data-today={keyOf(day) === today}
                      >
                        <button
                          type="button"
                          data-calendar-day
                          tabIndex={
                            index === Math.min(focusedDay, days.length - 1)
                              ? 0
                              : -1
                          }
                          aria-label={`${fullDate(day)} · ${c.newEvent}`}
                          className="calendar-day-hitbox"
                          onFocus={() => setFocusedDay(index)}
                          onClick={() => create(day)}
                        />
                        <div className="calendar-day-heading">
                          <span>
                            {day.getDate() === 1
                              ? `${day.getDate()} ${t.calendarView.months[day.getMonth()]}`
                              : day.getDate()}
                          </span>
                        </div>
                        <div className="calendar-day-events">
                          {items.slice(0, 3).map((event) => chip(event, true))}
                          {items.length > 3 && (
                            <button
                              type="button"
                              className="calendar-more"
                              onClick={() => {
                                setDate(day);
                                setMode("day");
                              }}
                            >
                              +{items.length - 3} {t.calendarView.more}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="calendar-time-scroll" data-overlay-scroll>
                <div
                  className="calendar-time-header"
                  style={
                    {
                      "--calendar-columns": timelineDays.length,
                    } as React.CSSProperties
                  }
                >
                  <div className="calendar-time-gutter" />
                  {timelineDays.map((day) => (
                    <button
                      key={keyOf(day)}
                      type="button"
                      data-today={keyOf(day) === today}
                      onClick={() => {
                        setDate(day);
                        setMode("day");
                      }}
                    >
                      <span>{t.calendarView.weekdays[day.getDay()]}</span>
                      <b>{day.getDate()}</b>
                    </button>
                  ))}
                </div>
                <div
                  className="calendar-all-day"
                  style={
                    {
                      "--calendar-columns": timelineDays.length,
                    } as React.CSSProperties
                  }
                >
                  <span>{t.calendar.allDay}</span>
                  {timelineDays.map((day) => (
                    <div key={keyOf(day)}>
                      {onDay(day)
                        .filter((event) => event.all_day)
                        .map((event) => chip(event, true))}
                    </div>
                  ))}
                </div>
                <div
                  className="calendar-time-body"
                  style={
                    {
                      "--calendar-columns": timelineDays.length,
                    } as React.CSSProperties
                  }
                >
                  <div className="calendar-hours" aria-hidden>
                    {Array.from({ length: 24 }, (_, hour) => (
                      <span key={hour} style={{ top: `${hour * 48}px` }}>
                        <bdi dir="ltr">{String(hour).padStart(2, "0")}:00</bdi>
                      </span>
                    ))}
                  </div>
                  {timelineDays.map((day) => (
                    <div
                      key={keyOf(day)}
                      tabIndex={0}
                      role="group"
                      aria-label={`${fullDate(day)} · ${c.newEvent}`}
                      className="calendar-time-column"
                      onKeyDown={(event) => {
                        if (
                          event.key === "Enter" &&
                          event.target === event.currentTarget
                        )
                          create(day);
                      }}
                      onDoubleClick={(event) => {
                        if (event.target === event.currentTarget)
                          create(
                            day,
                            Math.floor(
                              (event.clientY -
                                event.currentTarget.getBoundingClientRect()
                                  .top) /
                                48,
                            ) * 60,
                          );
                      }}
                    >
                      {calendarEventLanes(onDay(day), day).map((item) => (
                        <button
                          type="button"
                          key={item.event.id}
                          className="calendar-timed-event"
                          onClick={() => select(item.event)}
                          style={
                            {
                              top: `${item.start * 0.8}px`,
                              height: `${Math.max(24, (item.end - item.start) * 0.8)}px`,
                              insetInlineStart: `calc(${(item.lane / item.columns) * 100}% + 2px)`,
                              width: `calc(${100 / item.columns}% - 4px)`,
                              "--event-color": color(item.event),
                            } as React.CSSProperties
                          }
                        >
                          <bdi dir="auto">{title(item.event)}</bdi>
                          <time dir="ltr">
                            {time(item.event.start_date)} –{" "}
                            {time(item.event.end_date)}
                          </time>
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

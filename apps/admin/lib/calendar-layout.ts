import type { CalendarEvent } from "@platform/database/types";

export function calendarMonthDays(date: Date) {
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const count =
    Math.ceil(
      (first.getDay() +
        new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()) /
        7,
    ) * 7;
  return Array.from(
    { length: count },
    (_, index) =>
      new Date(date.getFullYear(), date.getMonth(), index - first.getDay() + 1),
  );
}

/** Presentation-only lanes: overlapping appointments never cover one another. */
export function calendarEventLanes(events: CalendarEvent[], date: Date) {
  const start = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  ).getTime();
  const end = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate() + 1,
  ).getTime();
  const items = events
    .filter(
      (event) =>
        !event.all_day &&
        new Date(event.start_date).getTime() < end &&
        new Date(event.end_date).getTime() >= start,
    )
    .map((event) => ({
      event,
      start: Math.max(
        0,
        (new Date(event.start_date).getTime() - start) / 60000,
      ),
      end: Math.min(
        1440,
        Math.max(
          (new Date(event.end_date).getTime() - start) / 60000,
          (new Date(event.start_date).getTime() - start) / 60000 + 30,
        ),
      ),
      lane: 0,
      columns: 1,
    }))
    .sort((a, b) => a.start - b.start || b.end - a.end);
  let cluster: typeof items = [],
    active: typeof items = [],
    columns = 0;
  const flush = () => {
    cluster.forEach((item) => {
      item.columns = columns;
    });
    cluster = [];
    columns = 0;
  };
  for (const item of items) {
    active = active.filter((other) => other.end > item.start);
    if (!active.length && cluster.length) flush();
    const used = new Set(active.map((other) => other.lane));
    while (used.has(item.lane)) item.lane++;
    active.push(item);
    cluster.push(item);
    columns = Math.max(columns, item.lane + 1);
  }
  flush();
  return items;
}

import { expect, test } from "vitest";
import type { CalendarEvent } from "../../lib/database/types";
import { calendarMonthDays, calendarEventLanes } from "../../lib/calendar-layout";
const day = new Date(2026, 9, 27);
const event = (id: string, start: number, end: number, allDay = false) => ({ id, start_date: new Date(2026, 9, 27, start).toISOString(), end_date: new Date(2026, 9, 27, end).toISOString(), all_day: allDay }) as CalendarEvent;

test("month dates form complete chronological weeks including adjacent days", () => {
  for (let month = 0; month < 12; month++) {
    const days = calendarMonthDays(new Date(2026, month, 12));
    expect(days.length % 7).toBe(0); expect(days[0].getDay()).toBe(0); expect(days.at(-1)!.getDay()).toBe(6);
    expect(days.filter(date => date.getMonth() === month)).toHaveLength(new Date(2026, month + 1, 0).getDate());
  }
});
test("overlapping appointments get separate lanes and adjacent appointments reuse a lane", () => {
  const result = calendarEventLanes([event("a", 9, 11), event("b", 10, 12), event("c", 12, 13)], day);
  expect(result.map(({lane,columns})=>[lane,columns])).toEqual([[0,2],[1,2],[0,1]]);
  expect(calendarEventLanes([event("all",0,24,true)],day)).toEqual([]);
});
test("overnight appointments are clipped to their visible day and source data is not changed", () => {
  const original = event("night",22,26), copy = {...original};
  const result = calendarEventLanes([original],day)[0];
  expect(result.start).toBe(1320); expect(result.end).toBe(1440); expect(original).toEqual(copy);
  const next = calendarEventLanes([original],new Date(2026,9,28))[0];
  expect(next.start).toBe(0); expect(next.end).toBe(120);
});

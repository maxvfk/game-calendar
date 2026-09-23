import { expect, test } from "bun:test";
import {
  dayBoundaries,
  scrollToToday,
  timelineEndMs,
  timelineMsAt,
  timelineStartMs,
  timelineX,
} from "../src/client/components/Timeline.tsx";
import { clockFor } from "../src/shared/time.ts";
import { GachaEvent } from "../src/shared/schema.ts";

const DAY_WIDTH = 72;

test("each local day is one fixed-width grid cell, exact times use its fraction", () => {
  const start = new Date(2026, 8, 22).getTime();
  const next = new Date(2026, 8, 23).getTime();
  const after = new Date(2026, 8, 24).getTime();
  const quarter = next + (after - next) / 4;
  expect(dayBoundaries(start, after)).toEqual([start, next, after]);
  expect(timelineX(next, start, DAY_WIDTH)).toBe(72);
  expect(timelineX(after, start, DAY_WIDTH)).toBe(144);
  expect(timelineX(quarter, start, DAY_WIDTH)).toBe(90);
  expect(timelineMsAt(90, start, DAY_WIDTH)).toBe(quarter);
});

test("calendar cells stay equal across the March daylight-saving transition", () => {
  // Under TZ=America/New_York the middle cell has 23 hours; CI's UTC run
  // still verifies the calendar arithmetic, and the focused TZ run exercises
  // the non-24-hour case.
  const before = new Date(2026, 2, 7).getTime();
  const shift = new Date(2026, 2, 8).getTime();
  const after = new Date(2026, 2, 9).getTime();
  expect(dayBoundaries(before, after)).toEqual([before, shift, after]);
  expect(timelineX(after, before, DAY_WIDTH)).toBe(2 * DAY_WIDTH);
  expect(timelineMsAt(2 * DAY_WIDTH, before, DAY_WIDTH)).toBe(after);
});

test("a date-only source occupies the printed dates without claiming a clock time", () => {
  const event = GachaEvent.parse({
    id: "test:date-only:2026-09-23", game: "genshin", title: "Date only",
    type: "challenge", summary: null,
    startsAt: "2026-09-23T00:00:00.000Z", startPrecision: "day",
    endsAt: "2026-09-25T00:00:00.000Z", endPrecision: "day",
    regionScoped: false, regionEnds: null,
    sourceUrl: "https://example.test/event", sourceId: "test",
    status: "published", confidence: 1, extractionMethod: "parser", version: 1,
    firstSeenAt: "2026-09-23T00:00:00.000Z", updatedAt: "2026-09-23T00:00:00.000Z",
  });
  const clock = clockFor(event, "europe", Date.parse("2026-09-24T12:00:00.000Z"));
  expect(timelineStartMs({ event, clock })).toBe(new Date(2026, 8, 23).getTime());
  expect(timelineEndMs({ event, clock })).toBe(new Date(2026, 8, 26).getTime());
  // Reset is a clock interpretation for status/countdowns, not a claimed
  // instant on the graphic for a source that only gave a date.
  expect(timelineStartMs({ event, clock })).not.toBe(clock.startsMs);

  const regional = GachaEvent.parse({
    ...event, regionScoped: true,
    regionEnds: { asia: "2026-09-25T03:59:00.000Z", europe: "2026-09-25T16:59:00.000Z", america: "2026-09-25T16:59:00.000Z" },
  });
  const regionalClock = clockFor(regional, "europe", Date.parse("2026-09-24T12:00:00.000Z"));
  expect(timelineEndMs({ event: regional, clock: regionalClock })).toBe(regionalClock.endsMs);
});

test("today opens near the centre and does not scroll before the board", () => {
  expect(scrollToToday(900, 360)).toBe(720);
  expect(scrollToToday(60, 360)).toBe(0);
});

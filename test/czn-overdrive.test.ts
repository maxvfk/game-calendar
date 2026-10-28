import { expect, test } from "bun:test";
import { materializeReviewedBatch } from "../src/ingest/reviewed.ts";
import { parsePrydwenCzn } from "../src/ingest/parsers/prydwen-czn.ts";
import { mergeEvents } from "../src/ingest/merge.ts";
import { Region } from "../src/shared/schema.ts";
import { clockFor } from "../src/shared/time.ts";
import { cznNextReset } from "../src/shared/cznDaily.ts";
import { assertExactBoundary } from "./helpers/verified-records.tsx";
const id = "czn:overdrive-simulation:2026-10-21";
const reviewed = materializeReviewedBatch(await Bun.file("data/reviewed/czn.json").json()).events;
const event = reviewed.find(e => e.id === id)!;

test("Overdrive uses the explicit global November3 18:00 cutoff and no guessed maintenance completion", () => {
  expect(reviewed.filter(e => e.id === id)).toHaveLength(1);
  expect(event).toMatchObject({ title: "Overdrive: Simulation", startsAt: "2026-10-21T00:00:00.000Z",
    startPrecision: "day", endsAt: "2026-11-03T18:00:00.000Z", endPrecision: "exact", regionScoped: false,
    regionEnds: null, sourceUrl: "https://czn.gg/10-21wed-update-notice/", provenanceStatus: "official",
    extractionMethod: "manual", sourceId: "reviewed-czn", confidence: 1 });
  expect(event.firstSeenAt).toBe(event.updatedAt);
  expect(event.firstSeenAt >= "2026-10-28T00:00:00.000Z").toBe(true);
});

test("UTC expiry is identical in all regions; gift mail06:00 and daily18:00 stay independent", () => {
  for (const region of Region.options) assertExactBoundary(event, region, "2026-11-03T18:00:00.000Z");
  expect(new Date(cznNextReset(Date.parse("2026-11-03T06:00:00Z"))).toISOString()).toBe(event.endsAt!);
  const gift = reviewed.find(e => e.id === "czn:anniversary-mail-gift:2026-11-03")!;
  expect(gift.startsAt).toBe("2026-11-03T06:00:00.000Z");
  expect(gift.endsAt).toBe("2026-11-04T05:59:00.000Z");
  for (const region of Region.options) {
    expect(clockFor(event, region, Date.parse("2026-11-03T18:00:00Z")).ended).toBe(true);
    expect(clockFor(event, region, Date.parse("2026-11-03T18:00:00Z")).upcoming).toBe(false);
    expect(clockFor(gift, region, Date.parse("2026-11-03T18:00:00Z")).live).toBe(true);
  }
});

test("healthy incomplete banner source retains Overdrive once, reviewed priority and all prior winners", async () => {
  const parsed = parsePrydwenCzn(await Bun.file("snapshots/czn-prydwen-banners.html").text(), {
    now: "2026-10-28T12:00:00.000Z", sourceId: "czn-prydwen-banners", game: "czn", sourceUrl: "https://www.prydwen.gg/chaos-zero-nightmare/banners" });
  expect(parsed.every(e => e.type === "banner")).toBe(true);
  expect(parsed.some(e => e.id === id)).toBe(false);
  const before = mergeEvents([reviewed.filter(e => e.id !== id), parsed]);
  for (const groups of [[reviewed, parsed], [parsed, reviewed], [reviewed, parsed, [event]]]) {
    const result = mergeEvents(groups);
    expect(result.events.find(e => e.id === id)).toEqual(event);
    expect(result.events.filter(e => e.id !== id)).toEqual(before.events);
    expect(result.events).toHaveLength(before.events.length + 1);
    expect(result.conflicts).toEqual(before.conflicts);
  }
});

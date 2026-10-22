import { expect, test } from "bun:test";
import { materializeReviewedBatch } from "../src/ingest/reviewed.ts";
import { mergeEvents } from "../src/ingest/merge.ts";
import { parseWikiGgEventsPage } from "../src/ingest/parsers/wikigg.ts";
import { parseWikiGgEchoesSeason } from "../src/ingest/parsers/wikigg-echoes.ts";
import { categoryFor } from "../src/client/state/eventCategories.ts";
import { timelineLanes } from "../src/client/state/lanes.ts";
import { clockFor, effectiveEnd } from "../src/shared/time.ts";
import { Region, eventId } from "../src/shared/schema.ts";

const reviewed = materializeReviewedBatch(await Bun.file("data/reviewed/endfield.json").json()).events;
const cycles = reviewed.filter(e => e.title.startsWith("Echoes of War: Season of Phantasia"));
const seasonHtml = await Bun.file("test/fixtures/endfield/phantasia-2026-10-17.html").text();
const ctx = { now: "2026-10-22T12:00:00.000Z", game: "endfield" as const,
  sourceId: "endfield-wikigg-echoes", sourceUrl: "https://endfield.wiki.gg/wiki/Echoes_of_War%3A_Season_of_Phantasia" };

test("official Phantasia cycles have stable canonical day IDs and all sourced exact ends", () => {
  expect(cycles.map(e => e.id)).toEqual([
    "endfield:echoes-of-war-season-of-phantasia-cycle-i:2026-10-15",
    "endfield:echoes-of-war-season-of-phantasia-cycle-ii:2026-10-22",
  ]);
  expect(cycles.map(e => e.regionEnds)).toEqual([
    { asia: "2026-10-21T19:59:00.000Z", europe: "2026-10-22T08:59:00.000Z", america: "2026-10-22T08:59:00.000Z" },
    { asia: "2026-10-28T19:59:00.000Z", europe: "2026-10-29T08:59:00.000Z", america: "2026-10-29T08:59:00.000Z" },
  ]);
  for (const e of cycles) {
    expect(e.id).toBe(eventId(e.game, e.title, e.startsAt));
    expect(e).toMatchObject({ type: "challenge", startPrecision: "day", endPrecision: "exact",
      sourceId: "reviewed-endfield", extractionMethod: "manual", provenanceStatus: "official", confidence: 1,
      sourceUrl: "https://x.com/AKEndfield/status/2109871758140711172" });
  }
});

test("Endgame/ending selectors keep only live Cycle II ahead of the single season final", async () => {
  const ordinary = parseWikiGgEventsPage(await Bun.file("test/fixtures/endfield/events-2026-10-17.html").text(),
    { ...ctx, sourceId: "endfield-wikigg-events", sourceUrl: "https://endfield.wiki.gg/wiki/Event" });
  const merged = mergeEvents([reviewed, ordinary]);
  expect(merged.conflicts).toEqual([]);
  const season = merged.events.filter(e => e.id === "endfield:season-of-phantasia:2026-10-15");
  expect(season).toHaveLength(1);
  expect(cycles.some(e => e.title.endsWith("Cycle III"))).toBe(false);
  for (const region of Region.options) {
    const rows = [...season, ...cycles].map(event => ({ event, clock: clockFor(event, region, Date.parse(ctx.now)) }))
      .filter(r => r.event.game === "endfield" && categoryFor(r.event.type) === "challenge" && !r.clock.ended);
    const ordered = timelineLanes(rows, "ending")[0]!.rows;
    expect(ordered.map(r => r.event.id)).toEqual([cycles[1]!.id, season[0]!.id]);
  }
});

test("Cycle II expires precisely in each region; Asia expiry leaves the western deadline alive", () => {
  const cycle = cycles[1]!;
  for (const region of Region.options) {
    const end = Date.parse(effectiveEnd(cycle, region)!);
    for (const delta of [-1, 0, 1]) {
      const clock = clockFor(cycle, region, end + delta);
      expect(clock.endsMs).toBe(end);
      expect(clock.msRemaining).toBe(0 - delta);
      expect(clock.ended).toBe(delta >= 0);
    }
  }
  expect(clockFor(cycle, "asia", Date.parse("2026-10-28T20:00:00Z")).ended).toBe(true);
  expect(clockFor(cycle, "europe", Date.parse("2026-10-28T20:00:00Z")).ended).toBe(false);
});

test("hypothetical consistent automatic recovery deduplicates under the old IDs; disagreement still surfaces", () => {
  // Test-only explicit schedule: consistent generic server-time starts. No live snapshot modification.
  const consistent = seasonHtml.replace("2026/10/15 23:00", "2026/10/15 12:00");
  const automatic = parseWikiGgEchoesSeason(consistent, ctx);
  expect(automatic.map(e => e.id)).toEqual(cycles.map(e => e.id));
  const merged = mergeEvents([cycles, automatic]);
  expect(merged.conflicts).toEqual([]);
  expect(merged.events).toEqual(cycles);
  for (const region of Region.options) {
    const changed = structuredClone(automatic);
    changed[1]!.regionEnds![region] = new Date(Date.parse(changed[1]!.regionEnds![region]!) + 60_000).toISOString();
    const conflict = mergeEvents([cycles, changed]).conflicts;
    expect(conflict).toHaveLength(1);
    expect(conflict[0]).toMatchObject({ field: "endsAt", region, deltaHours: 1 / 60 });
  }
  expect(() => parseWikiGgEchoesSeason(seasonHtml, ctx)).toThrow("Cycle I starts");
});

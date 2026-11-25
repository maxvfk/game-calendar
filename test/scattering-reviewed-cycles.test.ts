import { expect, test } from "bun:test";
import { materializeReviewedBatch } from "../src/ingest/reviewed.ts";
import { mergeEvents } from "../src/ingest/merge.ts";
import { clockFor, effectiveEnd } from "../src/shared/time.ts";
import { GachaEvent, Region, eventId } from "../src/shared/schema.ts";

/**
 * Season of Scattering (reviewed): the official season end and the cycle deadlines.
 *
 * On 2026-11-25 both wiki pages were wrong. The Event page ended the season on
 * Dec 15 (06:00 UTC+8 / 17:00 UTC−5), and the season page's cycle table started a
 * day early (Cycle I from Nov 24, while Fervor still ran). The official notes
 * (news 0740) give the season to Dec 16 11:59 server time with 3 cycles. The
 * in-game timers on the Americas/Europe server read 6 d 13 h to the next cycle
 * and 20 d 21 h to the season update, a 14 d 8 h gap that fits only these rows.
 */

const reviewed = materializeReviewedBatch(await Bun.file("data/reviewed/endfield.json").json()).events;
const cycles = reviewed.filter(e => e.title.startsWith("Echoes of War: Season of Scattering — Cycle"));
const season = reviewed.find(e => e.id === "endfield:season-of-scattering:2026-11-25")!;

// The Event page row as the wiki published it on 2026-11-25 (pinned, not the rolling snapshot).
const wikiSeason = GachaEvent.parse({
  id: "endfield:season-of-scattering:2026-11-25", game: "endfield", title: "Season of Scattering", type: "challenge",
  summary: "Echoes of War Event", startsAt: "2026-11-25T04:00:00.000Z", startPrecision: "exact",
  endsAt: "2026-12-14T22:00:00.000Z", endPrecision: "exact", regionScoped: true,
  regionEnds: { asia: "2026-12-14T22:00:00.000Z", america: "2026-12-15T22:00:00.000Z", europe: "2026-12-15T22:00:00.000Z" },
  sourceId: "endfield-wikigg-events", sourceUrl: "https://endfield.wiki.gg/wiki/Season_of_Scattering", status: "published",
  extractionMethod: "parser", confidence: 0.95, version: 1,
  firstSeenAt: "2026-11-25T01:28:55.000Z", updatedAt: "2026-11-25T15:48:24.000Z",
});

test("the official season end replaces the wiki's, and the disagreement stays visible", () => {
  expect(season).toMatchObject({ provenanceStatus: "official", endPrecision: "exact", regionScoped: true,
    sourceUrl: "https://endfield.gryphline.com/en-us/news/0740",
    regionEnds: { asia: "2026-12-16T03:59:00.000Z", europe: "2026-12-16T16:59:00.000Z", america: "2026-12-16T16:59:00.000Z" } });
  for (const groups of [[[season], [wikiSeason]], [[wikiSeason], [season]]]) {
    const merged = mergeEvents(groups);
    expect(merged.events).toEqual([season]);
    expect(merged.conflicts).toHaveLength(1);
    expect(merged.conflicts[0]).toMatchObject({ field: "endsAt", kept: season, rejected: wikiSeason });
  }
});

test("Cycles I and II have canonical day IDs, exact regional ends and estimated provenance", () => {
  expect(cycles.map(e => e.id)).toEqual([
    "endfield:echoes-of-war-season-of-scattering-cycle-i:2026-11-25",
    "endfield:echoes-of-war-season-of-scattering-cycle-ii:2026-12-02",
  ]);
  expect(cycles.map(e => e.regionEnds)).toEqual([
    { asia: "2026-12-01T19:59:00.000Z", europe: "2026-12-02T08:59:00.000Z", america: "2026-12-02T08:59:00.000Z" },
    { asia: "2026-12-08T19:59:00.000Z", europe: "2026-12-09T08:59:00.000Z", america: "2026-12-09T08:59:00.000Z" },
  ]);
  for (const e of cycles) {
    expect(e.id).toBe(eventId(e.game, e.title, e.startsAt));
    expect(e).toMatchObject({ type: "challenge", startPrecision: "day", endPrecision: "exact",
      sourceId: "reviewed-endfield", extractionMethod: "manual", provenanceStatus: "estimated" });
  }
  // Cycle III ends with the season; the season row already carries that deadline.
  expect(cycles.some(e => e.title.endsWith("Cycle III"))).toBe(false);
});

test("the in-game timers' gap fits Cycle I and the official season end on the western server", () => {
  const gap = Date.parse(effectiveEnd(season, "europe")!) - Date.parse(effectiveEnd(cycles[0]!, "europe")!);
  expect(gap).toBe((14 * 24 + 8) * 3_600_000);
  // The readings were taken inside the hour before 2026-11-25T20:00Z.
  const at = Date.parse("2026-11-25T19:30:00Z");
  expect(Math.floor((Date.parse(effectiveEnd(cycles[0]!, "europe")!) - at) / 3_600_000)).toBe(6 * 24 + 13);
  expect(Math.floor((Date.parse(effectiveEnd(season, "europe")!) - at) / 3_600_000)).toBe(20 * 24 + 21);
  for (const region of Region.options) {
    expect(clockFor(cycles[1]!, region, Date.parse(effectiveEnd(season, region)!)).ended).toBe(true);
  }
});

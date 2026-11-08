import { expect, test } from "bun:test";
import { materializeReviewedBatch } from "../src/ingest/reviewed.ts";
import { mergeEvents } from "../src/ingest/merge.ts";
import { parseWikiGgEchoesSeason } from "../src/ingest/parsers/wikigg-echoes.ts";
import { categoryFor } from "../src/client/state/eventCategories.ts";
import { timelineLanes } from "../src/client/state/lanes.ts";
import { clockFor, effectiveEnd } from "../src/shared/time.ts";
import { GachaEvent, Region, eventId } from "../src/shared/schema.ts";

/**
 * Season of Fervor internal cycle deadlines (reviewed, estimated).
 *
 * The automatic Echoes source has rejected every season page since Oct 14: the
 * wiki header gives the Americas/Europe season start as 23:00 UTC−5, while its
 * own cycle table and the official version notes (news 9560: "Nov. 5, 2026 at
 * 12:00 (server time)") open the season at 12:00 server time. The cycle table is
 * what these rows restore; Phantasia's table on the same wiki matched the
 * official infographic to the minute (`phantasia-reviewed-cycles.test.ts`).
 */

const reviewed = materializeReviewedBatch(await Bun.file("data/reviewed/endfield.json").json()).events;
const cycles = reviewed.filter(e => e.title.startsWith("Echoes of War: Season of Fervor — Cycle"));
const seasonHtml = await Bun.file("test/fixtures/endfield/fervor-2026-11-08.html").text();
const SOURCE = "https://endfield.wiki.gg/wiki/Echoes_of_War%3A_Season_of_Fervor";
const ctx = { now: "2026-11-08T12:00:00.000Z", game: "endfield" as const,
  sourceId: "endfield-wikigg-echoes", sourceUrl: SOURCE };

// The season row as the wiki Event page published it on 2026-11-08 (live feed),
// pinned here so this test does not depend on the rolling snapshot.
const season = GachaEvent.parse({
  id: "endfield:season-of-fervor:2026-11-05", game: "endfield", title: "Season of Fervor", type: "challenge",
  summary: "Echoes of War Event", startsAt: "2026-11-05T04:00:00.000Z", startPrecision: "exact",
  endsAt: "2026-11-26T03:59:00.000Z", endPrecision: "exact", regionScoped: true,
  regionEnds: { asia: "2026-11-26T03:59:00.000Z", america: "2026-11-26T16:59:00.000Z", europe: "2026-11-26T16:59:00.000Z" },
  sourceId: "endfield-wikigg-events", sourceUrl: "https://endfield.wiki.gg/wiki/Event", status: "published",
  extractionMethod: "parser", confidence: 1, version: 1,
  firstSeenAt: "2026-11-05T13:19:40.000Z", updatedAt: "2026-11-08T12:00:40.000Z",
});

test("the official season row stays as published; cycles are separate rows", () => {
  // news 9560 row: official, unknown end. Cycle rows add internal deadlines only.
  const official = reviewed.find(e => e.id === "endfield:echoes-of-war-season-of-fervor:2026-11-05")!;
  expect(official).toMatchObject({ provenanceStatus: "official", endsAt: null, endPrecision: "unknown" });
  expect(cycles.every(c => c.id !== official.id)).toBe(true);
});

test("Fervor Cycles I and II have canonical day IDs, exact regional ends and estimated provenance", () => {
  expect(cycles.map(e => e.id)).toEqual([
    "endfield:echoes-of-war-season-of-fervor-cycle-i:2026-11-05",
    "endfield:echoes-of-war-season-of-fervor-cycle-ii:2026-11-12",
  ]);
  expect(cycles.map(e => e.regionEnds)).toEqual([
    { asia: "2026-11-11T19:59:00.000Z", europe: "2026-11-12T08:59:00.000Z", america: "2026-11-12T08:59:00.000Z" },
    { asia: "2026-11-18T19:59:00.000Z", europe: "2026-11-19T08:59:00.000Z", america: "2026-11-19T08:59:00.000Z" },
  ]);
  for (const e of cycles) {
    expect(e.id).toBe(eventId(e.game, e.title, e.startsAt));
    expect(e).toMatchObject({ type: "challenge", startPrecision: "day", endPrecision: "exact",
      sourceId: "reviewed-endfield", extractionMethod: "manual", provenanceStatus: "estimated",
      confidence: 0.85, sourceUrl: SOURCE });
  }
  // Cycle III ends with the season; the season row already carries that deadline.
  expect(cycles.some(e => e.title.endsWith("Cycle III"))).toBe(false);
});

test("Endgame ordering: live Cycle I first, then the season final; upcoming Cycle II after them", () => {
  const merged = mergeEvents([reviewed, [season]]);
  expect(merged.conflicts).toEqual([]);
  for (const region of Region.options) {
    const rows = merged.events.filter(e => e.id === season.id || cycles.some(c => c.id === e.id))
      .map(event => ({ event, clock: clockFor(event, region, Date.parse(ctx.now)) }))
      .filter(r => categoryFor(r.event.type) === "challenge" && !r.clock.ended);
    // On Nov 8 Cycle II has not opened yet, so it follows the live rows.
    expect(timelineLanes(rows, "ending")[0]!.rows.map(r => r.event.id)).toEqual([cycles[0]!.id, season.id, cycles[1]!.id]);
  }
});

test("Cycle I expires precisely per region; the Asia expiry leaves the western deadline alive", () => {
  const cycle = cycles[0]!;
  for (const region of Region.options) {
    const end = Date.parse(effectiveEnd(cycle, region)!);
    for (const delta of [-1, 0, 1]) expect(clockFor(cycle, region, end + delta).ended).toBe(delta >= 0);
  }
  expect(clockFor(cycle, "asia", Date.parse("2026-11-11T20:00:00Z")).ended).toBe(true);
  expect(clockFor(cycle, "america", Date.parse("2026-11-11T20:00:00Z")).ended).toBe(false);
});

test("the live wiki page is still rejected; a consistent header would deduplicate under the same IDs", () => {
  // The real captured page stays fail-closed: the parser is unchanged.
  expect(() => parseWikiGgEchoesSeason(seasonHtml, ctx)).toThrow("Cycle I starts");
  // Test-only: the header's western start corrected to the official 12:00 server time.
  const automatic = parseWikiGgEchoesSeason(seasonHtml.replace("2026/11/05 23:00", "2026/11/05 12:00"), ctx);
  expect(automatic.map(e => e.id)).toEqual(cycles.map(e => e.id));
  const merged = mergeEvents([cycles, automatic]);
  expect(merged.conflicts).toEqual([]);
  // A recovered parser row (higher confidence) may win; it must carry the same deadlines.
  expect(merged.events.map(e => [e.id, e.endsAt, e.regionEnds])).toEqual(cycles.map(e => [e.id, e.endsAt, e.regionEnds]));
});

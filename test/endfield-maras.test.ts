import { expect, test } from "bun:test";
import { materializeReviewedBatch } from "../src/ingest/reviewed.ts";
import { parseWikiGgEventsPage } from "../src/ingest/parsers/wikigg.ts";
import { mergeEvents } from "../src/ingest/merge.ts";
import { Region } from "../src/shared/schema.ts";
import { clockFor } from "../src/shared/time.ts";
import { assertExactBoundary } from "./helpers/verified-records.tsx";

const id = "endfield:monumental-etching-forest-of-maras:2026-10-22";
const reviewed = materializeReviewedBatch(await Bun.file("data/reviewed/endfield.json").json()).events;
const official = reviewed.find(e => e.id === id)!;
const wiki = parseWikiGgEventsPage(await Bun.file("test/fixtures/endfield/events-2026-10-28.html").text(), {
  game: "endfield", sourceId: "endfield-wikigg-events", sourceUrl: "https://endfield.wiki.gg/wiki/Event", now: "2026-10-28T12:00:00.000Z" });
const captured = wiki.find(e => e.id === id)!;
const ends = { asia: "2026-11-04T20:00:00.000Z", america: "2026-11-05T09:00:00.000Z", europe: "2026-11-05T09:00:00.000Z" };

test("official Maras deadline corrects the captured late wiki winner without rekeying or losing discovery", () => {
  expect(official).toMatchObject({ id, title: captured.title, startsAt: captured.startsAt,
    startPrecision: captured.startPrecision, firstSeenAt: "2026-10-28T10:48:37.273Z",
    endsAt: ends.asia, endPrecision: "exact", regionScoped: true, regionEnds: ends,
    sourceUrl: "https://endfield.gryphline.com/en-us/news/9560", provenanceStatus: "official",
    extractionMethod: "manual", sourceId: "reviewed-endfield", confidence: 1 });
  expect(Date.parse(captured.regionEnds!.asia!) - Date.parse(ends.asia)).toBe(2 * 3600000);
  expect(Date.parse(captured.regionEnds!.europe!) - Date.parse(ends.europe)).toBe(13 * 3600000);
  for (const groups of [[wiki, reviewed], [reviewed, wiki], [wiki, reviewed, [captured]]]) {
    const merged = mergeEvents(groups);
    expect(merged.conflicts).toEqual([]);
    expect(merged.events.filter(e => e.id === id)).toEqual([official]);
    for (const e of wiki.filter(e => e.id !== id)) expect(merged.events.find(m => m.id === e.id)).toEqual(e);
    for (const e of reviewed.filter(e => e.id !== id)) expect(merged.events.find(m => m.id === e.id)).toEqual(e);
  }
});

test("known resolution does not silence new exact disagreements or accept another provenance/identity", () => {
  for (const region of Region.options) for (const side of ["wiki", "official"]) {
    const a = structuredClone(official), b = structuredClone(captured);
    const changed = side === "wiki" ? b : a;
    changed.regionEnds![region] = new Date(Date.parse(changed.regionEnds![region]!) + 60000).toISOString();
    expect(mergeEvents([[a], [b]]).conflicts).toHaveLength(1);
  }
  for (const changed of [
    { ...official, sourceUrl: "https://endfield.gryphline.com/en-us/news/other" },
    { ...official, provenanceStatus: "estimated" as const },
    { ...official, startsAt: "2026-10-22T04:01:00.000Z" },
  ]) expect(mergeEvents([[changed], [captured]], { toleranceHours: 0 }).conflicts).toHaveLength(1);
  const correctedWiki = { ...captured, endsAt: ends.asia, regionEnds: ends };
  expect(mergeEvents([[correctedWiki], [official]]).conflicts).toEqual([]);
  expect(mergeEvents([[correctedWiki], [official]]).events).toEqual([official]);
});

test("exact three-region expiry uses Endfield's shared western clock and retains historical status", () => {
  for (const region of Region.options) assertExactBoundary(official, region, ends[region]);
  const now = Date.parse("2026-11-04T21:00:00Z");
  expect(clockFor(official, "asia", now).ended).toBe(true);
  expect(clockFor(official, "europe", now).live).toBe(true);
  expect(clockFor(official, "america", now).live).toBe(true);
  expect(clockFor(official, "asia", now).upcoming).toBe(false);
});

import { expect, test } from "bun:test";
import { parseKqmHsrNews } from "../src/ingest/parsers/kqm-hsrnews.ts";
import { parseWikiGgEventsPage } from "../src/ingest/parsers/wikigg.ts";
import { materializeReviewedBatch } from "../src/ingest/reviewed.ts";
import { mergeEvents } from "../src/ingest/merge.ts";
import { Region } from "../src/shared/schema.ts";
import { assertExactBoundary } from "./helpers/verified-records.tsx";

const now = "2026-10-30T12:00:00.000Z";

test("new Garden of Plenty notice adds one distinct event with a global end, preserving prior HSR winners", async () => {
  const ctx = { game: "hsr" as const, sourceId: "hsr-kqm-hsrnews",
    sourceUrl: "https://api.github.com/repos/KQM-git/HSRNews/contents/readme.md", now };
  const old = parseKqmHsrNews(await Bun.file("test/fixtures/hsr/recovery-2026-10-28.md").text(), ctx);
  const fresh = parseKqmHsrNews(await Bun.file("test/fixtures/hsr/garden-of-plenty-2026-10-30.md").text(), ctx);
  expect(fresh).toHaveLength(1);
  const garden = fresh[0]!;
  expect(garden).toMatchObject({ id: "hsr:garden-of-plenty:2026-10-30", title: "Garden of Plenty",
    startsAt: "2026-10-30T00:00:00.000Z", startPrecision: "day",
    endsAt: "2026-11-10T19:59:00.000Z", endPrecision: "exact", regionScoped: false, regionEnds: null,
    sourceUrl: "https://github.com/KQM-git/HSRNews/blob/master/archive/1424.md" });
  for (const region of Region.options) assertExactBoundary(garden, region, garden.endsAt!);
  const reviewed = materializeReviewedBatch(await Bun.file("data/reviewed/hsr.json").json()).events;
  const before = mergeEvents([old, reviewed]);
  for (const groups of [[old, fresh, reviewed], [reviewed, fresh, old], [old, fresh, reviewed, fresh]]) {
    const after = mergeEvents(groups);
    expect(after.conflicts).toEqual(before.conflicts);
    expect(after.events.filter(e => e.id !== garden.id)).toEqual(before.events);
    expect(after.events.filter(e => e.id === garden.id)).toEqual([garden]);
  }
});

test("new Contingency Readiness wiki UTC-day alias corroborates the reviewed ID exactly once in either order", async () => {
  const ctx = { game: "endfield" as const, sourceId: "endfield-wikigg-events",
    sourceUrl: "https://endfield.wiki.gg/wiki/Event", now };
  const old = parseWikiGgEventsPage(await Bun.file("test/fixtures/endfield/events-2026-10-28.html").text(), ctx);
  const fresh = parseWikiGgEventsPage(await Bun.file("test/fixtures/endfield/contingency-readiness-2026-10-29.html").text(), ctx);
  expect(fresh).toHaveLength(1);
  const alias = fresh[0]!;
  expect(alias).toMatchObject({ id: "endfield:contingency-readiness:2026-10-28", title: "Contingency Readiness",
    startsAt: "2026-10-28T20:00:00.000Z", startPrecision: "exact",
    endsAt: "2026-11-04T20:00:00.000Z", endPrecision: "exact", regionScoped: true,
    regionEnds: { asia: "2026-11-04T20:00:00.000Z", europe: "2026-11-05T09:00:00.000Z", america: "2026-11-05T09:00:00.000Z" } });
  const reviewed = materializeReviewedBatch(await Bun.file("data/reviewed/endfield.json").json()).events;
  const official = reviewed.find(e => e.id === "endfield:contingency-readiness:2026-10-29")!;
  expect(official).toMatchObject({ startsAt: "2026-10-29T00:00:00.000Z", startPrecision: "day",
    endsAt: alias.endsAt, regionEnds: alias.regionEnds, sourceId: "reviewed-endfield", confidence: 1 });
  const before = mergeEvents([old, reviewed]);
  for (const groups of [[old, fresh, reviewed], [reviewed, fresh, old], [old, fresh, reviewed, fresh]]) {
    const after = mergeEvents(groups);
    expect(after).toEqual(before);
    expect(after.events.filter(e => e.title === alias.title)).toEqual([official]);
    expect(after.events.some(e => e.id === alias.id)).toBe(false);
    for (const region of Region.options) assertExactBoundary(after.events.find(e => e.id === official.id)!, region, official.regionEnds![region]!);
  }
});

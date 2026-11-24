import { expect, test } from "bun:test";
import { liveSnapshotTest } from "./helpers/live-snapshots.ts";
import { mergeEvents } from "../src/ingest/merge.ts";
import { parseWikiGgEventsPage } from "../src/ingest/parsers/wikigg.ts";
import { materializeReviewedBatch } from "../src/ingest/reviewed.ts";
import { effectiveEnd } from "../src/shared/time.ts";
import { categoryFor } from "../src/client/state/eventCategories.ts";

test("official Endfield banners preserve regional ends and unknown boundaries", async () => {
  const { events } = materializeReviewedBatch(await Bun.file("data/reviewed/endfield.json").json());
  const winter = events.find(e => e.title === "Winter Hunt")!;
  expect(winter).toMatchObject({ startPrecision: "day", endPrecision: "exact", provenanceStatus: "official" });
  expect(effectiveEnd(winter, "asia")).toBe("2026-09-30T03:59:00.000Z");
  expect(effectiveEnd(winter, "america")).toBe("2026-09-30T16:59:00.000Z");
  expect(effectiveEnd(winter, "europe")).toBe("2026-09-30T16:59:00.000Z");
  expect(events.find(e => e.title === "Deep Cold Issue")).toMatchObject({ endsAt: null, endPrecision: "unknown" });
  expect(events.find(e => e.title === "Resplendent Spectrum")).toMatchObject({
    startsAt: "2026-09-24T00:00:00.000Z", startPrecision: "day", endsAt: null,
  });
});

test("historical Endfield banners preserve wiki IDs, Snow's end and Illusion's classification", async () => {
  const html = await Bun.file("test/fixtures/endfield/events-2026-09-24.html").text();
  const wiki = parseWikiGgEventsPage(html, {
    game: "endfield", sourceId: "endfield-wikigg-events",
    sourceUrl: "https://endfield.wiki.gg/wiki/Event",
    now: "2026-09-22T20:16:00.000Z",
  });
  const { events: reviewed } = materializeReviewedBatch(await Bun.file("data/reviewed/endfield.json").json());
  expect(wiki.length).toBeGreaterThan(0);
  const merged = mergeEvents([wiki, reviewed]);
  expect(merged.conflicts).toHaveLength(0);
  expect(merged.events).toHaveLength(wiki.length + reviewed.length);
  for (const event of wiki) expect(merged.events.find(e => e.id === event.id)).toEqual(event);
  const snow = merged.events.find(e => e.title === "Snow Over Deep Woods");
  expect(snow).toBeDefined();
  expect(effectiveEnd(snow!, "asia")).toBe("2026-09-30T03:59:00.000Z");
  expect(effectiveEnd(snow!, "america")).toBe("2026-09-30T16:59:00.000Z");
  const illusion = wiki.find(e => e.title === "Season of Illusion")!;
  expect(illusion.id).toBe("endfield:season-of-illusion:2026-09-24");
  expect(illusion.type).toBe("challenge");
  expect(categoryFor(illusion.type)).toBe("challenge");
  expect(effectiveEnd(illusion, "asia")).toBe("2026-10-15T03:59:00.000Z");
  expect(effectiveEnd(illusion, "europe")).toBe("2026-10-14T16:59:00.000Z");
  expect(effectiveEnd(illusion, "america")).toBe("2026-10-14T16:59:00.000Z");
});

test("Shadow Marked preserves the official 04:00 server end, identity and discovery time", async () => {
  const { events } = materializeReviewedBatch(await Bun.file("data/reviewed/endfield.json").json());
  const shadow = events.find(e => e.title === "Monumental Etching: Shadow Marked")!;
  expect(shadow).toMatchObject({
    id: "endfield:monumental-etching-shadow-marked:2026-10-05",
    startsAt: "2026-10-05T00:00:00.000Z", startPrecision: "day",
    endsAt: "2026-10-18T20:00:00.000Z", endPrecision: "exact",
    provenanceStatus: "official", sourceUrl: "https://endfield.gryphline.com/en-us/news/5208",
    firstSeenAt: "2026-09-24T14:47:06.000Z",
    regionEnds: { asia: "2026-10-18T20:00:00.000Z",
      america: "2026-10-19T09:00:00.000Z", europe: "2026-10-19T09:00:00.000Z" },
  });
  const wiki = parseWikiGgEventsPage(await Bun.file("test/fixtures/endfield/events-2026-10-17.html").text(), {
    game: "endfield", sourceId: "endfield-wikigg-events", sourceUrl: "https://endfield.wiki.gg/wiki/Event",
    now: "2026-10-17T21:55:00.000Z",
  });
  const mirrored = wiki.find(e => e.id === shadow.id)!;
  expect(mirrored.regionEnds).toEqual(shadow.regionEnds);
  const merged = mergeEvents([[mirrored], [shadow]]);
  expect(merged.conflicts).toHaveLength(0);
  expect(merged.events).toEqual([shadow]);

  // A real one-minute exact disagreement must still require review.
  const wrong = { ...shadow, endsAt: "2026-10-18T19:59:00.000Z",
    regionEnds: { ...shadow.regionEnds!, asia: "2026-10-18T19:59:00.000Z" } };
  expect(mergeEvents([[mirrored], [wrong]]).conflicts).toMatchObject([
    { field: "endsAt", region: "asia", deltaHours: 1 / 60, kept: { id: shadow.id } },
  ]);
});

const novemberWikiContext = {
  game: "endfield", sourceId: "endfield-wikigg-events", sourceUrl: "https://endfield.wiki.gg/wiki/Event",
  now: "2026-11-22T13:27:32.877Z",
} as const;

const sanitySupplyConflict = {
  field: "endsAt", region: "asia", deltaHours: 1 / 60,
  kept: {
    id: "endfield:sanity-supply-november-2026:2026-11-18",
    sourceId: "reviewed-endfield", sourceUrl: "https://endfield.gryphline.com/en-us/news/9560",
    provenanceStatus: "official", extractionMethod: "manual", confidence: 1,
    startsAt: "2026-11-18T00:00:00.000Z", startPrecision: "day",
    endsAt: "2026-11-24T20:00:00.000Z", endPrecision: "exact",
    regionEnds: { asia: "2026-11-24T20:00:00.000Z", europe: "2026-11-24T22:00:00.000Z", america: "2026-11-24T22:00:00.000Z" },
  },
  rejected: {
    id: "endfield:sanity-supply:2026-11-17",
    sourceId: "endfield-wikigg-events", sourceUrl: "https://endfield.wiki.gg/wiki/Sanity_Supply",
    extractionMethod: "parser", confidence: 0.95,
    startsAt: "2026-11-17T20:00:00.000Z", startPrecision: "exact",
    endsAt: "2026-11-24T19:59:00.000Z", endPrecision: "exact",
    regionEnds: { asia: "2026-11-24T19:59:00.000Z", europe: "2026-11-24T21:59:00.000Z", america: "2026-11-24T21:59:00.000Z" },
  },
};

test("captured November Sanity Supply disagreement remains visible and keeps the official ID and dates", async () => {
  const html = await Bun.file("test/fixtures/endfield/sanity-supply-2026-11-22.html").text();
  const wiki = parseWikiGgEventsPage(html, novemberWikiContext);
  expect(wiki).toHaveLength(1);
  const { events: reviewed } = materializeReviewedBatch(await Bun.file("data/reviewed/endfield.json").json());
  const official = reviewed.find(e => e.id === sanitySupplyConflict.kept.id)!;
  for (const groups of [[wiki, [official]], [[official], wiki]]) {
    const merged = mergeEvents(groups);
    expect(merged.conflicts).toMatchObject([sanitySupplyConflict]);
    expect(merged.events).toEqual([official]);
  }
});

liveSnapshotTest("current Endfield snapshot exposes only known conflicts and keeps stable IDs and reviewed winners", async () => {
  const html = await Bun.file("snapshots/endfield-wikigg-events.html").text();
  const wiki = parseWikiGgEventsPage(html, novemberWikiContext);
  const { events: reviewed } = materializeReviewedBatch(await Bun.file("data/reviewed/endfield.json").json());
  expect(wiki.length).toBeGreaterThan(0);
  const merged = mergeEvents([wiki, reviewed]);
  // The live page can drop the row or reconcile its dates on a later refresh.
  // While it disagrees, match the entire conflict list, including all regional ends.
  if (merged.conflicts.length > 0) {
    expect(merged.conflicts).toMatchObject([sanitySupplyConflict]);
  }

  // UTC-day aliases must resolve to the existing reviewed identity.
  const wikiOnly = wiki.filter(e => !reviewed.some(r => r.id === e.id ||
    (r.id === sanitySupplyConflict.kept.id && e.id === sanitySupplyConflict.rejected.id) ||
    (r.title === e.title && Math.abs(Date.parse(r.startsAt) - Date.parse(e.startsAt)) <= 24 * 3_600_000)));
  const expected = new Map([...wikiOnly, ...reviewed].map(e => [e.id, e]));
  expect(merged.events.map(e => e.id).sort()).toEqual([...expected.keys()].sort());
  for (const event of merged.events) expect(event).toEqual(expected.get(event.id)!);
});

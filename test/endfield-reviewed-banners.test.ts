import { expect, test } from "bun:test";
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

test("reviewed Endfield banners preserve current wiki IDs and Snow's end when listed", async () => {
  const html = await Bun.file("snapshots/endfield-wikigg-events.html").text();
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
  if (snow) {
    expect(effectiveEnd(snow, "asia")).toBe("2026-09-30T03:59:00.000Z");
    expect(effectiveEnd(snow, "america")).toBe("2026-09-30T16:59:00.000Z");
  }
  const illusion = wiki.find(e => e.title === "Season of Illusion")!;
  expect(illusion.id).toBe("endfield:season-of-illusion:2026-09-24");
  expect(illusion.type).toBe("challenge");
  expect(categoryFor(illusion.type)).toBe("challenge");
  expect(effectiveEnd(illusion, "asia")).toBe("2026-10-15T03:59:00.000Z");
  expect(effectiveEnd(illusion, "europe")).toBe("2026-10-14T16:59:00.000Z");
  expect(effectiveEnd(illusion, "america")).toBe("2026-10-14T16:59:00.000Z");
});

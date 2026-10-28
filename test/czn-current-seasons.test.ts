import { expect, test } from "bun:test";
import { materializeReviewedBatch } from "../src/ingest/reviewed.ts";
import { parsePrydwenCzn } from "../src/ingest/parsers/prydwen-czn.ts";
import { mergeEvents } from "../src/ingest/merge.ts";
import { Region } from "../src/shared/schema.ts";
import { clockFor, dayOnlyEnd } from "../src/shared/time.ts";
import { detailHtml } from "./helpers/verified-records.tsx";
const reviewed = materializeReviewedBatch(await Bun.file("data/reviewed/czn.json").json()).events;
const ids = ["czn:basin-of-hyperspace-dimensional-twilight:2026-10-21", "czn:full-scale-offensive:2026-09-30"];
const current = reviewed.filter(e => ids.includes(e.id));

test("current seasonal phases retain only source-announced days, never invented maintenance clocks", () => {
  expect(current.map(e => e.id)).toEqual(ids);
  for (const e of current) {
    expect(e).toMatchObject({ type: "challenge", startPrecision: "day", endsAt: "2026-11-11T00:00:00.000Z", endPrecision: "day",
      regionScoped: false, regionEnds: null, provenanceStatus: "official", extractionMethod: "manual" });
    expect(dayOnlyEnd(e)).toBe(true);
    for (const region of Region.options) {
      expect(detailHtml(e, region, Date.parse("2026-10-28T12:00:00Z"))).toContain("Time unconfirmed");
      expect(clockFor(e, region, Date.parse("2026-11-13T12:00:00Z")).ended).toBe(true);
      expect(clockFor(e, region, Date.parse("2026-11-13T12:00:00Z")).upcoming).toBe(false);
    }
  }
});

test("old Full Scale ID and discovery/provenance survive with historical warning, no invented terminal date", () => {
  const old = reviewed.find(e => e.id === "czn:full-scale-offensive-season-4:2026-08-19")!;
  expect(old).toMatchObject({ firstSeenAt: "2026-09-24T14:47:06.000Z", startsAt: "2026-08-19T00:00:00.000Z",
    endsAt: null, endPrecision: "unknown", provenanceStatus: "official",
    sourceUrl: "https://newsroom.smilegate.com/en/bbs/board.php?bo_table=eng&wr_id=506" });
  expect(old.summary).toContain("Historical Season 4");
  expect(old.summary).toContain("closing boundary remains unverified");
  expect(current.some(e => e.id === old.id)).toBe(false);
});

test("healthy banner-only source cannot replace the distinct reviewed seasons or alter other winners", async () => {
  const parsed = parsePrydwenCzn(await Bun.file("snapshots/czn-prydwen-banners.html").text(), {
    now: "2026-10-28T12:00:00.000Z", game: "czn", sourceId: "czn-prydwen-banners", sourceUrl: "https://www.prydwen.gg/chaos-zero-nightmare/banners" });
  expect(parsed.every(e => e.type === "banner")).toBe(true);
  const before = mergeEvents([reviewed.filter(e => !ids.includes(e.id)), parsed]);
  const after = mergeEvents([reviewed, parsed, current]);
  expect(after.conflicts).toEqual(before.conflicts);
  expect(after.events.filter(e => !ids.includes(e.id))).toEqual(before.events);
  for (const e of current) expect(after.events.filter(m => m.id === e.id)).toEqual([e]);
});

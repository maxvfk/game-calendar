import { expect, test } from "bun:test";
import { materializeReviewedBatch } from "../src/ingest/reviewed.ts";
import { mergeEvents } from "../src/ingest/merge.ts";
import { parsePrydwenCzn } from "../src/ingest/parsers/prydwen-czn.ts";
import { Region } from "../src/shared/schema.ts";
import { clockFor, dayOnlyEnd } from "../src/shared/time.ts";
import { timelineLanes } from "../src/client/state/lanes.ts";
import { buildExportData, parseImportData } from "../src/client/state/export.ts";
import { outstanding } from "../src/client/state/lens.ts";
import { assertExactBoundary, detailHtml } from "./helpers/verified-records.tsx";

const ctx = { now: "2026-10-22T15:39:28.550Z", game: "czn" as const,
  sourceId: "czn-prydwen-banners", sourceUrl: "https://www.prydwen.gg/chaos-zero-nightmare/banners" };
const automatic = parsePrydwenCzn(await Bun.file("snapshots/czn-prydwen-banners.html").text(), ctx);
const reviewed = materializeReviewedBatch(await Bun.file("data/reviewed/czn.json").json()).events;
const corrected = reviewed.filter(e => /^(Nine|Alcea|Tiphera|Tiana|Rossweisse|Sig) Rate-Up Rescue$/.test(e.title));
const merged = mergeEvents([reviewed, automatic]);

test("six current same-ID official winners preserve firstSeenAt, separate pair identities and conflict-free feed", () => {
  expect(corrected).toHaveLength(6);
  expect(merged.conflicts).toEqual([]);
  expect(new Set(merged.events.map(e => e.id))).toEqual(new Set([...reviewed, ...automatic].map(e => e.id)));
  for (const e of corrected) {
    const old = automatic.find(p => p.id === e.id)!;
    expect(old).toBeDefined();
    expect(e.firstSeenAt).toBe(ctx.now); // Actual published pre-correction observation preserved verbatim.
    expect(e.title).toBe(old.title);
    expect(e).toMatchObject({ provenanceStatus: "official", sourceId: "reviewed-czn", confidence: 1,
      extractionMethod: "manual", startPrecision: "exact", regionEnds: null, regionScoped: false });
    expect(e.sourceUrl).toStartWith("https://page.onstove.com/chaoszeronightmare/en/view/");
    expect(merged.events.find(p => p.id === e.id)).toEqual(e);
  }
  expect(merged.events.some(e => /Sereniel|Peko/.test(e.title))).toBe(false);
});

test("paired global normal rescue windows, exact expiry and upcoming/sort across all regions", () => {
  for (const e of corrected.filter(e => !/Rossweisse|Sig/.test(e.title))) {
    const first = /Nine|Alcea/.test(e.title);
    expect(e.startsAt).toBe(first ? "2026-10-13T18:00:00.000Z" : "2026-11-03T18:00:00.000Z");
    const end = first ? "2026-11-03T18:00:00.000Z" : "2026-11-24T18:00:00.000Z";
    expect(e.endsAt).toBe(end);
    for (const region of Region.options) {
      assertExactBoundary(e, region, end);
      expect(clockFor(e, region, Date.parse(e.startsAt) - 1).upcoming).toBe(true);
      expect(clockFor(e, region, Date.parse(e.startsAt)).upcoming).toBe(false);
    }
  }
  for (const region of Region.options) {
    const rows = corrected.map(event => ({ event, clock: clockFor(event, region, Date.parse("2026-11-03T17:59:59Z")) }));
    expect(timelineLanes(rows, "ending")[0]!.rows.slice(0, 2).map(r => r.event.title).sort())
      .toEqual(["Alcea Rate-Up Rescue", "Nine Rate-Up Rescue"]);
  }
});

test("Rossweisse/Sig have confirmed 05:00 start but Dec 2 remains a date-only maintenance placeholder", () => {
  for (const e of corrected.filter(e => /Rossweisse|Sig/.test(e.title))) {
    expect(e).toMatchObject({ startsAt: "2026-10-21T05:00:00.000Z", endPrecision: "day", endsAt: "2026-12-02T00:00:00.000Z" });
    expect(dayOnlyEnd(e)).toBe(true);
    for (const region of Region.options) {
      expect(clockFor(e, region, Date.parse(e.startsAt) - 1).upcoming).toBe(true);
      expect(clockFor(e, region, Date.parse(e.startsAt)).live).toBe(true);
      expect(detailHtml(e, region, Date.parse(ctx.now))).toContain("Time unconfirmed");
    }
  }
});

test("one-minute exact global and region-only disagreements still require review", () => {
  const e = corrected.find(e => e.title === "Nine Rate-Up Rescue")!;
  for (const region of Region.options) {
    const other = { ...e, sourceId: ctx.sourceId, confidence: 0.7, regionScoped: true,
      regionEnds: { asia: e.endsAt!, europe: e.endsAt!, america: e.endsAt!, [region]: "2026-11-03T18:01:00.000Z" } };
    expect(mergeEvents([[e], [other]]).conflicts[0]).toMatchObject({ field: "endsAt", region, deltaHours: 1 / 60 });
  }
});

test("legacy completion export/import remains attached to all six refreshed winner IDs", () => {
  const progress = Object.fromEntries(corrected.map(e => [e.id, { status: "done" as const, at: "2026-10-21T12:00:00Z" }]));
  const before = JSON.stringify(progress);
  const imported = parseImportData(JSON.parse(JSON.stringify(buildExportData(progress, {}, {}, { games: {}, events: {} }))))!.progress!;
  const rows = corrected.map(event => ({ event, clock: clockFor(event, "asia", Date.parse(ctx.now)) }));
  expect(outstanding(rows, id => imported[id]?.status === "done", () => false)).toEqual([]);
  for (const e of corrected) expect(detailHtml(e, "asia", Date.parse(ctx.now), imported[e.id]?.status === "done"))
    .toMatch(/aria-pressed="true"[^>]*>Done/);
  expect(JSON.stringify(progress)).toBe(before);
});

test("historical Sereniel/Peko midnight is independently promotable, generic future clocks remain conservative", async () => {
  const excerpt = await Bun.file("test/fixtures/czn/sereniel-peko-2026-10-20.html").text();
  expect(excerpt).toContain("2026-10-21T00:00:00");
  const old = parsePrydwenCzn(excerpt, ctx);
  expect(old).toHaveLength(2);
  expect(old.every(e => e.startPrecision === "day" && e.endPrecision === "day")).toBe(true);
  const official = materializeReviewedBatch({ schemaVersion: 1, game: "czn", reviewedAt: ctx.now, reviewedBy: "test",
    events: old.map(e => ({ ...e, startsAt: "2026-09-30T05:00:00.000Z", startPrecision: "exact",
      endsAt: "2026-10-21T00:00:00.000Z", endPrecision: "exact", confidence: 1, provenanceStatus: "official",
      sourceUrl: "https://page.onstove.com/chaoszeronightmare/en/view/14554254" })) }).events;
  expect(mergeEvents([official, old]).conflicts).toEqual([]);
  expect(mergeEvents([official, old]).events).toEqual([...official].sort((a, b) => a.id.localeCompare(b.id)));
  for (const e of automatic.filter(e => /Blazebell|Vivian|Dahlia|Edelyn/.test(e.title))) {
    expect(e.startPrecision).toBe("day");
    expect(e.endPrecision).toBe("day");
  }
});

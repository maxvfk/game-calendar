import { expect, test } from "bun:test";
import { materializeReviewedBatch } from "../src/ingest/reviewed.ts";
import { mergeEvents } from "../src/ingest/merge.ts";
import { parseKqmGinNews } from "../src/ingest/parsers/kqm-ginews.ts";
import { Region } from "../src/shared/schema.ts";
import { clockFor, effectiveEnd } from "../src/shared/time.ts";
import { timelineLanes } from "../src/client/state/lanes.ts";
import { outstanding } from "../src/client/state/lens.ts";
import { buildExportData, parseImportData } from "../src/client/state/export.ts";
import { assertExactBoundary } from "./helpers/verified-records.tsx";

const ctx = { now: "2026-10-22T15:48:01.525Z", sourceId: "genshin-kqm-ginews", game: "genshin" as const,
  sourceUrl: "https://api.github.com/repos/KQM-git/GINews/contents/readme.md" };
const automatic = parseKqmGinNews(await Bun.file("snapshots/genshin-kqm-ginews.md").text(), ctx);
const reviewed = materializeReviewedBatch(await Bun.file("data/reviewed/genshin.json").json()).events;
const ids = ["genshin:void-stars-advent:2026-10-13", "genshin:la-chanson-cerise:2026-10-13"];
const corrected = reviewed.filter(e => ids.includes(e.id));
const ends = { asia: "2026-11-03T06:59:00.000Z", europe: "2026-11-03T13:59:00.000Z", america: "2026-11-03T19:59:00.000Z" };

test("only two existing character identities gain official exact regional ends and retain day starts", () => {
  expect(corrected.map(e => e.id).sort()).toEqual([...ids].sort());
  const merged = mergeEvents([reviewed, automatic]);
  expect(merged.conflicts).toEqual([]);
  expect(new Set(merged.events.map(e => e.id))).toEqual(new Set(mergeEvents([reviewed.filter(e => !ids.includes(e.id)), automatic]).events.map(e => e.id)));
  for (const e of corrected) {
    const old = automatic.find(p => p.id === e.id)!;
    expect(old).toBeDefined();
    expect(e.title).toBe(old.title);
    expect(e.startsAt).toBe(old.startsAt);
    expect(e).toMatchObject({ startsAt: "2026-10-13T00:00:00.000Z", startPrecision: "day",
      endsAt: ends.asia, endPrecision: "exact", regionScoped: true, regionEnds: ends,
      firstSeenAt: ctx.now, sourceUrl: "https://www.hoyolab.com/article/47010361",
      sourceId: "reviewed-genshin", provenanceStatus: "official", extractionMethod: "manual", confidence: 1 });
    expect(merged.events.find(p => p.id === e.id)).toEqual(e);
    expect(effectiveEnd(e, "unsupported" as Region)).toBe(ends.asia);
  }
  // Generic tag parser and unrelated Carefree date precision remain conservative.
  expect(automatic.filter(e => ids.includes(e.id)).every(e => e.endPrecision === "day")).toBe(true);
  expect(reviewed.find(e => e.title === "Carefree Snowball Fight")?.endPrecision).toBe("day");
  expect(corrected.some(e => e.title.includes("Epitome"))).toBe(false);
});

test("each regional end agrees with expiry, Timeline, details and deadline sorting at ±1ms", () => {
  for (const e of corrected) for (const region of Region.options) assertExactBoundary(e, region, ends[region]);
  const now = Date.parse("2026-11-03T07:00:00Z");
  const e = corrected[0]!;
  expect(clockFor(e, "asia", now).ended).toBe(true);
  expect(clockFor(e, "europe", now).live).toBe(true);
  expect(clockFor(e, "america", now).live).toBe(true);
  const rows = Region.options.map(region => ({ event: e, region, clock: clockFor(e, region, now) }))
    .filter(r => !r.clock.ended);
  expect(timelineLanes(rows, "ending")[0]!.rows.map(r => r.region)).toEqual(["europe", "america"]);
});

test("official one-minute or western-only exact discrepancies are surfaced instead of overwritten", () => {
  for (const region of Region.options) {
    const e = corrected[0]!;
    const other = { ...e, sourceId: ctx.sourceId, confidence: 0.8, regionEnds: { ...ends,
      [region]: new Date(Date.parse(ends[region]) + 60_000).toISOString() } };
    const merged = mergeEvents([[e], [other]]);
    expect(merged.conflicts).toHaveLength(1);
    expect(merged.conflicts[0]).toMatchObject({ field: "endsAt", region, deltaHours: 1 / 60 });
    expect(merged.events[0]).toEqual(e);
  }
});

test("both legacy completion identities survive export/import and refreshed official winners", () => {
  const progress = Object.fromEntries(ids.map(id => [id, { status: "done" as const, at: "2026-10-21T12:00:00Z" }]));
  const serialized = JSON.stringify(progress);
  const restored = parseImportData(buildExportData(progress, {}, {}, { games: {}, events: {} }))!.progress!;
  const merged = mergeEvents([reviewed, automatic]);
  const rows = merged.events.filter(e => ids.includes(e.id)).map(event => ({ event, clock: clockFor(event, "europe", Date.parse(ctx.now)) }));
  expect(outstanding(rows, id => restored[id]?.status === "done", () => false)).toEqual([]);
  expect(JSON.stringify(progress)).toBe(serialized);
});

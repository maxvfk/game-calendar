import { expect, test } from "bun:test";
import { materializeReviewedBatch } from "../src/ingest/reviewed.ts";
import { parsePrydwenCzn } from "../src/ingest/parsers/prydwen-czn.ts";
import { mergeEvents } from "../src/ingest/merge.ts";
import { Region } from "../src/shared/schema.ts";
import { clockFor, dayStartMs } from "../src/shared/time.ts";
import { assertExactBoundary } from "./helpers/verified-records.tsx";

const evidence = await Bun.file("test/fixtures/czn/anniversary-mail-2026-10-28.json").json() as {
  sourceUrl: string; schedule: Array<{ id: string; delivery: string; claimEnd: string; exception: boolean }>;
};
const reviewed = materializeReviewedBatch(await Bun.file("data/reviewed/czn.json").json()).events;
const ids = new Set(evidence.schedule.map(r => r.id));
const gifts = reviewed.filter(e => ids.has(e.id));

test("six future ordinary gifts and two still-claimable exceptions use the published UTC table without a duplicate parent", () => {
  expect(gifts).toHaveLength(8);
  expect(ids.size).toBe(8);
  for (const row of evidence.schedule) {
    const e = gifts.find(e => e.id === row.id)!;
    expect(e).toMatchObject({ startsAt: row.delivery, startPrecision: "exact", endsAt: row.claimEnd,
      endPrecision: "exact", regionScoped: false, regionEnds: null, sourceUrl: evidence.sourceUrl,
      sourceId: "reviewed-czn", provenanceStatus: "official", extractionMethod: "manual", confidence: 1 });
    expect(e.firstSeenAt).toBe(e.updatedAt);
    expect(e.updatedAt >= "2026-10-28T00:00:00.000Z").toBe(true);
    expect(e.startsAt.slice(11, 16)).toBe("06:00");
    if (!row.exception) expect(Date.parse(row.claimEnd) - Date.parse(row.delivery)).toBe(24 * 3600000 - 60000);
    else expect(row.claimEnd).toBe("2026-11-30T14:59:00.000Z");
  }
  expect(gifts.filter(e => e.startsAt.startsWith("2026-10-28"))).toHaveLength(1);
  expect(gifts.some(e => e.id.endsWith(":2026-10-27"))).toBe(false);
});

test("every claim expires globally at its source minute, independent of the 18:00 daily reset", () => {
  for (const e of gifts) for (const region of Region.options) {
    assertExactBoundary(e, region, e.endsAt!);
    expect(new Date(dayStartMs("2026-10-29", region, "czn")).toISOString()).toBe("2026-10-29T18:00:00.000Z");
  }
  const last = gifts.find(e => e.id.endsWith(":2026-11-03"))!;
  expect(last.endsAt).toBe("2026-11-04T05:59:00.000Z");
  const now = Date.parse("2026-11-04T06:00:00Z");
  expect(clockFor(last, "asia", now).ended).toBe(true);
  expect(clockFor(last, "asia", now).upcoming).toBe(false);
  for (const e of gifts.filter(e => e.id.includes("sticker") || e.id.includes("background"))) {
    expect(clockFor(e, "america", now).live).toBe(true);
  }
});

test("healthy banner-only source cannot remove reviewed gifts, alter old winners or duplicate claims", async () => {
  const parsed = parsePrydwenCzn(await Bun.file("snapshots/czn-prydwen-banners.html").text(), {
    now: "2026-10-28T12:00:00.000Z", sourceId: "czn-prydwen-banners", game: "czn",
    sourceUrl: "https://www.prydwen.gg/chaos-zero-nightmare/banners" });
  expect(parsed.length).toBeGreaterThan(0);
  expect(parsed.every(e => e.type === "banner")).toBe(true);
  const before = mergeEvents([reviewed.filter(e => !ids.has(e.id)), parsed]);
  const after = mergeEvents([reviewed, parsed, gifts]);
  expect(after.conflicts).toEqual(before.conflicts);
  expect(after.events.filter(e => !ids.has(e.id))).toEqual(before.events);
  expect(after.events).toHaveLength(before.events.length + 8);
  for (const e of gifts) expect(after.events.find(p => p.id === e.id)).toEqual(e);
});

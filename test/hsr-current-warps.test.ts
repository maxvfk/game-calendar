import { expect, test } from "bun:test";
import { materializeReviewedBatch } from "../src/ingest/reviewed.ts";
import { parseKqmHsrNews } from "../src/ingest/parsers/kqm-hsrnews.ts";
import { mergeEvents } from "../src/ingest/merge.ts";
import { Region } from "../src/shared/schema.ts";
import { clockFor } from "../src/shared/time.ts";
import { assertExactBoundary } from "./helpers/verified-records.tsx";

const batch = await Bun.file("data/reviewed/hsr.json").json();
const reviewed = materializeReviewedBatch(batch).events;
const url = "https://www.hoyolab.com/article/47142215";
const warps = reviewed.filter(e => e.sourceUrl === url);
const ends = { asia: "2026-11-10T07:00:00.000Z", europe: "2026-11-10T14:00:00.000Z", america: "2026-11-10T20:00:00.000Z" };

test("four live Warp identities keep Pearl/Colors continuous across phases and Light Cones separate", () => {
  expect(warps.map(e => [e.id, e.recognitionSubjects])).toEqual([
    ["hsr:an-ocean-in-a-pearl:2026-09-28", ["Pearl"]],
    ["hsr:brilliant-fixation-colors-for-tomorrow:2026-09-28", ["Colors for Tomorrow"]],
    ["hsr:now-i-am-become-blade:2026-10-21", ["Mortenax Blade"]],
    ["hsr:bygone-reminiscence-reforged-in-hellfire:2026-10-21", ["Reforged in Hellfire"]],
  ]);
  for (const e of warps) {
    expect(e).toMatchObject({ game: "hsr", type: "banner", startPrecision: "day", endPrecision: "exact",
      regionScoped: true, regionEnds: ends, sourceId: "reviewed-hsr", provenanceStatus: "official", extractionMethod: "manual" });
    expect(e.firstSeenAt).toBe(e.updatedAt);
    expect(e.updatedAt > batch.reviewedAt).toBe(true);
    expect(clockFor(e, "asia", Date.parse("2026-10-19T12:00:00Z")).upcoming).toBe(e.startsAt.startsWith("2026-10-21"));
  }
  for (const subject of ["Pearl", "Colors for Tomorrow"]) expect(reviewed.filter(e => e.recognitionSubjects?.includes(subject))).toHaveLength(1);
});

test("fixed HSR server expiry differs by region and never remains upcoming after historical cutoff", () => {
  for (const e of warps) for (const region of Region.options) assertExactBoundary(e, region, ends[region]);
  for (const e of warps) {
    const now = Date.parse("2026-11-10T08:00:00Z");
    expect(clockFor(e, "asia", now).ended).toBe(true);
    expect(clockFor(e, "asia", now).upcoming).toBe(false);
    expect(clockFor(e, "europe", now).live).toBe(true);
    expect(clockFor(e, "america", now).live).toBe(true);
  }
});

test("healthy eight-event KQM index lacks Warps; reviewed priority retains them once without other changes", async () => {
  const auto = parseKqmHsrNews(await Bun.file("snapshots/hsr-kqm-hsrnews.md").text(), {
    now: "2026-10-28T12:00:00.000Z", game: "hsr", sourceId: "hsr-kqm-hsrnews", sourceUrl: "https://api.github.com/repos/KQM-git/HSRNews/contents/readme.md" });
  expect(auto).toHaveLength(8);
  expect(auto.some(e => e.type === "banner")).toBe(false);
  const ids = new Set(warps.map(e => e.id));
  const baseline = mergeEvents([auto, reviewed.filter(e => !ids.has(e.id))]);
  for (const groups of [[auto, reviewed], [reviewed, auto], [reviewed, auto, warps]]) {
    const merged = mergeEvents(groups);
    expect(merged.events.filter(e => !ids.has(e.id))).toEqual(baseline.events);
    expect(merged.conflicts).toEqual(baseline.conflicts);
    for (const e of warps) expect(merged.events.filter(m => m.id === e.id)).toEqual([e]);
  }
});

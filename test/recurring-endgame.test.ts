import { expect, test } from "bun:test";
import { RESET_RULES, cznMaintenanceBoundary, fixedResetCycles, greatRiftWeeklyRewards, missingLightwardPhase, recurringEndgame } from "../src/ingest/recurring-endgame.ts";
import { materializeReviewedBatch } from "../src/ingest/reviewed.ts";
import { effectiveEnd } from "../src/shared/time.ts";

const now = "2026-09-24T14:00:00.000Z";
const cycles = recurringEndgame(now);
const by = (game: string, id: string) => cycles.find(e => e.game === game && e.id === id)!;

test("monthly Genshin cycles handle October and February without 30-day projection", () => {
  const abyss = by("genshin", "genshin:spiral-abyss-september-2026-season:2026-09-16");
  expect(effectiveEnd(abyss, "asia")).toBe("2026-10-15T19:59:00.000Z");
  expect(effectiveEnd(abyss, "europe")).toBe("2026-10-16T02:59:00.000Z");
  expect(effectiveEnd(abyss, "america")).toBe("2026-10-16T08:59:00.000Z");
  const theater = by("genshin", "genshin:imaginarium-theater-october-2026-season:2026-10-01");
  expect(effectiveEnd(theater, "asia")).toBe("2026-10-31T19:59:00.000Z");
  const rules = RESET_RULES.filter(r => r.game === "genshin");
  const feb = rules.flatMap(r => fixedResetCycles(r, "2028-02-20T00:00:00.000Z"));
  expect(feb.find(e => e.id === "genshin:imaginarium-theater-february-2028-season:2028-02-01")?.endsAt)
    .toBe("2028-02-29T19:59:00.000Z");
  expect(feb.find(e => e.id === "genshin:spiral-abyss-february-2028-season:2028-02-16")?.endsAt)
    .toBe("2028-03-15T19:59:00.000Z");
  expect(feb.every(e => e.startsAt >= "2024-08-01")).toBe(true); // launch-season exception
  expect(cycles.every(e => !/Stygian|Disturbance/.test(e.title))).toBe(true);
});

test("independent WuWa 28-day rules alternate with exact server-region deadlines", () => {
  const tower = by("wuwa", "wuwa:tower-of-adversity-hazard-zone:2026-09-14");
  expect(tower.regionEnds).toEqual({ asia: "2026-10-11T19:59:00.000Z", europe: "2026-10-12T02:59:00.000Z", america: "2026-10-12T08:59:00.000Z" });
  const wastes = by("wuwa", "wuwa:whimpering-wastes-respawning-waters:2026-08-31");
  expect(wastes.regionEnds).toEqual({ asia: "2026-09-27T19:59:00.000Z", europe: "2026-09-28T02:59:00.000Z", america: "2026-09-28T08:59:00.000Z" });
  expect(by("wuwa", "wuwa:whimpering-wastes-respawning-waters:2026-09-28").endsAt)
    .toBe("2026-10-25T19:59:00.000Z");
  expect(cycles.some(e => /Forbidden Waters|Endstate Matrix/.test(e.title))).toBe(false);
  expect(cycles.length).toBeLessThan(30);
});

test("later effective rule cannot rewrite earlier cycles", () => {
  const old = RESET_RULES.find(r => r.mode === "tower")!;
  const changed = { ...old, anchorDay: "2026-10-12", effectiveFrom: "2026-10-12", resetHour: 5 };
  const before = fixedResetCycles(old, now, [old, changed]);
  const after = fixedResetCycles(changed, now, [old, changed]);
  expect(before.find(e => e.id.endsWith("2026-09-14"))?.endsAt).toBe("2026-10-11T19:59:00.000Z");
  expect(before.some(e => e.id.endsWith("2026-10-12"))).toBe(false);
  expect(after.find(e => e.id.endsWith("2026-10-12"))?.endsAt).toBe("2026-11-08T20:59:00.000Z");
});

test("published October Theater ID survives exact deadline enrichment", async () => {
  const reviewed = materializeReviewedBatch(await Bun.file("data/reviewed/genshin.json").json()).events;
  const row = reviewed.find(e => e.title === "Imaginarium Theater — October 2026 Season")!;
  expect(row.id).toBe("genshin:imaginarium-theater-october-2026-season:2026-10-01");
  expect(row.endsAt).toBe(by("genshin", row.id).endsAt);
  expect(row.firstSeenAt).toBe("2026-09-21T19:31:13.000Z");
});

test("2025 ZZZ anchors conflict with current sourced dates, so no unsafe rows are generated", () => {
  const historicalShiyu = "2025-01-03";
  const historicalDeadly = "2025-01-10";
  const differenceInDays = (a: string, b: string) => (Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000;
  expect(differenceInDays(historicalShiyu, "2026-09-18") % 14).toBe(7);
  expect(differenceInDays(historicalDeadly, "2026-09-11") % 14).toBe(7);
  expect(cycles.every(e => e.game !== "zzz")).toBe(true);
});

test("sourced correction freezes a reset mode until its rule is re-anchored", () => {
  const corrected = { ...by("wuwa", "wuwa:tower-of-adversity-hazard-zone:2026-09-14"), endsAt: "2026-10-11T20:59:00.000Z" };
  const safe = recurringEndgame(now, RESET_RULES, [corrected]);
  expect(safe.some(e => e.id === corrected.id)).toBe(true); // explicit collision remains visible to merge review
  expect(safe.some(e => e.sourceId === corrected.sourceId && e.id !== corrected.id)).toBe(false);
  expect(safe.some(e => e.sourceId === "recurring-wuwa-wastes")).toBe(true);
});

test("CZN maintenance clock is effective-dated and a specific notice overrides it", () => {
  expect(cznMaintenanceBoundary("2026-07-08")).toBeNull();
  expect(cznMaintenanceBoundary("2026-07-29")).toBe("2026-07-29T00:00:00.000Z");
  expect(cznMaintenanceBoundary("2026-09-30")).toBe("2026-09-30T00:00:00.000Z");
  expect(cznMaintenanceBoundary("2026-09-30", "2026-09-30T01:00:00.000Z")).toBe("2026-09-30T01:00:00.000Z");
});

test("CZN weekly rewards stop inside the sourced phase; season and Basin IDs remain stable", async () => {
  const reviewed = materializeReviewedBatch(await Bun.file("data/reviewed/czn.json").json()).events;
  const rift = reviewed.find(e => e.title === "The Great Rift: Season 4 Second Half")!;
  const basin = reviewed.find(e => e.title === "Basin of Hyperspace: Dimensional Twilight")!;
  expect(rift.id).toBe("czn:the-great-rift-season-4-second-half:2026-09-09");
  expect(basin.id).toBe("czn:basin-of-hyperspace-dimensional-twilight:2026-09-09");
  expect(rift.endPrecision).toBe("exact");
  expect(basin.endPrecision).toBe("exact");
  expect(rift.endsAt).toBe(cznMaintenanceBoundary("2026-09-30"));
  const weekly = greatRiftWeeklyRewards(rift, now);
  expect(weekly.map(e => e.endsAt)).toEqual(["2026-09-20T18:00:00.000Z", "2026-09-27T18:00:00.000Z"]);
  expect(weekly.every(e => e.endsAt! < rift.endsAt! && e.type === "challenge")).toBe(true);
  expect(greatRiftWeeklyRewards({ ...rift, endsAt: null, endPrecision: "unknown" }, now)).toEqual([]);
  const full = reviewed.find(e => e.title === "Full-Scale Offensive — Season 4")!;
  expect(full.startsAt).toBe("2026-08-19T00:00:00.000Z");
  expect(full.endsAt).toBeNull();
  expect(cycles.every(e => e.game !== "czn")).toBe(true); // no future season generator
});

test("HSR expectation flags the due MoC without minting any unsourced boundary", async () => {
  const hsr = materializeReviewedBatch(await Bun.file("data/reviewed/hsr.json").json()).events;
  expect(missingLightwardPhase(now, hsr)).toContain("Memory of Chaos expected");
  expect(missingLightwardPhase(now, [...hsr, { ...hsr.find(e => e.title.startsWith("Memory of Chaos:"))!, startsAt: "2026-09-28T00:00:00.000Z" }])).toBeNull();
  expect(hsr.find(e => e.title === "Anomaly Arbitration: Return of the Legion")?.endsAt).toBeNull();
  expect(hsr.find(e => e.title === "Memory of Chaos: Stormcleanse")?.regionScoped).toBe(false);
  expect(hsr.find(e => e.title === "Memory of Chaos: Stormcleanse")?.endsAt).toBe("2026-09-27T22:00:00.000Z");
  expect(hsr.find(e => e.title === "Apocalyptic Shadow: Celestial Lupine")?.regionEnds?.europe).toBe("2026-10-05T02:59:00.000Z");
  expect(hsr.find(e => e.title === "Pure Fiction: Domain Genesis")?.regionEnds?.america).toBe("2026-10-19T08:59:00.000Z");
  expect(hsr.some(e => e.title.startsWith("Currency Wars") && e.endsAt !== null)).toBe(false);
  expect(cycles.every(e => e.game !== "hsr")).toBe(true);
});

test("source-controlled challenge deadlines are regional or unknown as published", async () => {
  const load = async (game: string) => materializeReviewedBatch(await Bun.file(`data/reviewed/${game}.json`).json()).events;
  const endfield = await load("endfield");
  const c1 = endfield.find(e => e.title.endsWith("Cycle I"))!;
  const c2 = endfield.find(e => e.title.endsWith("Cycle II"))!;
  expect(c1.regionEnds?.asia).toBe("2026-09-30T19:59:00.000Z");
  expect(c2.regionEnds?.america).toBe("2026-10-08T08:59:00.000Z");
  expect(endfield.find(e => e.title === "Monumental Etching: Shadow Marked")?.regionEnds?.europe).toBe("2026-10-19T08:59:00.000Z");
  expect(endfield.some(e => e.title.endsWith("Cycle III"))).toBe(false);
  const genshin = await load("genshin");
  expect(genshin.find(e => e.title.includes("Disturbance Outbreak"))?.regionEnds?.asia).toBe("2026-10-09T19:59:00.000Z");
  const wuwa = await load("wuwa");
  expect(wuwa.find(e => e.title.startsWith("Endstate Matrix"))?.endsAt).toBe("2026-09-29T19:59:00.000Z");
  expect(cycles.every(e => !/Endstate Matrix|Stygian|Monumental|Arbitration/.test(e.title))).toBe(true);
});

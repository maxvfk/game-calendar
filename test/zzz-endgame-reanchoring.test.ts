import { expect, test } from "bun:test";
import { RESET_RULES, fixedResetCycles, recurringEndgame, type ResetRule } from "../src/ingest/recurring-endgame.ts";
import { mergeEvents } from "../src/ingest/merge.ts";
import { materializeReviewedBatch } from "../src/ingest/reviewed.ts";
import { GachaEvent } from "../src/shared/schema.ts";

const NOW = "2026-10-27T11:00:00.000Z";
const DAY = 86_400_000;
const shiyu = RESET_RULES.find(r => r.game === "zzz" && r.mode === "shiyu-critical-node")!;
const deadly = RESET_RULES.find(r => r.game === "zzz" && r.mode === "deadly-assault")!;
const zzz = (now = NOW, rules: readonly ResetRule[] = RESET_RULES, sourced: GachaEvent[] = []) =>
  recurringEndgame(now, rules, sourced).filter(e => e.game === "zzz");
const rows = zzz();
const currentShiyu = rows.find(e => e.startsAt.startsWith("2026-10-16"))!;
const currentDeadly = rows.find(e => e.startsAt.startsWith("2026-10-23"))!;
const days = (a: string, b: string) => (Date.parse(b) - Date.parse(a)) / DAY;

test("per-mode evidence gates use distinct provenance and effective dates, never obsolete anchors", () => {
  expect(shiyu).toMatchObject({ anchorDay: "2026-01-09", effectiveFrom: "2026-10-16", resetHour: 4,
    cadence: { days: 14 }, provenanceStatus: "estimated", sourceUrl: "https://zenless.hoyoverse.com/en-us/news/161728" });
  expect(deadly).toMatchObject({ anchorDay: "2026-01-16", effectiveFrom: "2026-10-23", resetHour: 4,
    cadence: { days: 14 }, provenanceStatus: "estimated", sourceUrl: "https://labz55.com/zzzteamforge/en/deadly-assault" });
  expect(days("2025-01-03", "2026-09-18") % 14).toBe(7);
  expect(days("2025-01-10", "2026-09-11") % 14).toBe(7);
  expect(RESET_RULES.filter(r => r.game === "zzz")).toHaveLength(2);
  expect(rows.every(e => e.provenanceStatus === "estimated" && e.extractionMethod === "manual")).toBe(true);
});

for (const day of ["2026-01-09", "2026-01-23", "2026-09-18", "2026-10-02", "2026-10-16", "2026-10-30"]) {
  test(`Shiyu official transition chronology: ${day}`, () => {
    expect(days(shiyu.anchorDay, day) % 14).toBe(0);
    expect(fixedResetCycles({ ...shiyu, effectiveFrom: shiyu.anchorDay }, `${day}T12:00:00.000Z`).some(e => e.startsAt.startsWith(day))).toBe(true);
  });
}

test("Deadly January/September observations match the accepted October phase without generating unverified history", () => {
  for (const day of ["2026-01-16", "2026-01-30", "2026-09-11", "2026-09-25", "2026-10-23", "2026-11-06"]) {
    expect(days(deadly.anchorDay, day) % 14).toBe(0);
  }
  expect(fixedResetCycles(deadly, "2026-01-16T12:00:00.000Z")).toEqual([]);
  expect(fixedResetCycles(deadly, NOW).every(e => e.startsAt >= "2026-10-23")).toBe(true);
});

test("ongoing Shiyu older than seven days is retained; current and next deadlines are region-exact", () => {
  expect(days(currentShiyu.startsAt, NOW)).toBeGreaterThan(7);
  expect(currentShiyu).toMatchObject({ id: "zzz:shiyu-defense-critical-node-oct-16:2026-10-16",
    title: "Shiyu Defense: Critical Node (Oct 16)", startPrecision: "day", endPrecision: "exact", regionScoped: true,
    regionEnds: { asia: "2026-10-29T19:59:00.000Z", europe: "2026-10-30T02:59:00.000Z", america: "2026-10-30T08:59:00.000Z" } });
  expect(currentDeadly).toMatchObject({ id: "zzz:deadly-assault-oct-23:2026-10-23",
    regionEnds: { asia: "2026-11-05T19:59:00.000Z", europe: "2026-11-06T02:59:00.000Z", america: "2026-11-06T08:59:00.000Z" } });
  expect(rows.find(e => e.id === "zzz:shiyu-defense-critical-node-oct-30:2026-10-30")?.regionEnds?.europe).toBe("2026-11-13T02:59:00.000Z");
  expect(rows.find(e => e.id === "zzz:deadly-assault-nov-6:2026-11-06")?.regionEnds?.america).toBe("2026-11-20T08:59:00.000Z");
});

test("ZZZ live inclusion lasts through America deadline; expired rows do not use other games' lookback", () => {
  const id = currentShiyu.id;
  expect(zzz("2026-10-30T08:59:00.000Z").some(e => e.id === id)).toBe(true);
  expect(zzz("2026-10-30T09:00:00.000Z").some(e => e.id === id)).toBe(false);
  expect(zzz("2026-10-30T09:00:00.000Z").some(e => e.id.endsWith(":2026-10-30"))).toBe(true);
  expect(rows.some(e => e.startsAt.startsWith("2026-10-09"))).toBe(false);
});

test("14-day steps, bounded 70-day start horizon and year rollover preserve distinct completion IDs", () => {
  expect(rows).toHaveLength(12);
  expect(new Set(rows.map(e => e.id)).size).toBe(rows.length);
  for (const rule of [shiyu, deadly]) {
    const series = rows.filter(e => e.sourceId === `recurring-zzz-${rule.mode}`);
    for (let i = 1; i < series.length; i++) expect(days(series[i-1]!.startsAt, series[i]!.startsAt)).toBe(14);
    expect(series.every(e => Date.parse(e.startsAt) <= Date.parse(NOW) + 70 * DAY)).toBe(true);
    expect(series.every(e => Date.parse(e.regionEnds!.america!) >= Date.parse(NOW))).toBe(true);
  }
  expect(rows.some(e => e.id === "zzz:deadly-assault-jan-1:2027-01-01")).toBe(true);
  const year = zzz("2026-12-31T12:00:00.000Z");
  expect(year.some(e => e.id === "zzz:shiyu-defense-critical-node-dec-25:2026-12-25")).toBe(true);
  expect(year.some(e => e.id === "zzz:shiyu-defense-critical-node-jan-8:2027-01-08")).toBe(true);
});

test("all 32 existing reviewed fields/IDs survive; equal projections never inflate confidence", async () => {
  const reviewed = materializeReviewedBatch(await Bun.file("data/reviewed/zzz.json").json()).events;
  expect(reviewed).toHaveLength(32);
  for (const now of ["2026-09-24T12:00:00.000Z", NOW]) {
    const projections = zzz(now);
    for (const groups of [[reviewed, projections], [projections, reviewed]]) {
      const merged = mergeEvents(groups);
      expect(merged.conflicts).toEqual([]);
      expect(new Set(merged.events.map(e => e.id)).size).toBe(merged.events.length);
      for (const row of reviewed) expect(merged.events.find(e => e.id === row.id)).toEqual(row);
    }
  }
  const historicalShiyu = fixedResetCycles({ ...shiyu, effectiveFrom: shiyu.anchorDay }, "2026-09-24T12:00:00.000Z").find(e => e.startsAt.startsWith("2026-09-18"))!;
  const oldRow = reviewed.find(e => e.id === historicalShiyu.id)!;
  for (const groups of [[[historicalShiyu], [oldRow]], [[oldRow], [historicalShiyu]]]) {
    expect(mergeEvents(groups).events).toEqual([oldRow]);
  }
  expect(historicalShiyu.id).toBe("zzz:shiyu-defense-critical-node-sep-18:2026-09-18");
  expect(reviewed.find(e => e.title.startsWith("Deadly Assault"))?.id).toBe("zzz:deadly-assault-sep-11:2026-09-11");
});

test("estimated one-minute regional contradiction is visible, sourced row wins, only that mode freezes", () => {
  const observed = GachaEvent.parse({ ...currentShiyu, sourceId: "reviewed-zzz", confidence: 0.6,
    sourceUrl: "https://example.test/explicit-correction", regionEnds: { ...currentShiyu.regionEnds!, europe: "2026-10-30T03:00:00.000Z" } });
  const safe = recurringEndgame(NOW, RESET_RULES, [observed]);
  expect(safe.filter(e => e.sourceId === currentShiyu.sourceId).map(e => e.id)).toEqual([currentShiyu.id]);
  expect(safe.some(e => e.sourceId === currentDeadly.sourceId)).toBe(true);
  for (const groups of [[[observed], safe], [safe, [observed]]]) {
    const merged = mergeEvents(groups);
    expect(merged.events.find(e => e.id === observed.id)).toEqual(observed);
    expect(merged.conflicts).toHaveLength(1);
    expect(merged.conflicts[0]).toMatchObject({ field: "endsAt", region: "europe", kept: observed, deltaHours: 1/60 });
  }
});

test("new verified effective rule supersedes/frees only its future cycles; old source conflict remains", () => {
  const changed: ResetRule = { ...shiyu, anchorDay: "2026-10-30", effectiveFrom: "2026-10-30", resetHour: 5 };
  const rules = [...RESET_RULES, changed];
  expect(fixedResetCycles(shiyu, NOW, rules).map(e => e.id)).toEqual([currentShiyu.id]);
  const future = fixedResetCycles(changed, NOW, rules);
  expect(future[0]?.id).toBe("zzz:shiyu-defense-critical-node-oct-30:2026-10-30");
  expect(future[0]?.regionEnds?.europe).toBe("2026-11-13T03:59:00.000Z");
  expect(fixedResetCycles(shiyu, NOW, rules)[0]?.regionEnds).toEqual(currentShiyu.regionEnds);
  const corrected = { ...currentShiyu, sourceId: "reviewed-zzz", endsAt: "2026-10-29T20:00:00.000Z" };
  const safe = recurringEndgame(NOW, rules, [corrected]);
  expect(safe.some(e => e.id === future[0]!.id)).toBe(true);
  expect(mergeEvents([[corrected], safe]).conflicts).toHaveLength(1);
});

test("other recurring schedules, events and conflicts are byte-identical after adding the two ZZZ rules", () => {
  const legacyRules = RESET_RULES.filter(r => r.game !== "zzz");
  const legacy = recurringEndgame(NOW, legacyRules);
  const all = recurringEndgame(NOW);
  expect(JSON.stringify(all.filter(e => e.game !== "zzz"))).toBe(JSON.stringify(legacy));
  const combined = mergeEvents([all]);
  expect(mergeEvents([legacy])).toEqual({ ...combined, events: combined.events.filter(e => e.game !== "zzz") });
  expect(rows.every(e => /recurring-zzz-(shiyu-critical-node|deadly-assault)$/.test(e.sourceId))).toBe(true);
  expect(rows.some(e => /Periodic|Threshold|Annihilation/.test(e.title))).toBe(false);
});

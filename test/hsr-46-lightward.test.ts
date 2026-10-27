import { expect, test } from "bun:test";
import { adapterById } from "../src/ingest/adapters/index.ts";
import { mergeEvents } from "../src/ingest/merge.ts";
import { parseKqmHsrNews } from "../src/ingest/parsers/kqm-hsrnews.ts";
import { materializeReviewedBatch } from "../src/ingest/reviewed.ts";
import { eventId } from "../src/shared/schema.ts";
import { clockFor, effectiveEnd } from "../src/shared/time.ts";

const raw = await Bun.file("fixtures/hsr/kqm-hsrnews-4.6-lightward-2026-10-27.md").text();
const ctx = {
  now: "2026-10-28T00:00:00.000Z", game: "hsr" as const,
  sourceId: "hsr-kqm-hsrnews",
  sourceUrl: "https://api.github.com/repos/KQM-git/HSRNews/contents/readme.md",
};
const windows = [
  ["Memory of Chaos: Crossing the Afterlife", "2026-09-28", "2026-11-01", "2026-11-02"],
  ["Apocalyptic Shadow: Dominance of Oblivion", "2026-10-05", "2026-11-15", "2026-11-16"],
  ["Pure Fiction: Imagined Words", "2026-10-19", "2026-11-29", "2026-11-30"],
  ["Memory of Chaos: Survival of the Fittest", "2026-11-02", "2026-12-13", "2026-12-14"],
] as const;

test("actual 4.6 notice excerpt yields exactly four distinct explicit Lightward windows", () => {
  const events = parseKqmHsrNews(raw, ctx);
  expect(events).toHaveLength(4);
  expect(new Set(events.map(e => e.id)).size).toBe(4);
  for (const [title, start, asiaDay, otherDay] of windows) {
    expect(events.find(e => e.title === title)).toMatchObject({
      id: eventId("hsr", title, `${start}T00:00:00.000Z`),
      startsAt: `${start}T00:00:00.000Z`, startPrecision: "day", type: "challenge",
      endsAt: `${asiaDay}T19:59:00.000Z`, endPrecision: "exact", regionScoped: true,
      regionEnds: {
        asia: `${asiaDay}T19:59:00.000Z`, europe: `${otherDay}T02:59:00.000Z`,
        america: `${otherDay}T08:59:00.000Z`,
      },
      sourceId: ctx.sourceId, extractionMethod: "parser",
      sourceUrl: "https://github.com/KQM-git/HSRNews/blob/master/archive/1437.md",
    });
  }
});

test("regional clocks retain active MoC until each exact Nov 2 server deadline", () => {
  const events = adapterById(ctx.sourceId)!.parse(raw, ctx);
  const current = events.find(e => e.title === windows[0][0])!;
  const next = events.find(e => e.title === windows[3][0])!;
  for (const region of ["asia", "europe", "america"] as const) {
    expect(clockFor(current, region, Date.parse(ctx.now)).live).toBe(true);
    expect(clockFor(next, region, Date.parse(ctx.now)).upcoming).toBe(true);
    const deadline = Date.parse(effectiveEnd(current, region)!);
    expect(clockFor(current, region, deadline - 1).live).toBe(true);
    expect(clockFor(current, region, deadline + 1).ended).toBe(true);
    expect(clockFor(next, region, Date.parse("2026-11-02T12:00:00.000Z")).live).toBe(true);
  }
});

test("duplicate articles deduplicate; contradictory phase deadlines stop extraction", () => {
  expect(parseKqmHsrNews(`${raw}\n${raw}`, ctx)).toHaveLength(4);
  expect(() => parseKqmHsrNews(`${raw}\n${raw.replace("2026/11/02 03:59:00", "2026/11/02 04:00:00")}`, ctx))
    .toThrow("conflicting duplicate");
});

test("Lightward periods fail closed without borrowing clocks from prose or the next phase", () => {
  const period = "After the Version 4.6 update – 2026/11/02 03:59:00 (server)";
  for (const replacement of [
    "", "Duration: 5 weeks", period.replace("(server)", ""),
    `${period} – 2026/11/03 03:59:00 (server)`,
    `${period}\n${period.replace("2026/11/02", "2026/11/03")}`,
    period.replace("Version 4.6", "Version 4.7"),
    period.replace("2026/11/02", "2026/02/30"),
    period.replace("2026/11/02", "2026/09/01"),
  ]) {
    expect(() => parseKqmHsrNews(raw.replace(period, replacement), ctx)).toThrow();
  }
  expect(() => parseKqmHsrNews(raw.replace(/^Begins at .*$/m, "Maintenance schedule pending."), ctx))
    .toThrow("Lightward period");
  const exact = "2026/10/05 04:00:00 (server) – 2026/11/16 03:59:00 (server)";
  expect(() => parseKqmHsrNews(raw.replace(exact, ""), ctx)).toThrow("Lightward period");
});

test("Lightward parsing keeps global boundaries independent of server boundaries", () => {
  const changed = raw.replace("2026/11/02 03:59:00 (server)", "2026/11/02 03:59:00 (global)")
    .replace("2026/10/05 04:00:00 (server)", "2026/10/05 04:00:00 (global)");
  const events = parseKqmHsrNews(changed, ctx);
  expect(events.find(e => e.title === windows[0][0])).toMatchObject({
    startsAt: "2026-09-28T00:00:00.000Z", startPrecision: "day",
    endsAt: "2026-11-01T19:59:00.000Z", regionScoped: false, regionEnds: null,
  });
  expect(events.find(e => e.title === windows[1][0])).toMatchObject({
    startsAt: "2026-10-04T20:00:00.000Z", startPrecision: "exact",
    endsAt: "2026-11-15T19:59:00.000Z", regionScoped: true,
  });
});

test("full notice mode matching stops at Gameplay/Lightward section boundaries", () => {
  const decoy = "- Memory of Chaos: Unannounced\n2026/12/14 04:00:00 (server) – 2027/01/25 03:59:00 (server)\n";
  const shadow = decoy.replace("Memory of Chaos", "Apocalyptic Shadow");
  const changed = raw.replace("■ Gameplay", `${decoy}\n■ Gameplay`)
    .replace('"Treasures Lightward":', `${shadow}\n"Treasures Lightward":`)
    .replace("■ Stage", `■ Stage\n${decoy}\n${shadow}`);
  expect(parseKqmHsrNews(changed, ctx)).toEqual(parseKqmHsrNews(raw, ctx));
  for (const changed of [raw.replace("7. Others", "8. Changes"), raw.replace("■ Gameplay", "■ System")]) {
    expect(() => parseKqmHsrNews(changed, ctx)).toThrow("no dated calendar notices");
  }
});

test("legacy 4.5 reviewed winners and IDs coexist unchanged with the four 4.6 phases", async () => {
  const reviewed = materializeReviewedBatch(await Bun.file("data/reviewed/hsr.json").json()).events;
  const oldRaw = await Bun.file("fixtures/hsr/kqm-hsrnews-2026-09-23.md").text();
  const oldAuto = adapterById(ctx.sourceId)!.parse(oldRaw, ctx);
  const previous = mergeEvents([reviewed, oldAuto]);
  const result = mergeEvents([reviewed, oldAuto, adapterById(ctx.sourceId)!.parse(raw, ctx)]);
  expect(result.conflicts).toEqual(previous.conflicts);
  expect(result.events).toHaveLength(previous.events.length + 4);
  for (const winner of previous.events) expect(result.events.find(e => e.id === winner.id)).toEqual(winner);
  expect(new Set(result.events.map(e => e.id)).size).toBe(result.events.length);
  expect(result.events.find(e => e.title === "Memory of Chaos: Stormcleanse")).toMatchObject({
    endsAt: "2026-09-27T22:00:00.000Z", regionScoped: false, regionEnds: null,
  });
});

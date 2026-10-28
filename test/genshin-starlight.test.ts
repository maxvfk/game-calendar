import { expect, test } from "bun:test";
import { adapterById } from "../src/ingest/adapters/index.ts";
import { parseKqmGinNews } from "../src/ingest/parsers/kqm-ginews.ts";
import { materializeReviewedBatch } from "../src/ingest/reviewed.ts";
import { mergeEvents } from "../src/ingest/merge.ts";
import { Region } from "../src/shared/schema.ts";
import { clockFor } from "../src/shared/time.ts";
import { assertExactBoundary } from "./helpers/verified-records.tsx";

const ctx = { now: "2026-10-28T09:40:00.000Z", sourceId: "genshin-kqm-ginews", game: "genshin" as const,
  sourceUrl: "https://api.github.com/repos/KQM-git/GINews/contents/readme.md" };
const raw = await Bun.file("test/fixtures/genshin/starlight-voyage-2026-10-28.md").text();
const snapshot = await Bun.file("snapshots/genshin-kqm-ginews.md").text();
const mainId = "genshin:starlight-voyage-heart-unbound:2026-10-19";
const questId = "genshin:quest-completion-period-starlight-voyage-heart-unbound:2026-10-19";
const ids = [mainId, questId];
const ends: Record<string, Record<Region, string>> = {
  [mainId]: { asia: "2026-11-01T19:59:00.000Z", europe: "2026-11-02T02:59:00.000Z", america: "2026-11-02T08:59:00.000Z" },
  [questId]: { asia: "2026-10-28T20:00:00.000Z", europe: "2026-10-29T03:00:00.000Z", america: "2026-10-29T09:00:00.000Z" },
};
const automatic = adapterById(ctx.sourceId)!.parse(raw, ctx);
const reviewed = materializeReviewedBatch(await Bun.file("data/reviewed/genshin.json").json()).events;
const restored = reviewed.filter(e => ids.includes(e.id));

test("stored Starlight notice emits exactly two server-local deadlines without a fabricated exact start", () => {
  expect(snapshot).toContain(raw.trim());
  expect(automatic.map(e => e.id).sort()).toEqual([...ids].sort());
  for (const event of automatic) {
    expect(event).toMatchObject({
      startsAt: "2026-10-19T00:00:00.000Z", startPrecision: "day",
      endsAt: ends[event.id]!.asia, endPrecision: "exact", regionScoped: true, regionEnds: ends[event.id],
      sourceUrl: "https://github.com/KQM-git/GINews/blob/master/archive/21901.md",
      sourceId: ctx.sourceId, extractionMethod: "parser", firstSeenAt: ctx.now, updatedAt: ctx.now,
    });
    // A factual third-party extraction is not independently labelled publisher provenance.
    expect(event.provenanceStatus).toBeUndefined();
  }
});

test("main and quest identities remain distinct across source order, duplicates and reviewed precedence", () => {
  expect(restored).toHaveLength(2);
  const fromSnapshot = parseKqmGinNews(snapshot, ctx);
  expect(fromSnapshot).toHaveLength(12);
  expect(fromSnapshot.filter(e => ids.includes(e.id))).toEqual(automatic);
  const before = mergeEvents([reviewed.filter(e => !ids.includes(e.id)),
    fromSnapshot.filter(e => !ids.includes(e.id))]);
  for (const groups of [[reviewed, fromSnapshot], [fromSnapshot, reviewed],
    [reviewed, [...fromSnapshot].reverse(), automatic], [restored, automatic]]) {
    const result = mergeEvents(groups);
    expect(result.conflicts).toEqual([]);
    for (const e of restored) {
      expect(e).toMatchObject({ provenanceStatus: "official", extractionMethod: "manual", confidence: 1 });
      expect(result.events.find(p => p.id === e.id)).toEqual(e);
    }
  }
  const merged = mergeEvents([reviewed, fromSnapshot]);
  expect(merged.events.filter(e => !ids.includes(e.id))).toEqual(before.events);
  expect(merged.events).toHaveLength(before.events.length + 2);
  // The reviewed fallback survives a rolling index that omits this notice.
  expect(mergeEvents([reviewed, fromSnapshot.filter(e => !ids.includes(e.id))]).events).toEqual(merged.events);
});

test("both regional deadlines expire at the exact instant in clock, details and Timeline", () => {
  for (const event of restored) for (const region of Region.options) {
    assertExactBoundary(event, region, ends[event.id]![region]);
  }
  const quest = restored.find(e => e.id === questId)!;
  const main = restored.find(e => e.id === mainId)!;
  for (const [now, expired] of [
    ["2026-10-28T20:00:00Z", ["asia"]],
    ["2026-10-29T03:00:00Z", ["asia", "europe"]],
    ["2026-10-29T09:00:00Z", ["asia", "europe", "america"]],
  ] as const) for (const region of Region.options) {
    const clock = clockFor(quest, region, Date.parse(now));
    expect(clock.ended).toBe((expired as readonly string[]).includes(region));
    expect(clock.upcoming).toBe(false);
    expect(clock.live).toBe(!clock.ended);
    expect(clockFor(main, region, Date.parse(now)).live).toBe(true);
  }
});

test("a future equivalent notice parses by explicit dates, not the archived article ID or today's clock", () => {
  const future = raw.replaceAll("21901", "99999").replaceAll("2026/", "2027/");
  const events = parseKqmGinNews(future, ctx);
  expect(events).toHaveLength(2);
  for (const event of events) {
    expect(event.id).toEndWith(":2027-10-19");
    expect(event.sourceUrl).toEndWith("/99999.md");
    expect(event.regionEnds).toEqual(Object.fromEntries(Object.entries(ends[event.id.replace("2027-", "2026-")]!)
      .map(([region, end]) => [region, end.replace("2026-", "2027-")])));
  }
  expect(parseKqmGinNews(`${raw}\n${raw}`, ctx)).toEqual(automatic);
  expect(() => parseKqmGinNews(`${raw}\n${raw.replace("2026/10/29 04:00", "2026/10/29 04:01")}`, ctx))
    .toThrow("conflicting duplicate");
});

test("known family fails closed for missing, global, yearless, invalid, duplicate or contradictory clocks", () => {
  for (const malformed of [
    raw.replace(/^Quest Completion Period:.*$/m, ""),
    raw.replace(/^Event Duration:.*$/m, ""),
    raw.replaceAll('class="t_lc"', 'class="t_gl"'),
    raw.replace("2026/10/29 04:00", "10/29 04:00"),
    raw.replace("2026/10/29 04:00", "2026/10/32 04:00"),
    raw.replace("2026/10/29 04:00", "2026/10/29 24:00"),
    raw.replace("2026/10/29 04:00", "2026/10/18 04:00"),
    raw.replace("2026/10/29 04:00", "2026/11/03 04:00"),
    raw.replace("Quest Completion Period:", `${raw.split("\n").find(s => s.startsWith("Quest Completion Period:"))}\nQuest Completion Period:`),
    raw.replace("2026/10/19 10:00</t> ~ <t class=\"t_lc\" contenteditable=\"false\">2026/10/29", "2026/10/20 10:00</t> ~ <t class=\"t_lc\" contenteditable=\"false\">2026/10/29"),
  ]) expect(() => parseKqmGinNews(malformed, ctx)).toThrow("Starlight");
  // No general Participate-in or arbitrary-tag extraction is enabled.
  const unrelated = raw.replaceAll("Starlight Voyage: Heart Unbound", "Unapproved Wonderland Event");
  expect(() => parseKqmGinNews(unrelated, ctx)).toThrow("no dated calendar notices");
  const old = parseKqmGinNews(snapshot.replace(raw.trim(), ""), ctx);
  expect(old).toHaveLength(10);
  expect(old.every(e => e.endPrecision !== "exact")).toBe(true);
});

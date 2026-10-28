import { expect, test } from "bun:test";
import { parseKqmHsrNews } from "../src/ingest/parsers/kqm-hsrnews.ts";
import { materializeReviewedBatch } from "../src/ingest/reviewed.ts";
import { mergeEvents } from "../src/ingest/merge.ts";
import { Region } from "../src/shared/schema.ts";
import { assertExactBoundary } from "./helpers/verified-records.tsx";

const raw = await Bun.file("snapshots/hsr-kqm-hsrnews.md").text();
const ctx = { game: "hsr" as const, sourceId: "hsr-kqm-hsrnews", sourceUrl: "https://api.github.com/repos/KQM-git/HSRNews/contents/readme.md", now: "2026-10-28T12:00:00.000Z" };
const parse = (s = raw) => parseKqmHsrNews(s, ctx);
const names = ["Astral Imagea Park: Astral Trendible", "Astral Imagea Park: Park Souvenir"];
const events = parse();
const rewards = events.filter(e => names.includes(e.title));
const period = "After the Version 4.6 update – 2026/11/11 06:00:00 (global)";

test("actual Availability and Claim Period restore two temporary rewards without expiring permanent Park", () => {
  expect(events).toHaveLength(10);
  expect(rewards.map(e => e.id)).toEqual(["hsr:astral-imagea-park-astral-trendible:2026-09-28", "hsr:astral-imagea-park-park-souvenir:2026-09-28"]);
  for (const e of rewards) {
    expect(e).toMatchObject({ startsAt: "2026-09-28T00:00:00.000Z", startPrecision: "day", endsAt: "2026-11-10T22:00:00.000Z",
      endPrecision: "exact", regionScoped: false, regionEnds: null, extractionMethod: "parser",
      sourceUrl: "https://github.com/KQM-git/HSRNews/blob/master/archive/1437.md" });
    expect(e.summary).toContain("Park itself remains accessible");
    expect(e.type).toBe(e.title.endsWith("Park Souvenir") ? "login" : "other");
    for (const region of Region.options) assertExactBoundary(e, region, "2026-11-10T22:00:00.000Z");
  }
  expect(events.some(e => e.title === "Astral Imagea Park" || /Astral Slammers|Warm Cotton|Lunar Blossoming/.test(e.title))).toBe(false);
});

test("known claim fields reject missing/duplicate/wrong-zone/year/version dates without borrowing adjacent content", () => {
  for (const changed of [
    raw.replace(`- Availability: ${period}`, '- Availability: After the Version 4.6 update'),
    raw.replace(`- Claim Period: ${period}`, `- Claim Period: ${period}\n- Claim Period: ${period}`),
    raw.replace(`- Claim Period: ${period}`, `- Availability: ${period}`),
    raw.replace(`- Claim Period: ${period}`, `- Claim Period: ${period.replace('(global)', '(server)')}`),
    raw.replace(`- Claim Period: ${period}`, `- Claim Period: ${period.replace('2026/', '')}`),
    raw.replace(`- Claim Period: ${period}`, `- Claim Period: ${period.replace('Version 4.6', 'Version 4.7')}`),
    raw.replace(`- Claim Period: ${period}`, `- Claim Period: ${period.replace('11/11', '02/30')}`),
    raw.replace(`- Claim Period: ${period}`, `- Claim Period: ${period.replace('06:00:00', '25:00:00')}`),
  ]) expect(() => parse(changed)).toThrow();
  const future = parse(raw.replaceAll('2026/', '2027/').replaceAll('Version 4.6', 'Version 4.7'));
  expect(future.filter(e => names.includes(e.title))).toHaveLength(2);
  expect(future.filter(e => names.includes(e.title)).every(e => e.startsAt.startsWith('2027-') && e.endsAt === '2027-11-10T22:00:00.000Z')).toBe(true);
});

test("prior eight candidates and seventeen reviewed winners survive with distinct temporary claims once", async () => {
  const baseline = parse(raw.replace('**■ Astral Imagea Park: Astral Trendible**', '**■ Unclassified temporary draw**')
    .replace('**■ Astral Imagea Park: Park Souvenir**', '**■ Unclassified temporary claim**'));
  expect(baseline).toHaveLength(8);
  expect(events.filter(e => !names.includes(e.title))).toEqual(baseline);
  const reviewed = materializeReviewedBatch(await Bun.file('data/reviewed/hsr.json').json()).events;
  expect(reviewed).toHaveLength(17);
  const before = mergeEvents([reviewed, baseline]);
  for (const groups of [[reviewed, events], [reviewed, events, rewards]]) {
    const after = mergeEvents(groups);
    expect(after.events.filter(e => !names.includes(e.title))).toEqual(before.events);
    expect(after.conflicts).toEqual(before.conflicts);
    for (const e of rewards) expect(after.events.filter(m => m.id === e.id)).toEqual([e]);
  }
});

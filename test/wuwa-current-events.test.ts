import { expect, test } from "bun:test";
import { parseWuwaKuroAtom, wuwaEventSections } from "../src/ingest/parsers/wuwa-kuro-atom.ts";
import { materializeReviewedBatch } from "../src/ingest/reviewed.ts";
import { mergeEvents } from "../src/ingest/merge.ts";
import { Region } from "../src/shared/schema.ts";
import { assertExactBoundary } from "./helpers/verified-records.tsx";

const raw = await Bun.file("snapshots/wuwa-kuro-mirror.xml").text();
const ctx = { game: "wuwa" as const, sourceId: "wuwa-kuro-mirror", sourceUrl: "https://api.github.com/repos/TheLovinator1/wutheringwaves/contents/articles_latest.xml", now: "2026-10-28T12:00:00.000Z" };
const parse = (input = raw) => parseWuwaKuroAtom(input, ctx);
const names = new Set(["Cubie Wars", "Dreams in the Capsule", "Gifts of Waking Moon", "Gifts of Singing Drizzle"]);
const events = parse();
const restored = events.filter(e => names.has(e.title));
const article = /<entry>\s*<id>urn:article:5571<\/id>[\s\S]*?<\/entry>/.exec(raw)![0];
const envelope = (entry: string) => `<feed xmlns="http://www.w3.org/2005/Atom">${entry}</feed>`;

test("actual patch title/calendar anchor, nested Cubie identity and decorated duration restore four families only", () => {
  expect(events).toHaveLength(11);
  expect(restored.map(e => e.id)).toEqual(["wuwa:cubie-wars:2026-09-30", "wuwa:dreams-in-the-capsule:2026-09-30",
    "wuwa:gifts-of-singing-drizzle:2026-10-22", "wuwa:gifts-of-waking-moon:2026-09-30"]);
  for (const e of restored) {
    expect(e).toMatchObject({ startPrecision: "day", sourceUrl: "https://wutheringwaves.kurogames.com/en/main/news/detail/5571", extractionMethod: "parser", regionScoped: true });
    expect(e.startsAt).toBe(e.title === "Gifts of Singing Drizzle" ? "2026-10-22T00:00:00.000Z" : "2026-09-30T00:00:00.000Z");
    expect(e.type).toBe(e.title.startsWith("Gifts") ? "login" : "other");
    expect(e.provenanceStatus).toBeUndefined();
    for (const region of Region.options) {
      const end = e.title === "Cubie Wars"
        ? { asia: "2026-11-11T03:59:00.000Z", europe: "2026-11-11T10:59:00.000Z", america: "2026-11-11T16:59:00.000Z" }
        : { asia: "2026-11-10T19:59:00.000Z", europe: "2026-11-11T02:59:00.000Z", america: "2026-11-11T08:59:00.000Z" };
      assertExactBoundary(e, region, end[region]);
    }
  }
  expect(events.some(e => /Special Events|Gifts of Singing Drizzle.*\[/.test(e.title))).toBe(false);
  expect(events.some(e => /Horizon of Dawnbreak|Kumokiri|Moongazer|Across Time|Back to Solaris|Waking Moon Fishing|Past Dreams/.test(e.title))).toBe(false);
  expect(wuwaEventSections(raw, ctx, true).filter(e => names.has(e.event.title)).map(e => e.event).sort((a, b) => a.id.localeCompare(b.id))).toEqual(restored);
});

test("known patch contract rejects malformed/missing/duplicate clocks and preserves explicit future year/version", () => {
  for (const changed of [
    article.replace('✦Maintenance Time:', 'Maintenance schedule:'),
    article.replace('2026-09-30 04:00', '2026-09-31 04:00'),
    article.replace('Duration: Version 3.7 Update - 2026-11-11 11:59', 'Duration: Version 3.8 Update - 2026-11-11 11:59'),
    article.replace('2026-11-11 11:59 (server time)', '2026-11-11 25:59 (server time)'),
    article.replace('✦Duration: 2026-10-22 10:00 - 2026-11-11 03:59 (server time)', '✦Duration: 2026-10-22 10:00 - 2026-11-11 03:59 (UTC+8)'),
    article.replace('Duration: Version 3.7 Update - 2026-11-11 11:59 (server time)', 'Duration: Version 3.7 Update - 2026-11-11 11:59 (server time)</li><li>Duration: Version 3.7 Update - 2026-11-11 11:59 (server time)'),
  ]) expect(() => parse(envelope(changed))).toThrow();
  const future = parse(envelope(article.replaceAll("2026", "2027").replaceAll("Version 3.7", "Version 3.8")));
  expect(future.filter(e => names.has(e.title))).toHaveLength(4);
  expect(future.every(e => e.startsAt.startsWith("2027-") && e.endsAt?.startsWith("2027-"))).toBe(true);
  const changedAnchor = article.replaceAll('2026-09-30', '2026-10-01');
  expect(() => parse(envelope(article + changedAnchor))).toThrow("conflicting Version");
  const changedEnd = article.replace('2026-11-11 11:59 (server time)', '2026-11-11 11:58 (server time)');
  expect(() => parse(envelope(article + changedEnd))).toThrow("conflicting duplicate");
});

test("all previous seven candidates/reviewed winners remain unchanged, and each restored event publishes once", async () => {
  const baseline = parse(raw.replace('Patch Notes for Wuthering Waves Version 3.7:', 'Unrecognized version patch:'));
  expect(baseline).toHaveLength(7);
  expect(events.filter(e => !names.has(e.title))).toEqual(baseline);
  const reviewed = materializeReviewedBatch(await Bun.file("data/reviewed/wuwa.json").json()).events;
  expect(reviewed).toHaveLength(12);
  const before = mergeEvents([reviewed, baseline]);
  for (const groups of [[reviewed, events], [reviewed, events, restored]]) {
    const result = mergeEvents(groups);
    expect(result.events.filter(e => !names.has(e.title))).toEqual(before.events);
    expect(result.conflicts).toEqual(before.conflicts);
    for (const e of restored) expect(result.events.filter(m => m.id === e.id)).toEqual([e]);
  }
});

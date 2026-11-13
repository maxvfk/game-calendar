import { expect, test } from "bun:test";
import { materializeReviewedBatch } from "../src/ingest/reviewed.ts";
import { mergeEvents } from "../src/ingest/merge.ts";
import { parseZzzBannerRss, ZZZ_BANNER_SOURCE_ID, ZZZ_BANNER_RSS_URL } from "../src/ingest/parsers/zzz-zenlessgg-banners.ts";
import { eventId } from "../src/shared/schema.ts";

/**
 * Version 3.3 Phase II channels and audition (reviewed, official).
 *
 * The secondary Zenless.gg feed stopped publishing new channel notices after
 * Phase I, so `zzz-zenlessgg-banners` kept an all-expired snapshot from Nov 11
 * and no current ZZZ banner was published. These rows restore Phase II from the
 * publisher's own HoYoLAB notice (author certified "ZZZ Official"). The pinned
 * fixture is a factual extract of that notice; the test derives every regional
 * end from its stated server-time period instead of trusting the rows.
 */

const notice = await Bun.file("test/fixtures/zzz/hoyolab-v3-3-phase-ii-2026-11-13.json").json() as {
  articleUrl: string; subject: string; author: { certification: string }; lines: string[];
};
const reviewed = materializeReviewedBatch(await Bun.file("data/reviewed/zzz.json").json()).events;
const phase2 = reviewed.filter(e => e.sourceUrl === notice.articleUrl);

// Fixed ZZZ server clocks (docs/research/zzz-source-coverage-audit-2026-10-28.md):
// Asia UTC+8, Europe UTC+1, America UTC−5. No DST, no viewer timezone.
const SERVER_OFFSET_H = { asia: 8, europe: 1, america: -5 } as const;
function serverTimeToUtc(stamp: string, offsetH: number): string {
  const m = /^(\d{4})\/(\d{2})\/(\d{2}) (\d{2}):(\d{2})$/.exec(stamp)!;
  return new Date(Date.UTC(+m[1]!, +m[2]! - 1, +m[3]!, +m[4]! - offsetH, +m[5]!)).toISOString();
}
const PERIOD = /(\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}) \(server time\) – (\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}) \(server time\)/;

test("the pinned notice is the publisher's Phase II notice with one shared period", () => {
  expect(notice.subject).toBe("V3.3 Limited-Time Channels (Phase II)");
  expect(notice.author.certification).toBe("ZZZ Official");
  const periods = notice.lines.flatMap(l => { const m = PERIOD.exec(l); return m ? [[m[1], m[2]]] : []; });
  expect(periods).toEqual([["2026/11/11 12:00", "2026/12/01 14:59"], ["2026/11/11 12:00", "2026/12/01 14:59"]]);
});

test("all four channels and the audition are present with canonical day IDs", () => {
  expect(phase2.map(e => [e.id, e.type, e.recognitionSubjects])).toEqual([
    ["zzz:answers-in-the-wind:2026-11-11", "banner", ["Severian"]],
    ["zzz:incarcerating-grip:2026-11-11", "banner", ["Incarcerating Grip"]],
    ["zzz:outlier-of-prodigies:2026-11-11", "banner", ["Norma"]],
    ["zzz:chief-sidekick:2026-11-11", "banner", ["Chief Sidekick"]],
    ["zzz:the-final-callback-audition-stage:2026-11-11", "challenge", ["Severian", "Norma"]],
  ]);
  for (const e of phase2) {
    expect(e.id).toBe(eventId(e.game, e.title, e.startsAt));
    expect(notice.lines.some(l => l.startsWith(`"${e.title}" Signal Search Details`) || l === `${e.title} Details`)).toBe(true);
  }
  // The 3.0 rerun of Chief Sidekick keeps its own historical ID.
  expect(phase2.find(e => e.title === "Chief Sidekick")!.id).not.toBe("zzz:chief-sidekick:2026-07-08");
});

test("regional ends are the stated 14:59 server time; starts stay honest server days", () => {
  const [, start, end] = PERIOD.exec(notice.lines.find(l => PERIOD.test(l))!)!;
  const regionEnds = Object.fromEntries(Object.entries(SERVER_OFFSET_H).map(([r, h]) => [r, serverTimeToUtc(end!, h)]));
  expect(regionEnds).toEqual({ asia: "2026-12-01T06:59:00.000Z", europe: "2026-12-01T13:59:00.000Z", america: "2026-12-01T19:59:00.000Z" });
  expect(start).toBe("2026/11/11 12:00");
  for (const e of phase2) {
    expect(e).toMatchObject({
      startsAt: "2026-11-11T00:00:00.000Z", startPrecision: "day", endsAt: regionEnds.asia, endPrecision: "exact",
      regionScoped: true, regionEnds, provenanceStatus: "official", confidence: 1,
      sourceId: "reviewed-zzz", extractionMethod: "manual",
    });
  }
});

test("Phase II follows Phase I without a gap and merges cleanly with the secondary feed", async () => {
  const phase1 = reviewed.filter(e => e.startsAt === "2026-10-21T00:00:00.000Z" && e.sourceUrl.endsWith("/news/166926"));
  expect(phase1).toHaveLength(5);
  for (const e of phase1) expect(Date.parse(e.regionEnds!.asia!) + 60_000).toBe(Date.parse("2026-11-11T04:00:00.000Z"));
  const raw = await Bun.file("test/fixtures/zzz/banner-rss-excerpts-2026-10-27.xml").text();
  const secondary = parseZzzBannerRss(raw, { now: "2026-10-27T13:10:38.668Z", sourceId: ZZZ_BANNER_SOURCE_ID,
    sourceUrl: ZZZ_BANNER_RSS_URL, game: "zzz" });
  for (const groups of [[reviewed, secondary], [secondary, reviewed]]) {
    const merged = mergeEvents(groups);
    expect(merged.conflicts).toEqual([]);
    for (const row of phase2) expect(merged.events.find(e => e.id === row.id)).toEqual(row);
  }
});

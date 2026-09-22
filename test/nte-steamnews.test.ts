import { describe, expect, test } from "bun:test";
import { nteSteamNewsParser, parseNtePeriod } from "../src/ingest/parsers/nte-steamnews.ts";
import { adapterById } from "../src/ingest/adapters/index.ts";
import { materializeReviewedBatch } from "../src/ingest/reviewed.ts";
import { mergeEvents } from "../src/ingest/merge.ts";
import { usesDocumentedSteamApi } from "../src/ingest/steam-api.ts";

const raw = await Bun.file("fixtures/nte/steamnews-official-2026-09-22.json").text();
const feed = JSON.parse(raw);
const ctx = { game: "nte" as const, sourceId: "nte-steamnews-official", sourceUrl: "https://example.test/api", now: "2026-09-22T00:00:00.000Z" };
const parse = (input = raw) => nteSteamNewsParser.parse(input, ctx);
const events = parse();
const current = (title: string) => events.find((e) => e.title === title && e.startsAt >= "2026-09-01")!;
const single = (contents: string, title = '"Test Event" Limited-Time Event') => JSON.stringify({ appnews: { appid: 4508340, newsitems: [{
  gid: "1", appid: 4508340, feedname: "steam_community_announcements", date: 1,
  title, contents, url: "https://store.steampowered.com/news/app/4508340/view/1",
}] } });

describe("NTE Steam real snapshot", () => {
  test("strict schema and no zero-events declaration", () => {
    expect(nteSteamNewsParser.canParse(raw)).toBe(true);
    for (const bad of ["no json", "{}", '{"appnews":{"appid":1,"newsitems":[]}}', '{"appnews":{"appid":4508340,"newsitems":{}}}']) {
      expect(nteSteamNewsParser.canParse(bad)).toBe(false);
      expect(() => parse(bad)).toThrow();
    }
    expect(nteSteamNewsParser.statesNoEvents).toBeUndefined();
  });
  for (const title of ["Surfing All Channels!", "Voice of the Voyager", "Misty Tipsy Style", "Marching Beyond Time", "Runaway Echoes"]) {
    test(`${title}: canonical identity; after update is day, end is UTC+8 exact`, () => {
      expect(current(title)).toMatchObject({ title, startsAt: "2026-09-09T00:00:00.000Z", startPrecision: "day", endsAt: "2026-09-29T21:59:00.000Z", endPrecision: "exact", provenanceStatus: "official" });
      expect(events.filter((e) => e.title === title)).toHaveLength(1);
    });
  }
  test("Breezy Tour exact conversion and Fons Rush unknown server zone", () => {
    expect(current("Breezy Tour")).toMatchObject({ startsAt: "2026-09-17T02:00:00.000Z", startPrecision: "exact" });
    expect(current("Fons Rush")).toMatchObject({ startsAt: "2026-09-21T00:00:00.000Z", endsAt: "2026-09-28T00:00:00.000Z", startPrecision: "day", endPrecision: "day" });
  });
  test("standalone banner wins its duplicate and retains specific publication URL", () => {
    expect(current("Surfing All Channels!").sourceUrl).toContain("1843481262688322");
    expect(events.every((e) => !e.sourceUrl.includes("GetNewsForApp"))).toBe(true);
  });
  test("excludes previews, social posts, permanent outfits and story unlocks", () => {
    expect(events.some((e) => /preview|discord|Faded Spring|Home Time|City Hangouts|Fogden Game/i.test(e.title))).toBe(false);
    expect(parse(single("[p]Duration: September 9, 2026 – September 30, 2026[/p]", "Version 1.4 Preview Special Program"))).toEqual([]);
  });
  test("all 14 reviewed identities and Perfect World provenance survive merging", async () => {
    const reviewed = materializeReviewedBatch(await Bun.file("data/reviewed/nte.json").json()).events;
    const merged = mergeEvents([reviewed, events]).events;
    for (const e of reviewed) {
      expect(events.some((s) => s.id === e.id)).toBe(true);
      expect(merged.find((m) => m.id === e.id)).toEqual(e);
    }
    // Explicitly pin the real source disagreement; never "fix" the fixture.
    expect(events.find((e) => e.title === "Circle Bounty" && e.startsAt.startsWith("2026-08"))?.endsAt).toBe("2026-09-30T15:59:00.000Z");
  });
});

describe("NTE date and duplicate safety", () => {
  test("no clock year, no cadence end, no scheduled end as launch time", () => {
    expect(parseNtePeriod("September 9 – September 30")).toBeNull();
    expect(parseNtePeriod("September 9 (after update)", 2026)?.end).toBeNull();
    expect(parseNtePeriod("December 29, 2026, 10:00 – January 3, 2027, 05:59 (UTC+8)")?.end?.at).toBe("2027-01-02T21:59:00.000Z");
    expect(() => parseNtePeriod("December 29 – January 3", 2026)).toThrow();
    expect(() => parseNtePeriod("February 30 – March 3", 2026)).toThrow();
    expect(parse(single("[p]Duration: September 9 – September 30[/p]"))).toEqual([]);
  });
  test("two official exact ends that disagree fail, independent of order", () => {
    const standalone = feed.appnews.newsitems.find((p: { title: string }) => p.title === "Surfing All Channels! Limited Board");
    const changed = { ...standalone, gid: "other", url: "https://example.test/correction", contents: standalone.contents.replace("September 30, 2026, 05:59", "September 30, 2026, 06:59") };
    for (const posts of [[standalone, changed], [changed, standalone]]) {
      expect(() => parse(JSON.stringify({ appnews: { appid: 4508340, newsitems: posts } }))).toThrow("official date conflict");
    }
  });
  test("exact start beats day precision across UTC midnight; conflicting starts fail", () => {
    const make = (start: string) => JSON.parse(single(`[p]Duration: ${start} – September 30, 2026, 05:59 (UTC+8)[/p]`)).appnews.newsitems[0];
    const day = make("September 9, 2026 (after update)");
    const exact = make("September 9, 2026, 06:00");
    const combine = (posts: unknown[]) => parse(JSON.stringify({ appnews: { appid: 4508340, newsitems: posts } }));
    expect(combine([day, exact])).toHaveLength(1);
    expect(combine([day, exact])[0]?.startsAt).toBe("2026-09-08T22:00:00.000Z");
    expect(() => combine([exact, make("September 10, 2026, 06:00")])).toThrow("official date conflict");
  });
  test("only the registered, exact public endpoint uses API access", () => {
    const a = adapterById("nte-steamnews-official")!;
    expect(a.priority).toBe(20);
    expect(usesDocumentedSteamApi(a)).toBe(true);
    expect(usesDocumentedSteamApi({ ...a, url: a.url + "&key=anything" })).toBe(false);
    expect(usesDocumentedSteamApi({ ...a, id: "other" })).toBe(false);
  });
});

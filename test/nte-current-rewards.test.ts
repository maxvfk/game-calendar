import { expect, test } from "bun:test";
import { parseNteSteamNews } from "../src/ingest/parsers/nte-steamnews.ts";
import { materializeReviewedBatch } from "../src/ingest/reviewed.ts";
import { mergeEvents } from "../src/ingest/merge.ts";
import { Region } from "../src/shared/schema.ts";
import { assertExactBoundary } from "./helpers/verified-records.tsx";

const feed = await Bun.file("snapshots/nte-steamnews-official.json").json();
const gid = "1844751498233952";
const post = feed.appnews.newsitems.find((p: { gid: string }) => p.gid === gid)!;
const ctx = { game: "nte" as const, sourceId: "nte-steamnews-official", sourceUrl: "https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/", now: "2026-10-28T12:00:00.000Z" };
const parse = (posts: unknown[]) => parseNteSteamNews(JSON.stringify({ appnews: { appid: 4508340, newsitems: posts } }), ctx);
const rewards = parse([post]);
const titles = ["Circle Bounty", "Circle Gifts", "Coal Lump's Treasure", "Pukaland Travelogue", "Terminal Depths"];

test("actual reward release restores only five current periods, no historical banners, web or permanent extras", () => {
  expect(rewards.map(e => e.title)).toEqual(titles);
  expect(rewards.map(e => e.id)).toEqual(["nte:circle-bounty:2026-09-30", "nte:circle-gifts:2026-09-30",
    "nte:coal-lumps-treasure:2026-10-08", "nte:pukaland-travelogue:2026-09-30", "nte:terminal-depths:2026-09-30"]);
  for (const e of rewards) {
    expect(e).toMatchObject({ sourceUrl: post.url, provenanceStatus: "official", extractionMethod: "parser", regionScoped: false, regionEnds: null });
    expect(e.startsAt).toBe(e.title === "Coal Lump's Treasure" ? "2026-10-08T02:00:00.000Z" : "2026-09-30T00:00:00.000Z");
    expect(e.startPrecision).toBe(e.title === "Coal Lump's Treasure" ? "exact" : "day");
    expect(e.type).toBe(e.title === "Circle Gifts" ? "login" : e.title === "Terminal Depths" ? "challenge" : "other");
    for (const region of Region.options) assertExactBoundary(e, region, e.title === "Circle Bounty" ? "2026-11-10T15:59:00.000Z" : "2026-11-10T21:59:00.000Z");
  }
});

test("bounded title+version context remains fail-closed, without ambient year or duplicate/missing periods", () => {
  expect(parse([{ ...post, title: "Log in for some other free rewards" }])).toEqual([]);
  for (const contents of [
    post.contents.replaceAll("2026", ""),
    post.contents.replace("all-new Version 1.4", "next version"),
    post.contents.replace('Version 1.4 "Circle Bounty" Guide', 'Version 1.5 "Circle Bounty" Guide'),
    post.contents.replace('"Terminal Depths" Limited-Time Event', '"Unknown Reward" Limited-Time Event'),
    post.contents.replace("Duration: October 8, 10:00", "Duration: October 8, 25:00"),
    post.contents.replace("Duration: October 8, 10:00", "Duration: October 8, 10:00 – October 9, 11:00"),
    post.contents.replace("Duration: October 8, 10:00", "Duration: October 8, 10:00 – October 9, 11:00 (UTC+8)[/p][p]Duration: October 8, 10:00"),
  ]) expect(() => parse([{ ...post, contents }])).toThrow();
  const future = parse([{ ...post, gid: "future", contents: post.contents.replaceAll("2026", "2027").replaceAll("Version 1.4", "Version 1.5") }]);
  expect(future).toHaveLength(5);
  expect(future.every(e => e.startsAt.startsWith("2027-") && e.endsAt?.startsWith("2027-"))).toBe(true);
  const yearless = feed.appnews.newsitems.filter((p: { gid: string }) => ["1846018067935498", "1845383656388326"].includes(p.gid));
  expect(yearless).toHaveLength(2);
  expect(parse(yearless)).toEqual([]);
});

test("explicit Circle Bounty versions preserve old source dispute while same-version exact conflicts still fail", async () => {
  const without = feed.appnews.newsitems.filter((p: { gid: string }) => p.gid !== gid);
  const baseline = parse(without);
  const all = parse(feed.appnews.newsitems);
  expect(baseline).toHaveLength(49);
  expect(all).toHaveLength(54);
  const ids = new Set(rewards.map(e => e.id));
  expect(all.filter(e => !ids.has(e.id))).toEqual(baseline);
  const reviewed = materializeReviewedBatch(await Bun.file("data/reviewed/nte.json").json()).events;
  expect(reviewed).toHaveLength(15);
  const oldMerge = mergeEvents([reviewed, baseline]);
  const merged = mergeEvents([reviewed, all]);
  expect(merged.conflicts).toEqual(oldMerge.conflicts);
  expect(merged.conflicts).toHaveLength(1);
  expect(merged.conflicts[0]).toMatchObject({ deltaHours: 24, kept: { id: "nte:circle-bounty:2026-08-19", sourceId: "reviewed-nte" } });
  expect(merged.events.filter(e => !ids.has(e.id))).toEqual(oldMerge.events);
  for (const e of rewards) expect(merged.events.find(m => m.id === e.id)).toEqual(e);
  const conflict = { ...post, gid: "conflict", contents: post.contents.replace("November 10, 23:59", "November 10, 23:58") };
  for (const posts of [[post, conflict], [conflict, post]]) expect(() => parse(posts)).toThrow("official date conflict");
});

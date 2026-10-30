import { expect, test } from "bun:test";
import { materializeReviewedBatch } from "../src/ingest/reviewed.ts";
import { parseWikiGgEventsPage } from "../src/ingest/parsers/wikigg.ts";
import { mergeEvents } from "../src/ingest/merge.ts";
import { Region } from "../src/shared/schema.ts";
import { clockFor } from "../src/shared/time.ts";
import { assertExactBoundary, detailHtml } from "./helpers/verified-records.tsx";

const reviewed = materializeReviewedBatch(await Bun.file("data/reviewed/endfield.json").json()).events;
const ids = ["echoes-of-war-season-of-fervor:2026-11-05", "the-stars-are-with-me:2026-11-05",
  "contingency-contract-indigo-experimental-operation:2026-11-05", "secret-sanctuary:2026-11-05",
  "sanity-supply-november-2026:2026-11-18"].map(s => `endfield:${s}`);
const upcoming = reviewed.filter(e => ids.includes(e.id));

test("future official families preserve unknown maintenance endings and do not turn content updates into expiries", () => {
  expect(upcoming.map(e => e.id)).toEqual(ids);
  for (const e of upcoming) expect(e).toMatchObject({startPrecision:"day", extractionMethod:"manual",
    provenanceStatus:"official", sourceUrl:"https://endfield.gryphline.com/en-us/news/9560"});
  for (const e of upcoming.slice(0, 3)) {
    expect(e).toMatchObject({startsAt:"2026-11-05T00:00:00.000Z", endsAt:null, endPrecision:"unknown", regionScoped:false, regionEnds:null});
    for (const r of Region.options) expect(clockFor(e, r, Date.parse("2026-12-03T12:00:00Z")).ended).toBe(false);
    expect(detailHtml(e,"europe",Date.parse("2026-10-28T12:00:00Z"))).toContain(">unknown<");
  }
  expect(upcoming[2]!.summary).toContain("content updates November 12");
  expect(upcoming.filter(e => /Cycle|content update/i.test(e.title))).toHaveLength(0);
});

test("Secret Sanctuary exchange and exceptional November Sanity Supply have separate source-exact three-region cutoffs", () => {
  const shop=upcoming[3]!, sanity=upcoming[4]!;
  expect(shop.type).toBe("shop");
  expect(sanity.startsAt).toBe("2026-11-18T00:00:00.000Z");
  for(const [e,asia,west] of [[shop,"2026-12-01T20:00:00.000Z","2026-12-02T09:00:00.000Z"],
    [sanity,"2026-11-24T20:00:00.000Z","2026-11-24T22:00:00.000Z"]] as const){
    expect(e.regionEnds).toEqual({asia,europe:west,america:west});
    for(const r of Region.options) assertExactBoundary(e,r,r==="asia"?asia:west);
    expect(clockFor(e,"asia",Date.parse(asia)+1).upcoming).toBe(false);
    expect(clockFor(e,"europe",Date.parse(asia)+1).live).toBe(true);
  }
  expect(Date.parse(sanity.regionEnds!.europe!)-Date.parse(sanity.regionEnds!.asia!)).toBe(2*3600000);
});

test("reviewed future rescue is visible exactly once despite healthy incomplete wiki and preserves all prior winners", async () => {
  const wiki=parseWikiGgEventsPage(await Bun.file("test/fixtures/endfield/events-2026-10-28.html").text(),{
    game:"endfield", sourceId:"endfield-wikigg-events", sourceUrl:"https://endfield.wiki.gg/wiki/Event",now:"2026-10-28T12:00:00.000Z"});
  expect(wiki).toHaveLength(8); expect(wiki.some(e=>ids.includes(e.id))).toBe(false);
  const baseline=mergeEvents([wiki,reviewed.filter(e=>!ids.includes(e.id))]);
  for(const groups of [[wiki,reviewed],[reviewed,wiki],[wiki,reviewed,upcoming]]){
    const result=mergeEvents(groups);
    expect(result.events.filter(e=>!ids.includes(e.id))).toEqual(baseline.events);
    expect(result.conflicts).toEqual(baseline.conflicts);
    for(const e of upcoming) expect(result.events.filter(m=>m.id===e.id)).toEqual([e]);
  }
});

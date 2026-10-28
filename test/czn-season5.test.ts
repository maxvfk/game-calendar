import { expect, test } from "bun:test";
import { materializeReviewedBatch } from "../src/ingest/reviewed.ts";
import { parsePrydwenCzn } from "../src/ingest/parsers/prydwen-czn.ts";
import { mergeEvents } from "../src/ingest/merge.ts";
import { Region } from "../src/shared/schema.ts";
import { clockFor, dayOnlyEnd } from "../src/shared/time.ts";
import { detailHtml } from "./helpers/verified-records.tsx";
const reviewed=materializeReviewedBatch(await Bun.file("data/reviewed/czn.json").json()).events;
const ids=["czn:galactic-disaster-season-5-a-promise-upon-the-snow-main-content:2026-10-21",
 "czn:nightmare-dream-park:2026-10-21","czn:rossweisse-trauma-code-blade-poised-against-the-cycle:2026-10-21"];
const cards=reviewed.filter(e=>ids.includes(e.id));

test("main season content and Dream Park retain Dec23 day precision, while limited Trauma rewards end Dec2",()=>{
 expect(cards.map(e=>e.id)).toEqual(ids);
 expect(cards.map(e=>e.endsAt)).toEqual(["2026-12-23T00:00:00.000Z","2026-12-23T00:00:00.000Z","2026-12-02T00:00:00.000Z"]);
 for(const e of cards){
  expect(e).toMatchObject({startsAt:"2026-10-21T00:00:00.000Z",startPrecision:"day",endPrecision:"day",regionScoped:false,regionEnds:null,
   sourceUrl:"https://czn.gg/10-21wed-update-notice/",extractionMethod:"manual",provenanceStatus:"official"});
  expect(dayOnlyEnd(e)).toBe(true);
  for(const r of Region.options) expect(detailHtml(e,r,Date.parse("2026-10-28T21:00:00Z"))).toContain("Time unconfirmed");
 }
 for(const r of Region.options){
  const now=Date.parse("2026-12-04T12:00:00Z");
  expect(clockFor(cards[2]!,r,now).ended).toBe(true);expect(clockFor(cards[2]!,r,now).upcoming).toBe(false);
  expect(clockFor(cards[0]!,r,now).live).toBe(true);expect(clockFor(cards[1]!,r,now).live).toBe(true);
 }
 expect(cards[2]!.summary).toContain("limited reward window");
});

test("Celestial Bulwark unlocks stay in one seasonal card and do not redefine the earlier Chapter0 preview",()=>{
 const season=cards[0]!;
 expect(season.summary).toContain("September 30 Chapter 0/preview is a separate opening");
 expect(season.summary).toContain("Viadeus after October 21 maintenance");
 expect(season.summary).toContain("Seraphion October 28 at 02:00 UTC");
 expect(season.summary).toContain("Enforcer Seraphion November 4 at 02:00 UTC");
 expect(season.summary).toContain("unlocks, not separate expirations");
 expect(reviewed.filter(e=>/Seraphion|Viadeus|Celestial Bulwark/.test(e.title))).toHaveLength(0);
 for(const r of Region.options) expect(clockFor(season,r,Date.parse("2026-10-28T21:00:00Z")).live).toBe(true);
});

test("healthy banner-only source omits the seasonal families; reviewed rescue keeps all prior winners and conflicts",async()=>{
 const parsed=parsePrydwenCzn(await Bun.file("snapshots/czn-prydwen-banners.html").text(),{game:"czn",sourceId:"czn-prydwen-banners",sourceUrl:"https://www.prydwen.gg/chaos-zero-nightmare/banners",now:"2026-10-28T21:00:00.000Z"});
 expect(parsed).toHaveLength(10);expect(parsed.every(e=>e.type==="banner")).toBe(true);
 const before=mergeEvents([reviewed.filter(e=>!ids.includes(e.id)),parsed]);
 for(const groups of [[reviewed,parsed],[parsed,reviewed,cards]]){
  const after=mergeEvents(groups);
  expect(after.events.filter(e=>!ids.includes(e.id))).toEqual(before.events);expect(after.conflicts).toEqual(before.conflicts);
  for(const e of cards) expect(after.events.filter(m=>m.id===e.id)).toEqual([e]);
 }
});

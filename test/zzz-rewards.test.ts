import { expect, test } from "bun:test";
import { materializeReviewedBatch } from "../src/ingest/reviewed.ts";
import { parseZzzSteamRss, ZZZ_STEAM_RSS_URL } from "../src/ingest/parsers/zzz-steam-rss.ts";
import { parseZzzBannerRss, ZZZ_BANNER_RSS_URL, ZZZ_BANNER_SOURCE_ID } from "../src/ingest/parsers/zzz-zenlessgg-banners.ts";
import { mergeEvents } from "../src/ingest/merge.ts";
import { Region } from "../src/shared/schema.ts";
import { clockFor } from "../src/shared/time.ts";
import { assertExactBoundary } from "./helpers/verified-records.tsx";
const reviewed=materializeReviewedBatch(await Bun.file('data/reviewed/zzz.json').json()).events;
const ids=['zzz:new-eridu-city-fund-version-3-3:2026-10-21','zzz:version-3-3-issue-fix-compensation:2026-10-21'];
const rewards=reviewed.filter(e=>ids.includes(e.id));

test('main City Fund end is regional and remains claimable after the separate paid purchase cutoff',()=>{
 const e=rewards[0]!; expect(e.id).toBe(ids[0]!);
 const ends={asia:'2026-11-29T19:59:00.000Z',europe:'2026-11-30T02:59:00.000Z',america:'2026-11-30T08:59:00.000Z'};
 expect(e).toMatchObject({sourceUrl:'https://zenless.hoyoverse.com/en-us/news/166944',startsAt:'2026-10-21T00:00:00.000Z',startPrecision:'day',regionEnds:ends,provenanceStatus:'official',extractionMethod:'manual'});
 for(const r of Region.options){assertExactBoundary(e,r,ends[r]);expect(clockFor(e,r,Date.parse(ends[r])-3600000).live).toBe(true);}
 expect(reviewed.some(e=>/City Fund.*purchase|Growth Plan.*purchase/i.test(e.title))).toBe(false);
});
test('issue-fix claim is one fixed UTC+8 instant, with sourced eligibility and no guessed mail timestamps',()=>{
 const e=rewards[1]!;expect(e.id).toBe(ids[1]!);
 expect(e).toMatchObject({endsAt:'2026-11-20T15:59:00.000Z',regionScoped:false,regionEnds:null,startPrecision:'day',sourceUrl:'https://zenless.hoyoverse.com/en-us/news/166963'});
 expect(e.summary).toContain('Inter-Knot Lv. 4');expect(e.summary).toContain('30 days after issue');
 for(const r of Region.options)assertExactBoundary(e,r,'2026-11-20T15:59:00.000Z');
 expect(rewards).toHaveLength(2);
});
test('healthy restricted source families omit rewards; reviewed rescue preserves every prior winner',async()=>{
 const ctx={game:'zzz' as const,now:'2026-10-28T12:00:00.000Z'};
 const steam=parseZzzSteamRss(await Bun.file('snapshots/zzz-steam-events-official.xml').text(),{...ctx,sourceId:'zzz-steam-events-official',sourceUrl:ZZZ_STEAM_RSS_URL});
 const banners=parseZzzBannerRss(await Bun.file('snapshots/zzz-zenlessgg-banners.json').text(),{...ctx,sourceId:ZZZ_BANNER_SOURCE_ID,sourceUrl:ZZZ_BANNER_RSS_URL});
 expect(steam).toHaveLength(43);expect(banners).toHaveLength(20);expect([...steam,...banners].some(e=>ids.includes(e.id))).toBe(false);
 const before=mergeEvents([reviewed.filter(e=>!ids.includes(e.id)),steam,banners]);
 const after=mergeEvents([reviewed,steam,banners,rewards]);
 expect(after.events.filter(e=>!ids.includes(e.id))).toEqual(before.events);expect(after.conflicts).toEqual(before.conflicts);
 for(const e of rewards)expect(after.events.filter(m=>m.id===e.id)).toEqual([e]);
});

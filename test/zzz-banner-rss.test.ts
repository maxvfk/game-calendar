import { expect, test } from "bun:test";
import { cp, mkdir, mkdtemp, rm, symlink, unlink } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { ADAPTERS, adapterById } from "../src/ingest/adapters/index.ts";
import { captureZzzBannerFacts, discoverZzzBannerPosts, parseZzzBannerRss, zzzBannerRssParser, ZZZ_BANNER_SOURCE_ID as ID, ZZZ_BANNER_RSS_URL as URL } from "../src/ingest/parsers/zzz-zenlessgg-banners.ts";
import { materializeReviewedBatch } from "../src/ingest/reviewed.ts";
import { mergeEvents } from "../src/ingest/merge.ts";
import { SnapshotStore } from "../src/ingest/snapshots.ts";
import { RobotsCache } from "../src/ingest/robots.ts";
import { DEFAULT_USER_AGENT, runRefresh } from "../scripts/refresh-sources.ts";

const raw = await Bun.file("test/fixtures/zzz/banner-rss-excerpts-2026-10-27.xml").text();
const NOW = "2026-10-27T13:10:38.668Z";
const ctx = { now: NOW, sourceId: ID, sourceUrl: URL, game: "zzz" as const };
const parse = (body = raw) => parseZzzBannerRss(body, ctx);
const events = parse();
const reviewed = materializeReviewedBatch(await Bun.file("data/reviewed/zzz.json").json()).events;
const items = [...raw.matchAll(/<item>[\s\S]*?<\/item>/g)].map(m => m[0]);
const wrap = (posts: string[]) => raw.replace(/<item>[\s\S]*<\/item>/, posts.join("\n"));
const currentItem = items.find(s => /V3\.3 Limited-Time/.test(s))!;
const phase2 = items.find(s => /V3\.2 Limited-Time Channels \(Phase II\)/.test(s))!;
const current = events.filter(e => e.startsAt.startsWith("2026-10-21"));
function future() {
  let item = phase2.replaceAll("v3-2-limited-time-channels-phase-ii", "v4-0-limited-time-channels-phase-ii")
    .replaceAll("V3.2", "V4.0").replaceAll("2026/09/30", "2026/11/11").replaceAll("2026/10/20", "2026/12/01");
  for (const title of ["Cindernight Respite", "Crimson Moon Casket", "Cold Rain Wanes in the Night", "Frostfall Sickle"]) item = item.replaceAll(title, "Future " + title);
  return item;
}

test("real multi-version capture discovers 20 distinct channels; all eight reviewed banner IDs survive", () => {
  expect(ADAPTERS.some(a => a.id === ID)).toBe(true);
  expect(discoverZzzBannerPosts(raw)).toHaveLength(9);
  expect(events).toHaveLength(20); expect(new Set(events.map(e => e.id)).size).toBe(20);
  expect(current.map(e => e.title).sort()).toEqual(["Graceful Gale", "Into the Flames of Life", "Joyau Dore", "Plume of Rebirth"]);
  expect(events.every(e => e.type === "banner" && e.provenanceStatus === "estimated" && e.confidence === 0.8 && e.extractionMethod === "parser" && e.sourceUrl.startsWith("https://zenless.gg/"))).toBe(true);
  for (const groups of [[reviewed, events], [events, reviewed]]) {
    const merged = mergeEvents(groups);
    expect(merged.conflicts).toEqual([]);expect(merged.events).toHaveLength(42);
    for (const row of reviewed) expect(merged.events.find(e => e.id === row.id)).toEqual(row);
  }
});

test("11:59 vs 14:59 and all three fixed regional offsets are exact; starts stay honest server-days", () => {
  for (const event of current) expect(event).toMatchObject({ startsAt:"2026-10-21T00:00:00.000Z", startPrecision:"day", endPrecision:"exact", regionEnds:{asia:"2026-11-11T03:59:00.000Z",europe:"2026-11-11T10:59:00.000Z",america:"2026-11-11T16:59:00.000Z"} });
  expect(events.find(e => e.title === "Cindernight Respite")).toMatchObject({ startsAt:"2026-09-30T00:00:00.000Z", startPrecision:"day", regionEnds:{asia:"2026-10-20T06:59:00.000Z",europe:"2026-10-20T13:59:00.000Z",america:"2026-10-20T19:59:00.000Z"} });
  expect(events.find(e => e.title === "Exclusive Rescreening")?.recognitionSubjects).toEqual(["Dialyn","Ukinami Yuzuha","Asaba Harumasa"]);
  expect(events.find(e => e.title === "W-Engine Reverberation")?.recognitionSubjects).toEqual(["Yesterday Calls","Metanukimorphosis","Zanshin Herb Case"]);
  expect(events.some(e => /Audition|Shiyu|Deadly/.test(e.title))).toBe(false);
  expect(events.some(e => e.startsAt.startsWith("2026-11-11"))).toBe(false);
});

test("dynamic RSS discovery accepts new explicit phases/URLs without version/ID lists or patch arithmetic", () => {
  const next = parse(wrap([future(), ...items]));expect(next).toHaveLength(24);
  expect(next.filter(e => e.title.startsWith("Future "))).toHaveLength(4);
  expect(next.find(e => e.title === "Future Cindernight Respite")).toMatchObject({ startsAt:"2026-11-11T00:00:00.000Z",endsAt:"2026-12-01T06:59:00.000Z" });
  expect(parse(wrap([...items].reverse()))).toEqual(events);
  expect(parseZzzBannerRss(raw,{...ctx,now:"2030-01-01T00:00:00.000Z"}).map(e => e.id)).toEqual(events.map(e => e.id));
});

test("raw envelope/identity/HTML drift, missing article payloads, duplicates and context mismatch fail closed", () => {
  for(const bad of ["<html>challenge</html>",raw.slice(0,-20),raw.replace("<rss ","<!DOCTYPE rss><rss "),raw.replace("en-US","zh-CN"),raw.replace("<item>",'<item changed="yes">'),wrap([currentItem,currentItem]),raw.replace("<content:encoded>","<content:new>")]) {
    expect(zzzBannerRssParser.canParse(bad)).toBe(false);expect(()=>parse(bad)).toThrow();
  }
  expect(()=>parseZzzBannerRss(raw,{...ctx,game:"hsr"})).toThrow();
  const different = currentItem.replaceAll("v3-3-limited-time-channels-phase-i/", "copied-notice/");
  expect(()=>parse(wrap([...items,different]))).toThrow(/duplicate/);
});

test("recognized notices cannot borrow version dates, years, phases, trial periods or partial channel sets", () => {
  const bad = [
    currentItem.replace("2026/11/11 11:59","11/11 11:59"), currentItem.replace("2026/11/11 11:59","2026/02/30 11:59"),
    currentItem.replace("2026/11/11 11:59","2026/11/11 24:00"), currentItem.replace("After the Version 3.3 Update","After the Version 9.9 Update"),
    currentItem.replace("Agent and W-Engine Signal Search Event period","Unrelated Event period"),
    currentItem.replace('"Into the Flames of Life" Signal Search Details','"Into the Flames of Life" New Heading'),
    currentItem.replace("(server time)","(UTC)"),currentItem.replace("Channels (Phase I)","Channels (Phase III)"),
  ];
  for(const item of bad) expect(()=>parse(wrap(items.map(i => i===currentItem?item:i)))).toThrow();
  expect(()=>parse(wrap([currentItem]))).toThrow(/update anchor/);
  const updates=items.filter(i => /Update Announcement|Pre-Download/.test(i));
  const corrupt=updates[0]!.replaceAll("2026/10/21","2026/10/22");
  expect(()=>parse(wrap(items.map(i=>i===updates[0]?corrupt:i)))).toThrow(/contradictory update/);
});

test("a copied secondary notice cannot override or corroborate a reviewed decision; one-minute conflicts stay visible", () => {
  const row=current[0]!;const explicit={...row,sourceId:"reviewed-zzz",confidence:0.6};
  for(const groups of [[[row],[explicit]],[[explicit],[row]]]) expect(mergeEvents(groups).events).toEqual([explicit]);
  const correction={...explicit,regionEnds:{...explicit.regionEnds!,europe:"2026-11-11T11:00:00.000Z"}};
  const merged=mergeEvents([[row],[correction]]);
  expect(merged.events).toEqual([correction]);expect(merged.conflicts).toHaveLength(1);
  expect(merged.conflicts[0]).toMatchObject({field:"endsAt",region:"europe",deltaHours:1/60});
});

test("persistent archive contains factual rows and raw-response hash, not publisher article prose; repeat 200 is stable", () => {
  const bytes=new TextEncoder().encode(raw);const archive=captureZzzBannerFacts(bytes,events,NOW);
  expect(parse(archive)).toEqual(events);expect(archive).not.toContain("<content:encoded>");expect(archive).not.toContain("During the event, the reception");
  const data=JSON.parse(archive);expect(data.capture.sha256).toBe(new Bun.CryptoHasher("sha256").update(bytes).digest("hex"));
  const later="2026-10-28T00:00:00.000Z";const next=parseZzzBannerRss(raw,{...ctx,now:later});
  expect(captureZzzBannerFacts(bytes,next,later,archive)).toBe(archive);
  data.events[0].provenanceStatus="official";expect(()=>parse(JSON.stringify(data))).toThrow();
});

async function harness(fn:(s:{store:SnapshotStore;requests:Array<{url:string;headers:Headers}>;cycle:(body:string,status?:number,advance?:number)=>ReturnType<typeof runRefresh>})=>Promise<void>,robotsText="User-agent: *\nAllow: /\n") {
  const root=await mkdtemp(join(tmpdir(),"zzz-banner-refresh-"));const store=new SnapshotStore(root);
  let time=Date.parse(NOW),responseBody=raw,responseStatus=200;
  const requests:Array<{url:string;headers:Headers}>=[];
  const fetchImpl=async(url:string,init?:RequestInit)=>{requests.push({url,headers:new Headers(init?.headers)});return url.endsWith("/robots.txt")?new Response(robotsText):new Response(responseStatus===304?null:responseBody,{status:responseStatus,headers:{"Content-Type":"application/rss+xml; charset=UTF-8","ETag":"v1"}})};
  const robots=new RobotsCache({userAgent:DEFAULT_USER_AGENT,fetchImpl});
  const adapter=adapterById(ID)!;
  const cycle=(body:string,status=200,advance=0)=>{responseBody=body;responseStatus=status;time+=advance;return runRefresh({adapters:[adapter],store,robots,fetchImpl,userAgent:DEFAULT_USER_AGENT,now:()=>new Date(time),sleep:async()=>{},dryRun:false,only:ID,force:false,timeoutMs:1000,rebuildFeed:null,log:()=>{}})};
  try{await fn({store,requests,cycle});}finally{await rm(root,{recursive:true,force:true});}
}
const NEXT=7*3600000;
test("normal refresh fetches 20, persists honest JSON facts/meta, honors UA/conditional/interval and 304",async()=>{
 await harness(async({store,requests,cycle})=>{
  const first=await cycle(raw);expect(first.confirmed).toBe(1);expect(first.outcomes[0]?.eventCount).toBe(20);
  const snap=(await store.read(ID))!;expect(snap.meta.contentKind).toBe("json");expect(parse(snap.html)).toEqual(events);
  expect(snap.meta.contentHash).toBe(new Bun.CryptoHasher("sha256").update(snap.html).digest("hex"));
  expect((await cycle(raw)).outcomes[0]?.result).toBe("skipped_interval");
  expect((await cycle(raw,304,NEXT)).outcomes[0]?.result).toBe("unchanged");
  expect(requests.filter(r=>r.url===URL)).toHaveLength(2);expect(requests.at(-1)?.headers.get("If-None-Match")).toBe("v1");
  expect(requests.every(r=>r.headers.get("User-Agent")===DEFAULT_USER_AGENT)).toBe(true);
  expect((await cycle(raw,200,NEXT)).outcomes[0]?.result).toBe("unchanged");
 });
});

test("new main bootstrap honors real capture time even without PR-scoped state cache",async()=>{
 await harness(async({store,cycle})=>{await cycle(raw);await unlink(join(store.root,ID+".state.json"));expect((await cycle(raw)).outcomes[0]?.result).toBe("skipped_interval");});
});

test("outage, parser-zero, drift and partial captures keep last-known-good and do not advance confirmation",async()=>{
 await harness(async({store,cycle})=>{
  await cycle(raw);const before=(await store.read(ID))!;
  for(const [body,status]of [["unavailable",503],[wrap([]),200],[raw.replace("content:encoded","content:new"),200]] as const){
   const result=await cycle(body,status,NEXT);expect(result.confirmed).toBe(0);expect((await store.read(ID))!.html).toBe(before.html);
   expect((await store.readState(ID)).lastConfirmedAt).toBe(NOW);
  }
 });
});

test("partial loss of a still-live phase is rejected even when historical rows hide a 50% sharp drop",async()=>{
 await harness(async({store,cycle})=>{
  await cycle(wrap([future(),...items]));const before=(await store.read(ID))!.html;
  const result=await cycle(raw,200,NEXT);expect(result.outcomes[0]?.result).toBe("rejected");expect(result.outcomes[0]?.note).toContain("4/8 still-live");
  expect((await store.read(ID))!.html).toBe(before);
 });
});

test("expired-only 200 and 304 surface stale phase coverage instead of making missing banners healthy",async()=>{
 await harness(async({store,cycle})=>{
  await cycle(raw);const advance=Date.parse("2026-11-12T00:00:00.000Z")-Date.parse(NOW);
  for(const status of [304,200]){const result=await cycle(raw,status,status===304?advance:NEXT);expect(result.outcomes[0]?.result).toBe("rejected");expect(result.outcomes[0]?.note).toContain("expired phases");}
  expect((await store.readState(ID)).lastConfirmedAt).toBe(NOW);
 });
});

test("robots refusal makes no content request and uses no access override",async()=>{
 await harness(async({requests,cycle})=>{expect((await cycle(raw)).outcomes[0]?.result).toBe("skipped_robots");expect(requests.map(r=>r.url)).toEqual(["https://zenless.gg/robots.txt"]);},"User-agent: *\nDisallow: /\n");
});


test("full offline build preserves Steam E1, Shiyu/Deadly and every other prior row/health/conflict", async () => {
  const root=join(import.meta.dir,"..");const dir=await mkdtemp(join(tmpdir(),"zzz-banner-feed-"));
  try {
    await mkdir(join(dir,"data"));
    for(const path of ["fixtures","data/reviewed","data/presentation"])await symlink(join(root,path),join(dir,path));
    await cp(join(root,"snapshots"),join(dir,"snapshots"),{recursive:true});
    for(const suffix of ["json","meta.json","state.json"])await rm(join(dir,"snapshots",`${ID}.${suffix}`),{force:true});
    const clock=join(dir,"clock.ts");
    await Bun.write(clock,`const Original=Date;globalThis.Date=class extends Original{constructor(v?:string|number){super(v??${JSON.stringify(NOW)});}static now(){return Original.parse(${JSON.stringify(NOW)});}} as DateConstructor;`);
    const build=async()=>{const r=Bun.spawnSync([process.execPath,"--preload",clock,join(root,"scripts/build-feed.ts")],{cwd:dir,env:{...process.env,SNAPSHOT_DIR:join(dir,"snapshots")}});expect(r.exitCode,r.stderr.toString()).toBe(0);return Bun.file(join(dir,"public/data/events.v1.json")).json();};
    const before=await build();
    const store=new SnapshotStore(join(dir,"snapshots"));
    await store.save(ID,{url:URL,contentKind:"json",body:captureZzzBannerFacts(new TextEncoder().encode(raw),events,NOW),at:NOW,eventCount:20,etag:null,lastModified:null});
    const after=await build();
    expect(after.events.length).toBe(before.events.length+12);
    for(const row of before.events)expect(after.events.find((e:{id:string})=>e.id===row.id)).toEqual(row);
    expect(after.sources.filter((s:{sourceId:string})=>s.sourceId!==ID)).toEqual(before.sources.filter((s:{sourceId:string})=>s.sourceId!==ID));
    expect(after.dateConflicts).toEqual(before.dateConflicts);
    expect(new Set(after.events.map((e:{id:string})=>e.id)).size).toBe(after.events.length);
    expect(after.events.filter((e:{sourceId:string})=>e.sourceId===ID)).toHaveLength(12);
    expect(after.sources.find((s:{sourceId:string})=>s.sourceId===ID)).toMatchObject({parsedCount:20,eventCount:20});
  } finally {await rm(dir,{recursive:true,force:true});}
});

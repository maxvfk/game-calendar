/** Follow-up Gate A: only newly discovered URLs, cached same-UA robots from round 1. */
import { mkdir } from "node:fs/promises";
import { isAllowed, requestTarget, type RobotsTxt } from "../src/ingest/robots.ts";
if(process.env["GITHUB_ACTIONS"]!=="true")throw new Error("Actual Actions runner required");
const previous=await Bun.file("docs/evidence/zzz-b1-gate-a-2026-10-27.json").json();
if(Date.now()-Date.parse(previous.capturedAt)>6*3600000)throw new Error("Cached robots expired; new permission check required");
const ua="gacha-event-tracker/1.0 (+https://github.com/maxvfk/game-calendar)";
if(previous.userAgent!==ua)throw new Error("Different agent");
const rules=previous.gates.zenlessgg.robots as RobotsTxt;
const root="source-probes/zzz-b1-feed";await mkdir(root,{recursive:true});
const responses:Record<string,unknown>[]=[];
const existing=new Set(previous.responses.map((r:{url:string})=>r.url));
async function capture(path:string,name:string){
 const url=new URL(path,"https://zenless.gg").href;
 if(new URL(url).origin!=="https://zenless.gg"||existing.has(url)||!isAllowed(rules,ua,requestTarget(url)))throw new Error("Not a new allowed surface: "+url);
 await Bun.sleep(2000);
 const r=await fetch(url,{headers:{"User-Agent":ua},redirect:"manual",signal:AbortSignal.timeout(25000)});
 const body=await r.text();if(Buffer.byteLength(body)>4000000)throw new Error("Body limit");
 const meta={name,url,at:new Date().toISOString(),status:r.status,contentType:r.headers.get("content-type"),location:r.headers.get("location"),bytes:Buffer.byteLength(body),sha256:new Bun.CryptoHasher("sha256").update(body).digest("hex"),etag:r.headers.get("etag"),lastModified:r.headers.get("last-modified"),
 itemTitles:[...body.matchAll(/<item>[\s\S]*?<title>([\s\S]*?)<\/title>/g)].map(m=>m[1]),
 links:[...new Set([...body.matchAll(/(?:href=["']|<link>)(https:\/\/zenless\.gg\/[^"'<>\s]+)/g)].map(m=>m[1]!))].filter(u=>/feed|channels|update|terms/.test(u)).slice(0,60)};
 responses.push(meta);await Bun.write(`${root}/${name}.txt`,body);console.log(JSON.stringify(meta));return body;
}
// Both RSS and Phase II URLs were linked by the round-1 news index, not guessed APIs.
await capture("/news/feed/","news-rss");
await capture("/v3-2-limited-time-channels-phase-ii/","phase2");
// Version announcement was also linked on the captured news index; supplies the explicit update day.
await capture("/version-3-3-journey-to-the-sky-update-announcement/","update");
const category=await capture("/news/updates/","updates-index");
const alternate=[...category.matchAll(/<link\b[^>]*type=["']application\/rss\+xml["'][^>]*href=["']([^"']+)["']/g)].map(m=>m[1]!).find(u=>u.includes("/news/updates/"));
if(alternate)await capture(alternate,"updates-rss");
const e={capturedAt:new Date().toISOString(),runId:process.env["GITHUB_RUN_ID"],commit:process.env["GITHUB_SHA"],userAgent:ua,robotsCache:{runId:previous.runId,capturedAt:previous.capturedAt,ttlHours:6},responses};
await Bun.write(`${root}/evidence.json`,JSON.stringify(e,null,2)+"\n");console.log("B1_FEED_EVIDENCE "+JSON.stringify(e));

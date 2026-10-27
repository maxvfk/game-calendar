/** B1 evidence only: ordinary HTTP, actual runner, robots first; never a feed adapter. */
import { mkdir } from "node:fs/promises";
import { crawlDelayMs, isAllowed, looksLikeHtml, parseRobots, requestTarget, type RobotsTxt } from "../src/ingest/robots.ts";

if (process.env["GITHUB_ACTIONS"] !== "true") throw new Error("Actual Actions runner required");
const root = "source-probes/zzz-b1";
await mkdir(root, { recursive: true });
const ua = "gacha-event-tracker/1.0 (+https://github.com/maxvfk/game-calendar)";
const responses: Record<string, unknown>[] = [];
const gates: Record<string, unknown> = {};
const last = new Map<string, number>();
const hash = (s: string) => new Bun.CryptoHasher("sha256").update(s).digest("hex");
async function capture(url: string, name: string, delay = 2000) {
  const origin = new URL(url).origin;
  await Bun.sleep(Math.max(0, (last.get(origin) ?? 0) + delay - Date.now()));
  last.set(origin, Date.now());
  try {
    const r = await fetch(url, { headers: { "User-Agent": ua }, redirect: "manual", signal: AbortSignal.timeout(25000) });
    const body = await r.text();
    if (Buffer.byteLength(body) > 4_000_000) throw new Error("Probe body limit exceeded");
    const links = [...body.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)].map(m => ({href:m[1]!, label:m[2]!.replace(/<[^>]*>/g," ").replace(/\s+/g," ").trim()}));
    const meta = { name, url, at: new Date().toISOString(), status:r.status, location:r.headers.get("location"), contentType:r.headers.get("content-type"), etag:r.headers.get("etag"), lastModified:r.headers.get("last-modified"), server:r.headers.get("server"), bytes:Buffer.byteLength(body), sha256:hash(body), shape:{
      html:/<!doctype html|<html[\s>]/i.test(body), scripts:(body.match(/<script\b/gi)??[]).length,
      jsonLd:(body.match(/application\/ld\+json/g)??[]).length,
      channelNames:["Into the Flames of Life","Graceful Gale","Plume of Rebirth","Joyau Dore"].filter(n=>body.includes(n)),
      absoluteDates:[...new Set(body.match(/2026[\/-]\d\d[\/-]\d\d(?:[T ]\d\d:\d\d)?/g)??[])].slice(0,45),
      hasServerTime:/server time|server_time/i.test(body), hasNextData:/__NEXT_DATA__|self\.__next_f/.test(body),
      hasNuxtData:/__NUXT__|__NUXT_DATA__/.test(body),
      scriptSources:[...body.matchAll(/<script\b[^>]*src=["']([^"']+)["']/gi)].map(m=>m[1]).slice(0,25),
      surfaceLinks:links.filter(l=>/github|terms|privacy|credits|rss|feed|api|docs|license|limited-time-channels|\/article\/|\.json/i.test(l.href+" "+l.label)).slice(0,70),
      alternateLinks:[...body.matchAll(/<link\b[^>]*(?:rss|atom)[^>]*>/gi)].map(m=>m[0]).slice(0,10),
    }};
    responses.push(meta);await Bun.write(`${root}/${name}.txt`,body);console.log(JSON.stringify(meta));
    return {r,body,links};
  } catch(error){const meta={name,url,error:String(error)};responses.push(meta);console.log(JSON.stringify(meta));return null;}
}
async function website(origin:string, prefix:string, paths:string[]) {
  let robots=await capture(`${origin}/robots.txt`,`${prefix}-robots`);
  if(robots && [301,302,307,308].includes(robots.r.status)) {
    const location=robots.r.headers.get("location");const dest=location?new URL(location,origin):null;
    if(dest?.origin===origin && dest.pathname.endsWith("/robots.txt"))robots=await capture(dest.href,`${prefix}-robots-final`);
  }
  if(!robots || ![200,404,410].includes(robots.r.status) || (robots.r.status===200 && looksLikeHtml(robots.body))){gates[prefix]="BLOCKED: robots unavailable/unusable; no content requests";return;}
  const rules:RobotsTxt=parseRobots(robots.r.status===200?robots.body:"");
  const delay=Math.max(2000,crawlDelayMs(rules,ua)??0);
  gates[prefix]={robots:rules,delay};
  if(delay>60000){gates[prefix]="BLOCKED: crawl delay exceeds bounded probe budget";return;}
  const seen=new Set<string>();
  async function page(path:string,name:string){
    const url=new URL(path,origin).href;
    if(seen.has(url))return null;seen.add(url);
    if(new URL(url).origin!==origin || !isAllowed(rules,ua,requestTarget(url))){responses.push({name,url,skipped:"robots disallow or out-of-origin"});return null;}
    return capture(url,name,delay);
  }
  for(const [i,path]of paths.entries()){
    const p=await page(path,`${prefix}-${i}`);
    if(!p || p.r.status!==200)continue;
    // Policy documents are deliberately readable evidence; restrictive content-use
    // wording stops this family before any further article/index acquisition.
    if(/terms/.test(path) && /source of or substitute for|robot, spider, scraper|automated.*(?:prohibited|forbidden)/i.test(p.body)) {
      gates[prefix]={robots:rules,delay,contentGate:"BLOCKED: restrictive content-reuse/automated access terms; remaining content not requested"};break;
    }
    // Inspect only explicitly linked policy/docs/feed endpoints. No JS execution,
    // endpoint guessing, build-id transport or reverse-engineered private APIs.
    const policies=p.links.filter(l=>/terms|credits|privacy|documentation|source code/i.test(l.label) && !seen.has(new URL(l.href,origin).href)).slice(0,3);
    for(const [j,l]of policies.entries())await page(l.href,`${prefix}-${i}-policy-${j}`);
  }
}
await website("https://www.hoyolab.com","hoyolab",["/official/8/notices","/article/47131668"]);
await website("https://zenless.gg","zenlessgg",["/terms/","/news/","/v3-3-limited-time-channels-phase-i/"]);
await website("https://www.icy-veins.com","icy",["/zenless-zone-zero/current-banner"]);
await website("https://zzz.rng.moe","rng",["/en/timeline","/en/credits","/en/privacy"]);
await website("https://zzz-poly-cal.vercel.app","poly",["/calendar","/"]);
const evidence={capturedAt:new Date().toISOString(),runId:process.env["GITHUB_RUN_ID"],commit:process.env["GITHUB_SHA"],userAgent:ua,runner:{os:process.env["RUNNER_OS"],image:process.env["ImageVersion"]},gates,responses};
await Bun.write(`${root}/evidence.json`,JSON.stringify(evidence,null,2)+"\n");
console.log("B1_EVIDENCE "+JSON.stringify(evidence));

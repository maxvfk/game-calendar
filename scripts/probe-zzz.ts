/** Gate A only. No snapshots, feed writes, scheduler or adapter activation. */
import { mkdir } from "node:fs/promises";
import { crawlDelayMs, isAllowed, looksLikeHtml, parseRobots, requestTarget } from "../src/ingest/robots.ts";

if (process.env["GITHUB_ACTIONS"] !== "true") throw new Error("Actual Actions runner required");
const round = process.env["ZZZ_PROBE_ROUND"] ?? "full";
if (round !== "full" && round !== "mobile") throw new Error("Unknown ZZZ_PROBE_ROUND");
const root = "source-probes/zzz";
await mkdir(root, { recursive: true });
const ua = "gacha-event-tracker/1.0 (+https://github.com/maxvfk/game-calendar)";
const evidence: Record<string, unknown> = {
  capturedAt: new Date().toISOString(), userAgent: ua,
  runId: process.env["GITHUB_RUN_ID"], commit: process.env["GITHUB_SHA"],
};
const responses: Record<string, unknown>[] = [];
const hash = (text: string) => new Bun.CryptoHasher("sha256").update(text).digest("hex");
async function capture(url: string, name: string, conditional?: Record<string, string>) {
  try {
    const r = await fetch(url, { headers: { "User-Agent": ua, ...conditional }, redirect: "manual", signal: AbortSignal.timeout(30_000) });
    const body = await r.text();
    if (body.length > 4_000_000) throw new Error("Probe body limit exceeded");
    const meta = { name, url, at: new Date().toISOString(), status: r.status,
      location: r.headers.get("location"), contentType: r.headers.get("content-type"),
      etag: r.headers.get("etag"), lastModified: r.headers.get("last-modified"),
      bytes: Buffer.byteLength(body), sha256: hash(body), conditional: conditional ?? null,
      shape: { html: /<!doctype html|<html[\s>]/i.test(body), scriptCount: (body.match(/<script\b/gi) ?? []).length,
        newsLinks: [...new Set(body.match(/\/en-us\/news\/\d+/g) ?? [])].slice(0, 30),
        hasEventDuration: /Event Duration/i.test(body), hasVersion33: /Version 3\.3/.test(body) } };
    responses.push(meta);
    await Bun.write(`${root}/${name}.txt`, body); // short-lived diagnostic artifact only
    console.log(JSON.stringify(meta));
    return { r, body };
  } catch (error) { responses.push({ name, url, error: String(error) }); return null; }
}
async function website(origin: string, paths: string[], prefix: string) {
  let robots = await capture(`${origin}/robots.txt`, `${prefix}-robots`);
  // One same-origin robots redirect, with no arbitrary redirect follow.
  if (robots !== null && [301,302,307,308].includes(robots.r.status)) {
    const loc = robots.r.headers.get("location");
    const dest = loc === null ? null : new URL(loc, origin);
    if (dest?.origin === origin && dest.pathname.endsWith("/robots.txt")) {
      robots = await capture(dest.href, `${prefix}-robots-final`);
    }
  }
  if (robots === null || ![200,404,410].includes(robots.r.status) ||
    (robots.r.status === 200 && looksLikeHtml(robots.body))) {
    evidence[`${prefix}Gate`] = "BLOCKED: robots unavailable/unusable; no content requests"; return;
  }
  const rules = parseRobots(robots.r.status === 200 ? robots.body : "");
  const delay = Math.max(2000, crawlDelayMs(rules, ua) ?? 0);
  if (delay > 60_000) { evidence[`${prefix}Gate`] = "BLOCKED: crawl delay exceeds budget"; return; }
  evidence[`${prefix}Robots`] = { groups: rules.groups, sitemaps: rules.sitemaps, delay };
  for (const [index, path] of paths.entries()) {
    const url = `${origin}${path}`;
    if (!isAllowed(rules, ua, requestTarget(url))) { responses.push({ url, skipped: "robots disallow" }); continue; }
    await Bun.sleep(delay);
    const result = await capture(url, `${prefix}-${index}`);
    if (index === 0 && result?.r.status === 200) {
      const headers: Record<string,string> = {};
      const etag = result.r.headers.get("etag"), modified = result.r.headers.get("last-modified");
      if (etag) headers["If-None-Match"] = etag;
      if (modified) headers["If-Modified-Since"] = modified;
      if (Object.keys(headers).length) { await Bun.sleep(delay); await capture(url, `${prefix}-conditional`, headers); }
      else evidence[`${prefix}Conditional`] = "No ETag/Last-Modified offered; no artificial validators sent";
    }
  }
}
if (round === "mobile") {
  await website("https://zenless.hoyoverse.com", ["/m/en-us/news", "/m/en-us/news/166963", "/m/en-us/news/166926"], "zenless-mobile");
} else {
await website("https://zenless.hoyoverse.com", ["/en-us/news", "/en-us/news/166963", "/en-us/news/166926", "/en-us/news/166946", "/en-us/news/167038"], "zenless");
// Official publisher distribution verified at store.steampowered.com/app/4162040.
await website("https://steamcommunity.com", ["/app/4162040/announcements/", "/games/4162040/rss/"], "steam");
// Documented Web API is an explicit API contract, not a robots override for HTML.
// AGENTS.md and docs/NTE-STEAM.md establish this distinction. Evidence-only exact call.
await capture("https://api.steampowered.com/robots.txt", "steam-api-robots");
evidence["steamApiContract"] = { docs: "https://partner.steamgames.com/doc/webapi/ISteamNews", terms: "https://steamcommunity.com/dev/apiterms", appId: 4162040, feed: "steam_community_announcements" };
const api = await capture("https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=4162040&count=50&maxlength=0&feeds=steam_community_announcements", "steam-api-news");
if (api?.r.status === 200) {
  try {
    const data = JSON.parse(api.body);
    evidence["steamNews"] = { appid: data.appnews?.appid, items: data.appnews?.newsitems?.map((item: Record<string, unknown>) => ({ gid: item["gid"], title: item["title"], url: item["url"], date: item["date"], feedname: item["feedname"], contentsLength: String(item["contents"]).length })) };
  } catch { evidence["steamNews"] = "Not JSON"; }
}
}
evidence["responses"] = responses;
await Bun.write(`${root}/evidence.json`, JSON.stringify(evidence, null, 2) + "\n");
console.log(JSON.stringify(evidence));

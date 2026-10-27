import { eventId, GachaEvent, Region } from "../../shared/schema.ts";
import { serverOffsetUtc } from "../../shared/time.ts";
import type { ParseContext } from "../adapters/types.ts";
import { decodeEntities } from "../html.ts";
import type { SourceParser } from "./types.ts";

export const ZZZ_BANNER_SOURCE_ID = "zzz-zenlessgg-banners";
export const ZZZ_BANNER_RSS_URL = "https://zenless.gg/news/updates/feed/";
const ARCHIVE = "zzz-banner-factual-capture/v1";
const NOTICE = /^V(\d+\.\d+) Limited-Time Channels(?: \(Phase (I|II)\))?$/;
const ITEM = /<item>([\s\S]*?)<\/item>/g;
type Post = { title: string; url: string; publishedAt: string; html: string };
function field(xml: string, tag: string): string {
  const found = [...xml.matchAll(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, "g"))];
  if (found.length !== 1) throw Error(`ZZZ banner RSS missing/duplicate ${tag}`);
  const body = found[0]![1]!.trim();
  const cdata = /^<!\[CDATA\[([\s\S]*?)\]\]>$/.exec(body);
  if (cdata) return cdata[1]!;
  if (body.includes("<")) throw Error(`ZZZ banner RSS markup in ${tag}`);
  return decodeEntities(body);
}
function lines(html: string): string[] {
  return decodeEntities(html.replace(/<br\s*\/?>|<\/(?:p|div|li|h[1-6])>/gi, "\n").replace(/<[^>]*>/g, ""))
    .split(/\r?\n/).map(s => s.replace(/\s+/g, " ").trim()).filter(Boolean);
}
/** Public RSS links/content only; no WordPress/private API or numerical-ID list. */
export function discoverZzzBannerPosts(raw: string): Post[] {
  if (raw.length > 4_000_000 || /<!DOCTYPE|<!ENTITY/i.test(raw) ||
    !/<rss\b[^>]*version="2\.0"/.test(raw) || !/<\/channel>\s*<\/rss>\s*$/.test(raw)) throw Error("ZZZ banner RSS envelope changed");
  const channels = [...raw.matchAll(/<channel>([\s\S]*?)<\/channel>/g)];
  if (channels.length !== 1) throw Error("ZZZ banner RSS channel changed");
  const channel = channels[0]![1]!;
  const items = [...channel.matchAll(ITEM)];
  if (items.length > 100 || items.length !== (channel.match(/<item\b/g) ?? []).length ||
    items.length !== (channel.match(/<\/item>/g) ?? []).length) throw Error("ZZZ banner RSS item boundaries changed");
  const header = channel.replace(ITEM, "").replace(/<image>[\s\S]*?<\/image>/g, "");
  if (field(header, "title") !== "Zenless Zone Zero Updates" || field(header, "link") !== "https://zenless.gg/news/updates/" ||
    field(header, "language") !== "en-US") throw Error("ZZZ banner RSS identity/language changed");
  const seen = new Set<string>();
  return items.map(m => {
    const title = field(m[1]!, "title"), url = field(m[1]!, "link");
    const published = Date.parse(field(m[1]!, "pubDate"));
    if (!/^https:\/\/zenless\.gg\/[a-z0-9-]+\/$/.test(url) || seen.has(url) || !title || !Number.isFinite(published)) throw Error("ZZZ banner RSS invalid/duplicate publication");
    seen.add(url);
    return { title, url, publishedAt: new Date(published).toISOString(), html: field(m[1]!, "content:encoded") };
  });
}
type Clock = { day: string; wall: number; zone: string };
function clock(raw: string): Clock {
  const m = /^(20\d{2})\/(\d{2})\/(\d{2}) (\d{2}):(\d{2}) \((server time|UTC\+8)\)$/.exec(raw);
  if (!m) throw Error(`ZZZ banner missing explicit date/year/zone: ${raw}`);
  const day = `${m[1]}-${m[2]}-${m[3]}T00:00:00.000Z`;
  const ms = Date.parse(day);
  if (!Number.isFinite(ms) || new Date(ms).toISOString() !== day || +m[4]! > 23 || +m[5]! > 59) throw Error("ZZZ banner invalid clock");
  return { day, wall: ms + (+m[4]! * 60 + +m[5]!) * 60000, zone: m[6]! };
}
function updateDays(posts: Post[]): Map<string, string> {
  const days = new Map<string, string>();
  for (const post of posts) {
    const m = /^Version (\d+\.\d+) .+ (?:Update Announcement|Pre-Download.*Update Notice)$/.exec(post.title);
    if (!m) continue;
    const text = lines(post.html);
    const headings = text.map((line, i) => /^(?:\[Update Start Time\]|\[Version Update Time\])$/.test(line) ? i : -1).filter(i => i >= 0);
    if (headings.length !== 1) throw Error("ZZZ banner update reference missing/ambiguous");
    const value = clock((text[headings[0]! + 1] ?? "").replace(/ : We estimate.*$/, ""));
    if (value.zone !== "UTC+8" || !text.some(l => new RegExp(`Version ${m[1]!.replace(".", "\\.")}\\b`).test(l))) throw Error("ZZZ banner update version/zone mismatch");
    if (days.has(m[1]!) && days.get(m[1]!) !== value.day) throw Error("ZZZ banner contradictory update references");
    days.set(m[1]!, value.day);
  }
  return days;
}
function parseNotice(post: Post, days: Map<string, string>, ctx: ParseContext): GachaEvent[] {
  const match = NOTICE.exec(post.title);
  if (!match) {
    if (/Limited.Time Channels/i.test(post.title)) throw Error("ZZZ banner notice title template changed");
    return [];
  }
  const version = match[1]!, phase = match[2] ?? "unspecified";
  const text = lines(post.html);
  const periods = text.filter(l => /^The Agent and W-Engine Signal Search [Ee]vent period is as follows:/.test(l));
  if (periods.length !== 1) throw Error("ZZZ banner missing/ambiguous channel period");
  const period = periods[0]!.replace(/^.*?period is as follows:\s*/, "").replace(/\.?\s*The Signal Search [Ee]vent includes the following content:.*$/, "").replace(/\.$/, "").trim();
  const pieces = period.split(/\s+[–—]\s+/);
  if (pieces.length !== 2) throw Error("ZZZ banner period template changed");
  const end = clock(pieces[1]!);
  if (end.zone !== "server time") throw Error("ZZZ banner end must explicitly be server time");
  let startDay: string;
  const relative = /^After the Version (\d+\.\d+) [Uu]pdate$/.exec(pieces[0]!);
  if (relative) {
    if (relative[1] !== version || !days.has(version)) throw Error("ZZZ banner missing same-version update anchor");
    startDay = days.get(version)!;
  } else {
    const start = clock(pieces[0]!);
    if (start.zone !== "server time" || end.wall <= start.wall) throw Error("ZZZ banner start clock/zone inconsistent");
    startDay = start.day;
  }
  if (end.wall <= Date.parse(startDay) || end.wall - Date.parse(startDay) > 65 * 86400000) throw Error("ZZZ banner period outside bounded notice window");
  const headings = text.flatMap((line, i) => {
    const heading = /^["“](.+)["”] Signal Search Details$/.exec(line);
    if (!heading && /Signal Search Details$/.test(line)) throw Error("ZZZ banner channel heading changed");
    return heading ? [{ title: heading[1]!, index: i }] : [];
  });
  if (!headings.length) throw Error("ZZZ banner notice has no channels");
  const roles: string[] = [];
  const result = headings.map((heading, i) => {
    const section = text.slice(heading.index + 1, headings[i + 1]?.index ?? text.length).join("\n");
    const singular = /limited S-Rank (Agent|W-Engine) ([^\n.!()]+)\s*\(/.exec(section);
    const selectable = /limited S-Rank (Agents|W-Engines) available for selection include: ([^\n]+)/.exec(section);
    const role = singular?.[1] ?? selectable?.[1]?.replace(/s$/, "");
    if (role !== "Agent" && role !== "W-Engine") throw Error(`ZZZ banner missing channel identity: ${heading.title}`);
    const subjects = singular ? [singular[2]!.trim()] : [...selectable![2]!.matchAll(/(?:^|, | and )([^,()]+?)\s*\([^)]*\)/g)].map(m => m[1]!.trim().replace(/^and /, ""));
    if (!subjects.length) throw Error("ZZZ banner featured subjects missing");
    roles.push(role);
    const regionEnds = Object.fromEntries(Region.options.map(region => [region,
      new Date(end.wall - serverOffsetUtc(region, "zzz") * 3600000).toISOString(),
    ]));
    return GachaEvent.parse({ id: eventId("zzz", heading.title, startDay), game: "zzz", title: heading.title,
      recognitionSubjects: subjects, type: "banner",
      summary: `Secondary reproduction by Zenless.gg; Version ${version} Phase ${phase}, ${role} channel. Featured: ${subjects.join(", ")}. Server-day start; no maintenance completion inferred.`,
      startsAt: startDay, startPrecision: "day", endsAt: regionEnds.asia, endPrecision: "exact", regionScoped: true, regionEnds,
      sourceUrl: post.url, sourceId: ctx.sourceId, provenanceStatus: "estimated", confidence: 0.8,
      extractionMethod: "parser", status: "published", version: 1, firstSeenAt: ctx.now, updatedAt: ctx.now });
  });
  if (roles.filter(r => r === "Agent").length !== roles.filter(r => r === "W-Engine").length || !roles.includes("Agent")) throw Error("ZZZ banner incomplete Agent/W-Engine channel set");
  // The independent channel declarations also expose a lost/moved heading.
  for (const line of text.filter(l => /(?:are|is an?) (?:Exclusive|W-Engine) Channels?\./.test(l))) {
    for (const m of line.matchAll(/["“]([^"“”]+)["”]/g)) {
      if (!headings.some(h => h.title === m[1])) throw Error("ZZZ banner declared channel has no parsed section");
    }
  }
  return result;
}
function archiveEvents(raw: string, ctx: ParseContext): GachaEvent[] {
  const data = JSON.parse(raw);
  if (data.schemaVersion !== ARCHIVE || data.sourceUrl !== ZZZ_BANNER_RSS_URL ||
    !/^[a-f0-9]{64}$/.test(data.capture?.sha256) || !Number.isInteger(data.capture?.bytes) || data.capture.bytes < 1 ||
    !Number.isFinite(Date.parse(data.capture?.at)) || !Array.isArray(data.events) || data.events.length > 100) throw Error("ZZZ banner factual capture invalid");
  return data.events.map((value: unknown) => {
    const event = GachaEvent.parse(value);
    if (event.game !== "zzz" || event.type !== "banner" || event.sourceId !== ZZZ_BANNER_SOURCE_ID ||
      event.provenanceStatus !== "estimated" || event.confidence !== 0.8 || event.extractionMethod !== "parser" ||
      !/^https:\/\/zenless\.gg\/[a-z0-9-]+\/$/.test(event.sourceUrl) ||
      event.id !== eventId("zzz", event.title, event.startsAt) || event.startPrecision !== "day" || event.endPrecision !== "exact" ||
      !event.regionScoped || !Region.options.every(r => event.regionEnds?.[r])) throw Error("ZZZ banner factual capture identity mismatch");
    return { ...event, firstSeenAt: ctx.now, updatedAt: ctx.now };
  });
}
export function parseZzzBannerRss(raw: string, ctx: ParseContext): GachaEvent[] {
  if (ctx.game !== "zzz" || ctx.sourceId !== ZZZ_BANNER_SOURCE_ID || ctx.sourceUrl !== ZZZ_BANNER_RSS_URL) throw Error("ZZZ banner parser context mismatch");
  const posts = raw.trimStart().startsWith("{") ? null : discoverZzzBannerPosts(raw);
  const days = posts ? updateDays(posts) : null;
  const events = posts ? posts.flatMap(p => parseNotice(p, days!, ctx)) : archiveEvents(raw, ctx);
  if (new Set(events.map(e => e.id)).size !== events.length) throw Error("ZZZ banner duplicate/contradictory channel notices");
  return events.sort((a,b) => a.id.localeCompare(b.id));
}
/** Factual persistent cache; raw publisher prose stays only in short-lived runner diagnostics. */
export function captureZzzBannerFacts(bytes: Uint8Array, events: GachaEvent[], at: string, previous?: string): string {
  const sha256 = new Bun.CryptoHasher("sha256").update(bytes).digest("hex");
  if (previous) {
    try {
      const old = JSON.parse(previous);
      const ctx = { now: at, game: "zzz" as const, sourceId: ZZZ_BANNER_SOURCE_ID, sourceUrl: ZZZ_BANNER_RSS_URL };
      if (old.capture?.sha256 === sha256 && JSON.stringify(archiveEvents(previous, ctx)) === JSON.stringify(events)) return previous;
    } catch { /* Replace an unusable cache only with this successfully parsed HTTP body. */ }
  }
  return JSON.stringify({ schemaVersion: ARCHIVE, sourceUrl: ZZZ_BANNER_RSS_URL,
    capture: { at, bytes: bytes.byteLength, sha256 }, events }, null, 2) + "\n";
}
export const zzzBannerRssParser: SourceParser = {
  id: "zzz-zenlessgg-banners", label: "Zenless.gg dated channels (secondary RSS)",
  canParse: raw => { try { raw.trimStart().startsWith("{") ? archiveEvents(raw, { now:"2026-01-01T00:00:00.000Z", sourceUrl:ZZZ_BANNER_RSS_URL, sourceId:ZZZ_BANNER_SOURCE_ID, game:"zzz" }) : discoverZzzBannerPosts(raw); return true; } catch { return false; } },
  parse: parseZzzBannerRss,
};

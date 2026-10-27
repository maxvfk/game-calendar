import { eventId, GachaEvent, type EventType } from "../../shared/schema.ts";
import type { ParseContext } from "../adapters/types.ts";
import { decodeEntities } from "../html.ts";
import type { SourceParser } from "./types.ts";

export const ZZZ_STEAM_RSS_URL = "https://steamcommunity.com/games/4162040/rss/";
const COMMUNITY_URL = "https://steamcommunity.com/games/4162040";
const ITEM = /<item>([\s\S]*?)<\/item>/g;
const UPDATE_TITLE = /^Version (\d+\.\d+) .+ Update Announcement$/;
const STAMP = /^(20\d{2})\/(\d{2})\/(\d{2}) (\d{2}):(\d{2}) \((server time|UTC\+8)\)$/;

type Post = { title: string; url: string; author: string; publishedAt: string; html: string };

/** The observed, flat Steam RSS vocabulary; not a general XML/HTML parser. */
function field(xml: string, tag: string, attributes = ""): string {
  const matches = [...xml.matchAll(new RegExp(`<${tag}${attributes}>([\\s\\S]*?)</${tag}>`, "g"))];
  if (matches.length !== 1) throw new Error(`ZZZ RSS missing/duplicate ${tag}`);
  const body = matches[0]![1]!.trim();
  const cdata = /^<!\[CDATA\[([\s\S]*?)\]\]>$/.exec(body);
  if (cdata) return cdata[1]!;
  if (body.includes("<")) throw new Error(`ZZZ RSS unexpected markup in ${tag}`);
  return decodeEntities(body);
}

/** Identities are discovered from feed items, never from a list of numerical IDs. */
export function discoverZzzSteamPosts(raw: string): Post[] {
  if (raw.length > 4_000_000 || /<!DOCTYPE|<!ENTITY/i.test(raw) ||
    !/<rss\b[^>]*\bversion="2\.0"[^>]*>/.test(raw) || !/<\/channel>\s*<\/rss>\s*$/.test(raw)) {
    throw new Error("ZZZ RSS envelope missing/unsupported");
  }
  const channel = fieldChannel(raw);
  const items = [...channel.matchAll(ITEM)];
  if (items.length > 100 || items.length !== (channel.match(/<item\b/g) ?? []).length ||
    items.length !== (channel.match(/<\/item>/g) ?? []).length) throw new Error("ZZZ RSS item boundaries malformed");
  const header = channel.replace(ITEM, "").replace(/<image>[\s\S]*?<\/image>/g, "");
  if (field(header, "title") !== "Zenless Zone Zero RSS Feed" ||
    field(header, "link") !== COMMUNITY_URL || field(header, "language") !== "en-us" ||
    field(header, "generator") !== "Steam Community RSS") throw new Error("ZZZ RSS publisher channel mismatch");
  const urls = new Set<string>();
  return items.map(item => {
    const body = item[1]!;
    const url = field(body, "link");
    if (!/^https:\/\/steamcommunity\.com\/games\/4162040\/announcements\/detail\/\d+$/.test(url) ||
      field(body, "guid", '\\s+isPermaLink="true"') !== url || urls.has(url)) {
      throw new Error("ZZZ RSS publication URL/identity mismatch");
    }
    urls.add(url);
    const title = field(body, "title"), author = field(body, "author");
    const published = Date.parse(field(body, "pubDate"));
    if (!title || !author || !Number.isFinite(published)) throw new Error("ZZZ RSS publication metadata missing");
    return { title, author, url, publishedAt: new Date(published).toISOString(), html: field(body, "description") };
  });
}

function fieldChannel(raw: string): string {
  const channels = [...raw.matchAll(/<channel>([\s\S]*?)<\/channel>/g)];
  if (channels.length !== 1) throw new Error("ZZZ RSS channel missing/duplicate");
  return channels[0]![1]!;
}

function lines(html: string): string[] {
  return decodeEntities(html.replace(/<br\s*\/?>|<\/(?:p|div|li|h[1-6])>/gi, "\n")
    .replace(/<[^>]*>/g, ""))
    .split(/\r?\n/).map(s => s.replace(/\s+/g, " ").trim()).filter(Boolean);
}

type Clock = { day: string; wall: number; zone: "server time" | "UTC+8" };
function clock(raw: string): Clock {
  const m = STAMP.exec(raw);
  if (!m) throw new Error(`ZZZ unsupported date/zone: ${raw}`);
  const day = `${m[1]}-${m[2]}-${m[3]}T00:00:00.000Z`;
  const time = Date.parse(day);
  if (!Number.isFinite(time) || new Date(time).toISOString() !== day ||
    Number(m[4]) > 23 || Number(m[5]) > 59) throw new Error(`ZZZ invalid date/clock: ${raw}`);
  return { day, wall: time + (Number(m[4]) * 60 + Number(m[5])) * 60_000, zone: m[6] as Clock["zone"] };
}
const instant = (value: Clock, offset: number) => new Date(value.wall - offset * 3_600_000).toISOString();

function oneLine(text: string[], pattern: RegExp, name: string): RegExpExecArray {
  const matches = text.map(line => pattern.exec(line)).filter((m): m is RegExpExecArray => m !== null);
  if (matches.length !== 1) throw new Error(`ZZZ missing/ambiguous ${name}`);
  return matches[0]!;
}

function parsePost(post: Post, ctx: ParseContext): GachaEvent[] {
  const version = UPDATE_TITLE.exec(post.title)?.[1];
  if (!version) {
    if (/\bVersion \d+\.\d+\b/.test(post.title) && /Update Announcement/i.test(post.title)) {
      throw new Error("ZZZ version-update title template changed");
    }
    return []; // previews, account help, store promotions and phase notices are outside this parser
  }
  const text = lines(post.html);
  const bodyVersion = new RegExp(`updated content and compensation for Version ${version.replace(".", "\\.")}\\b`);
  if (!text.some(line => bodyVersion.test(line))) {
    throw new Error("ZZZ title/body version mismatch");
  }
  const startHeadings = text.map((line, i) => /^\\?\[Update Start Time\]$/.test(line) ? i : -1).filter(i => i >= 0);
  if (startHeadings.length !== 1) throw new Error("ZZZ update start missing/ambiguous");
  const update = clock(text[startHeadings[0]! + 1] ?? "");
  if (update.zone !== "UTC+8") throw new Error("ZZZ update start zone changed");
  // Explicit version-end clause, never update + 42 days or maintenance + 5 hours.
  const endPattern = new RegExp(`Version ${version.replace(".", "\\.")} will run for \\d+ days, ending on (20\\d{2}/\\d{2}/\\d{2} \\d{2}:\\d{2} \\(UTC\\+8\\))\\.`);
  const versionEnds = text.flatMap(line => { const m = endPattern.exec(line); return m ? [clock(m[1]!)] : []; });
  if (versionEnds.length > 1) throw new Error("ZZZ ambiguous version end");
  const headings = text.map((line, index) => /^\d+\. New Events$/.test(line) ? index : -1).filter(i => i >= 0);
  if (headings.length !== 1) throw new Error("ZZZ New Events section missing/ambiguous");
  const from = headings[0]! + 1;
  const next = text.findIndex((line, index) => index >= from && /^\d+\. /.test(line));
  if (next < 0) throw new Error("ZZZ New Events section end missing");
  const section = text.slice(from, next);
  const blocks: Array<{ title: string; body: string[] }> = [];
  for (const line of section) {
    if (line.startsWith("• ")) blocks.push({ title: line.slice(2).trim(), body: [] });
    else {
      const current = blocks.at(-1);
      if (!current) throw new Error("ZZZ unbounded event text");
      current.body.push(line);
    }
  }
  if (!blocks.length || blocks.length > 100) throw new Error("ZZZ event headings missing/excessive");
  const seen = new Set<string>();
  return blocks.flatMap(block => {
    if (!block.title || block.title.length > 200 || block.body.length > 80) throw new Error("ZZZ event section limit");
    // No channels/trials synthesized from version or phase dates, even if moved into this section.
    if (/\b(?:Signal Search|Audition Stage|Channel|Banner)\b/i.test(block.title)) return [];
    // The captured 3.1 section also includes an external referral/prize campaign.
    if (block.body.some(line => /^Invite friends to return or register for the game\b/i.test(line))) return [];
    const duration = oneLine(block.body, /^Event Duration: (.+)$/, "event-local duration")[1]!;
    const pair = duration.split(/ [–—] | - /);
    if (pair.length !== 2) throw new Error(`ZZZ ambiguous event duration: ${block.title}`);
    const relativeStart = /^After the Version (\d+\.\d+) update$/.exec(pair[0]!);
    if (relativeStart && relativeStart[1] !== version) throw new Error("ZZZ relative start version mismatch");
    const start = relativeStart ? update : clock(pair[0]!);
    const relativeEnd = /^End of Version (\d+\.\d+)$/.exec(pair[1]!);
    if (relativeEnd && (relativeEnd[1] !== version || !versionEnds[0])) throw new Error("ZZZ version end not explicitly grounded");
    const end = relativeEnd ? versionEnds[0]! : clock(pair[1]!);
    if (end.wall <= start.wall) throw new Error("ZZZ reversed period");
    const startsAt = relativeStart || start.zone === "server time" ? start.day : instant(start, 8);
    const regionEnds = end.zone === "server time" ? {
      asia: instant(end, 8), europe: instant(end, 1), america: instant(end, -5),
    } : null;
    const type: EventType = block.body.some(line => /\b(?:log in|check in) for a total of \d+ days\b/i.test(line)) ? "login" : "other";
    const event = GachaEvent.parse({
      id: eventId("zzz", block.title, startsAt), game: "zzz", title: block.title, type,
      summary: null, startsAt, startPrecision: relativeStart || start.zone === "server time" ? "day" : "exact",
      endsAt: regionEnds?.asia ?? instant(end, 8), endPrecision: "exact",
      regionScoped: regionEnds !== null, regionEnds,
      sourceUrl: post.url, sourceId: ctx.sourceId, provenanceStatus: "official",
      confidence: 0.9, extractionMethod: "parser", status: "published", version: 1,
      firstSeenAt: ctx.now, updatedAt: ctx.now,
    });
    if (seen.has(event.id)) throw new Error("ZZZ duplicate event identity within update");
    seen.add(event.id);
    return [event];
  });
}

export function parseZzzSteamRss(raw: string, ctx: ParseContext): GachaEvent[] {
  const result = new Map<string, GachaEvent>();
  for (const post of discoverZzzSteamPosts(raw).sort((a, b) => a.url.localeCompare(b.url))) {
    for (const event of parsePost(post, ctx)) {
      const old = result.get(event.id);
      if (old && (old.title !== event.title || old.startsAt !== event.startsAt || old.endsAt !== event.endsAt ||
        old.startPrecision !== event.startPrecision || JSON.stringify(old.regionEnds) !== JSON.stringify(event.regionEnds))) {
        throw new Error("ZZZ conflicting official event identity");
      }
      if (!old) result.set(event.id, event);
    }
  }
  return [...result.values()].sort((a, b) => a.id.localeCompare(b.id));
}

export const zzzSteamRssParser: SourceParser = {
  id: "zzz-steam-rss", label: "ZZZ official publisher Steam RSS (events only)",
  canParse(raw) { try { discoverZzzSteamPosts(raw); return true; } catch { return false; } },
  parse: parseZzzSteamRss,
};

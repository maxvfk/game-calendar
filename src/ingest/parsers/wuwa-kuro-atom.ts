import { eventId, GachaEvent, type EventType } from "../../shared/schema.ts";
import type { ParseContext } from "../adapters/types.ts";
import { decodeEntities } from "../html.ts";
import type { SourceParser } from "./types.ts";

const ENTRY = /<entry>([\s\S]*?)<\/entry>/g;
const DATE = /(20\d{2})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})/g;
type Article = { id: string; title: string; lines: string[] };

function day(match: RegExpMatchArray): string {
  const date = `${match[1]}-${match[2]}-${match[3]}`;
  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (!Number.isFinite(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== date ||
    Number(match[4]) > 23 || Number(match[5]) > 59) throw new Error(`WuWa invalid date: ${match[0]}`);
  return parsed.toISOString();
}

function serverTime(match: RegExpMatchArray, offset: number): string {
  return new Date(Date.parse(day(match)) + (Number(match[4]) * 60 + Number(match[5]) - offset * 60) * 60_000).toISOString();
}

function articles(raw: string): Article[] {
  if (!/<feed\s+xmlns="http:\/\/www\.w3\.org\/2005\/Atom">/.test(raw)) {
    throw new Error("WuWa Atom feed namespace missing");
  }
  return [...raw.matchAll(ENTRY)].map(m => {
    const body = m[1]!;
    const id = /<id>urn:article:(\d+)<\/id>/.exec(body)?.[1];
    const title = /<title>([\s\S]*?)<\/title>/.exec(body)?.[1];
    const link = /<link\s+href="([^"]+)"/.exec(body)?.[1];
    const content = /<content\s+type="html"><!\[CDATA\[([\s\S]*?)\]\]><\/content>/.exec(body)?.[1];
    if (!id || !title || !content || link !== `https://wutheringwaves.kurogames.com/en/main/news/detail/${id}`) {
      throw new Error("WuWa Atom article schema/link mismatch");
    }
    const lines = decodeEntities(content
      .replace(/<\/(?:p|li|h[1-6]|div)>/gi, "\n")
      .replace(/<br\s*\/?\s*>/gi, "\n")
      .replace(/<[^>]*>/g, " "))
      .split("\n").map(s => s.replace(/\s+/g, " ").trim()).filter(Boolean);
    return { id, title: decodeEntities(title), lines };
  });
}

function updateDays(archive: Article[]): Map<string, string> {
  const result = new Map<string, string>();
  for (const article of archive) {
    const version = /Version (\d+\.\d+) (?:Update Maintenance Notice|Patch Notes)/i.exec(article.title)?.[1]
      ?? /Patch Notes for Version (\d+\.\d+)/i.exec(article.title)?.[1];
    if (!version) continue;
    const line = article.lines.find(s => /Maintenance Time:\s*20\d{2}-.*\(UTC\+8\)/i.test(s));
    const first = line && /(20\d{2})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})/.exec(line);
    if (!first) continue;
    const date = day(first);
    const old = result.get(version);
    if (old && old !== date) throw new Error(`WuWa conflicting Version ${version} maintenance date`);
    result.set(version, date);
  }
  return result;
}

function identity(line: string): { title: string; type: EventType } | null {
  const m = /^\[([^\]]+)\]\s+(.+)$/.exec(line);
  if (!m) return null;
  const label = m[2]!;
  if (/Featured (?:Resonator|Weapon) Convene/i.test(label)) return { title: m[1]!, type: "banner" };
  if (/Featured Exploration Event:/i.test(label)) {
    return { title: `${m[1]}: ${label.split(":").slice(1).join(":").trim()}`, type: "other" };
  }
  if (/\bLogin Event\b/i.test(label)) return { title: m[1]!, type: "login" };
  if (/\bCombat Event\b/i.test(label)) return { title: m[1]!, type: "challenge" };
  if (/\bEvent\b/i.test(label)) return { title: m[1]!, type: "other" };
  return null;
}

function period(line: string, updates: Map<string, string>) {
  if (!/\(server time\)/i.test(line)) return null;
  const times = [...line.matchAll(DATE)];
  const relative = /(?:after (?:the )?)?Version (\d+\.\d+) [Uu]pdate/i.exec(line)?.[1];
  const start = relative ? updates.get(relative) : times[0] && day(times[0]);
  const end = relative ? times[0] : times[1];
  if (!start || !end) return null;
  return { start, endsAt: serverTime(end, 8), regionEnds: {
    asia: serverTime(end, 8), europe: serverTime(end, 1), america: serverTime(end, -5),
  } };
}

function candidate(article: Article, title: string, type: EventType, line: string, updates: Map<string, string>, ctx: ParseContext): GachaEvent | null {
  const dates = period(line, updates);
  if (!dates) return null;
  return GachaEvent.parse({
    id: eventId("wuwa", title, dates.start), game: "wuwa", title, type, summary: null,
    startsAt: dates.start, startPrecision: "day", endsAt: dates.endsAt, endPrecision: "exact",
    regionScoped: true, regionEnds: dates.regionEnds,
    sourceUrl: `https://wutheringwaves.kurogames.com/en/main/news/detail/${article.id}`,
    sourceId: ctx.sourceId, status: "published", confidence: 0.8,
    extractionMethod: "parser", version: 1, firstSeenAt: ctx.now, updatedAt: ctx.now,
  });
}

export function parseWuwaKuroAtom(raw: string, ctx: ParseContext): GachaEvent[] {
  const archive = articles(raw);
  if (!archive.length) throw new Error("WuWa Atom entries missing");
  const updates = updateDays(archive);
  const seen = new Map<string, GachaEvent>();
  const add = (value: GachaEvent | null) => {
    if (!value) return;
    const old = seen.get(value.id);
    if (old && (old.endsAt !== value.endsAt || old.startsAt !== value.startsAt ||
      JSON.stringify(old.regionEnds) !== JSON.stringify(value.regionEnds))) {
      throw new Error(`WuWa Atom conflicting duplicate: ${value.id}`);
    }
    if (!old) seen.set(value.id, value);
  };
  for (const article of archive) {
    const standalone = /\[([^\]]+)\]\s+(?:Combat Event|Featured (?:Resonator|Weapon) Convene)/i.exec(article.title)?.[1];
    const candidates = standalone ? [`[${standalone}] ${/Convene/i.test(article.title) ? "Featured Resonator Convene" : "Combat Event"}`, ...article.lines] : article.lines;
    for (let i = 0; i < candidates.length; i++) {
      const item = identity(candidates[i]!);
      if (!item) continue;
      const near: string[] = [];
      for (const line of candidates.slice(i + 1, i + 9)) {
        if (identity(line)) break;
        near.push(line);
      }
      const duration = near.find(s => /\(server time\)/i.test(s) &&
        (/^Duration:/i.test(s) || /^20\d{2}-/.test(s) || /^Version \d+\.\d+ [Uu]pdate/i.test(s)));
      if (duration) add(candidate(article, item.title, item.type, duration, updates, ctx));
    }
  }
  if (!seen.size) throw new Error("WuWa Atom no dated calendar notices");
  return [...seen.values()].sort((a, b) => a.id.localeCompare(b.id));
}

export const wuwaKuroAtomParser: SourceParser = {
  id: "wuwa-kuro-atom", label: "WuWa Kuro notice Atom mirror",
  canParse(raw) { try { return articles(raw).length > 0; } catch { return false; } },
  parse: parseWuwaKuroAtom,
};

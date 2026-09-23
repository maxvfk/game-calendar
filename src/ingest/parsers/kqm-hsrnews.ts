import { eventId, GachaEvent, type EventType } from "../../shared/schema.ts";
import type { ParseContext } from "../adapters/types.ts";
import type { SourceParser } from "./types.ts";

const ARTICLE = /^# \[([^\n]+)\]\(archive\/(\d+)\.md\)\s*$/gm;
const CLOCK = /(20\d{2})\/(\d{2})\/(\d{2})\s+(\d{2}):(\d{2}):(\d{2})\s*\((server|global)\)/gi;
const AFTER_UPDATE = /After the Version (\d+\.\d+) update/i;

interface Article { heading: string; id: string; body: string }
interface Clock { day: string; utc8: string; zone: "server" | "global" }

function articles(raw: string): Article[] {
  const matches = [...raw.matchAll(ARTICLE)];
  return matches.map((match, i) => ({
    heading: match[1]!, id: match[2]!,
    body: raw.slice(match.index! + match[0].length, matches[i + 1]?.index ?? raw.length),
  }));
}

function clocks(raw: string): Clock[] {
  return [...raw.matchAll(CLOCK)].map(m => {
    const [year, month, date, hour, minute, second] = m.slice(1, 7).map(Number);
    const ms = Date.UTC(year!, month! - 1, date!, hour!, minute!, second!);
    const normalized = new Date(ms).toISOString();
    if (normalized.slice(0, 10) !== `${m[1]}-${m[2]}-${m[3]}` ||
      normalized.slice(11, 19) !== `${m[4]}:${m[5]}:${m[6]}`) {
      throw new Error(`KQM HSRNews invalid calendar clock: ${m[0]}`);
    }
    return {
      day: `${m[1]}-${m[2]}-${m[3]}T00:00:00.000Z`,
      utc8: new Date(ms - 8 * 3_600_000).toISOString(),
      zone: m[7]!.toLowerCase() as "server" | "global",
    };
  });
}

function updateDays(archive: Article[]): Map<string, string> {
  const result = new Map<string, string>();
  for (const article of archive) {
    const version = /Version (\d+\.\d+) .*Update Details/i.exec(article.heading)?.[1];
    const line = /^Begins at\s+(.+)$/mi.exec(article.body)?.[1];
    const first = line && clocks(line)[0];
    if (!version || !first || first.zone !== "global") continue;
    const old = result.get(version);
    if (old && old !== first.day) throw new Error(`KQM HSRNews conflicting update day: ${version}`);
    result.set(version, first.day);
  }
  return result;
}

function period(line: string, updates: Map<string, string>) {
  const found = clocks(line);
  const relative = AFTER_UPDATE.exec(line)?.[1];
  const startClock = relative ? null : found[0];
  const start = relative ? updates.get(relative) : startClock?.zone === "global" ? startClock.utc8 : startClock?.day;
  const end = relative ? found[0] : found[1];
  if (!start || !end) return null;
  const regionEnds = end.zone === "server" ? {
    asia: end.utc8,
    europe: new Date(Date.parse(end.utc8) + 7 * 3_600_000).toISOString(),
    america: new Date(Date.parse(end.utc8) + 13 * 3_600_000).toISOString(),
  } : null;
  return {
    start, startPrecision: startClock?.zone === "global" ? "exact" : "day",
    end: end.utc8, regionEnds,
  } as const;
}

function item(article: Article, title: string, type: EventType, line: string, updates: Map<string, string>, ctx: ParseContext): GachaEvent | null {
  const dates = period(line, updates);
  if (!dates) return null;
  return GachaEvent.parse({
    id: eventId("hsr", title, dates.start), game: "hsr", title, type, summary: null,
    startsAt: dates.start, startPrecision: dates.startPrecision,
    endsAt: dates.end, endPrecision: "exact", regionScoped: dates.regionEnds !== null,
    regionEnds: dates.regionEnds,
    sourceUrl: `https://github.com/KQM-git/HSRNews/blob/master/archive/${article.id}.md`,
    sourceId: ctx.sourceId, status: "published", confidence: 0.8,
    extractionMethod: "parser", version: 1, firstSeenAt: ctx.now, updatedAt: ctx.now,
  });
}

export function parseKqmHsrNews(raw: string, ctx: ParseContext): GachaEvent[] {
  const archive = articles(raw);
  if (!archive.length) throw new Error("KQM HSRNews archive headings missing");
  const updates = updateDays(archive);
  const seen = new Map<string, GachaEvent>();
  const add = (value: GachaEvent | null) => {
    if (!value) return;
    const old = seen.get(value.id);
    if (old && (old.startsAt !== value.startsAt || old.endsAt !== value.endsAt ||
      JSON.stringify(old.regionEnds) !== JSON.stringify(value.regionEnds))) {
      throw new Error(`KQM HSRNews conflicting duplicate: ${value.id}`);
    }
    seen.set(value.id, value);
  };
  for (const article of archive) {
    const rows = article.body.split("\n").map(s => s.trim());
    const standalone = /^(.+?) Event:/.exec(article.heading)?.[1];
    if (standalone) {
      const index = rows.indexOf("### Event Period");
      if (index >= 0) add(item(article, standalone, "other",
        rows.slice(index + 1).find(Boolean) ?? "", updates, ctx));
    }
    if (/Version \d+\.\d+ .*Update Details/i.test(article.heading)) {
      let inEvents = false;
      for (let i = 0; i < rows.length; i++) {
        if (/^6\. New Events$/.test(rows[i]!)) { inEvents = true; continue; }
        if (/^7\. Others$/.test(rows[i]!)) inEvents = false;
        const event = inEvents ? /^\*\*■ ([^*]+)\*\*$/.exec(rows[i]!) : null;
        const mode = /^- (Apocalyptic Shadow: [^\n]+|Pure Fiction: [^\n]+)$/.exec(rows[i]!);
        if (!event && !mode) continue;
        const near: string[] = [];
        for (const next of rows.slice(i + 1, i + 12)) {
          if (/^(?:\*\*■ |\d+\. |[-] (?:Apocalyptic Shadow:|Pure Fiction:))/.test(next)) break;
          near.push(next);
        }
        const line = event ? near.find(s => /^- Event Period:/.test(s)) : near.find(s => /^20\d{2}\//.test(s));
        if (!line) continue; // Gift of Odyssey has no announced schedule.
        const name = event?.[1] ?? mode![1]!;
        add(item(article, name, mode || /^(?:Overdrive|Minuscule)/.test(name) ? "challenge" : "other", line, updates, ctx));
      }
    }
    const bp = /^Version (\d+\.\d+) "Nameless Honor" Update/i.exec(article.heading);
    if (bp) {
      const index = rows.indexOf("### Start Date");
      if (index < 0) throw new Error("KQM HSRNews Nameless Honor main period missing");
      add(item(article, `Version ${bp[1]} Nameless Honor`, "other",
        rows.slice(index + 1).find(Boolean) ?? "", updates, ctx));
    }
  }
  if (!seen.size) throw new Error("KQM HSRNews no dated calendar notices");
  return [...seen.values()].sort((a, b) => a.id.localeCompare(b.id));
}

export const kqmHsrNewsParser: SourceParser = {
  id: "kqm-hsrnews", label: "KQM HSRNews factual notice dates",
  canParse(raw) { return articles(raw).length > 0; },
  parse: parseKqmHsrNews,
};

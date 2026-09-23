import { eventId, GachaEvent, type EventType } from "../../shared/schema.ts";
import type { ParseContext } from "../adapters/types.ts";
import type { SourceParser } from "./types.ts";

// The Markdown is an extraction surface for in-game notices, not publisher
// provenance. Read only article headings and the relevant duration row.
const ARTICLE = /^# \[([^\n]+)\]\(archive\/(\d+)\.md\)\s*$/gm;
const TAG = /<t\s+class="t_(?:lc|gl)"[^>]*>(20\d{2})\/(\d{2})\/(\d{2})\s+\d{2}:\d{2}<\/t>/g;
const AFTER_UPDATE = /After (?:the )?Version (\d+\.\d+) [Uu]pdate/i;

interface Article { heading: string; id: string; body: string }

function articles(raw: string): Article[] {
  const matches = [...raw.matchAll(ARTICLE)];
  return matches.map((match, i) => ({
    heading: match[1]!, id: match[2]!,
    body: raw.slice(match.index! + match[0].length, matches[i + 1]?.index ?? raw.length),
  }));
}

function day(year: string, month: string, date: string): string {
  const iso = `${year}-${month}-${date}`;
  const parsed = new Date(`${iso}T00:00:00.000Z`);
  if (!Number.isFinite(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== iso) {
    throw new Error(`KQM GINews invalid date: ${iso}`);
  }
  return parsed.toISOString();
}

function taggedDays(line: string): string[] {
  return [...line.matchAll(TAG)].map(m => day(m[1]!, m[2]!, m[3]!));
}

function updateDays(archive: Article[]): Map<string, string> {
  const found = new Map<string, string>();
  for (const article of archive) {
    const version = /Version (\d+\.\d+) Update Details/i.exec(article.heading)?.[1];
    if (!version) continue;
    const schedule = /^Update maintenance begins\s+(.+)$/mi.exec(article.body)?.[1];
    const date = schedule && taggedDays(schedule)[0];
    if (!date) continue;
    const previous = found.get(version);
    if (previous && previous !== date) throw new Error(`KQM GINews conflicting Version ${version} update days`);
    found.set(version, date);
  }
  return found;
}

function entity(article: Article, update: Map<string, string>): { title: string; type: EventType } | null {
  const heading = article.heading;
  if (/^Event Wish /i.test(heading)) {
    const title = /^Event Wish "([^"]+)"/.exec(heading)?.[1];
    if (!title) return null;
    if (title !== "Epitome Invocation") return { title, type: "banner" };
    const version = AFTER_UPDATE.exec(article.body)?.[1];
    // The name is reused every phase. Only the after-update Phase I identity
    // can be derived from this notice without guessing another phase number.
    return version && update.has(version)
      ? { title: `Epitome Invocation — Version ${version} Phase I`, type: "banner" } : null;
  }
  if (/^"Moontrace" Event Details/i.test(heading)) {
    const version = AFTER_UPDATE.exec(article.body)?.[1];
    return version ? { title: `Moontrace — Version ${version} Battle Pass`, type: "other" } : null;
  }
  if (/^Complete the Archon Quest /i.test(heading)) {
    const title = /"([^"]+)"/.exec(heading)?.[1];
    return title ? { title: `${title} — Limited-Time Archon Quest Rewards`, type: "story" } : null;
  }
  if (/^"Rainbow's End: Resplendent Starlight" Event/i.test(heading)) return null;
  const title = /^"([^"]+)" Event:/.exec(heading)?.[1];
  if (!title) return null;
  // The archived headline differs from an already published localStorage key.
  if (title === "Tabletop Troupe: A Gathering on Adventure's Eve") {
    return { title: "Tabletop Troupe: A Gathering on Adventurer's Eve", type: "other" };
  }
  return { title, type: title === "Silverwing in Pursuit of the Moon" ? "story" : "other" };
}

function period(line: string, update: Map<string, string>): { start: string; end: string | null } | null {
  const dates = taggedDays(line);
  const relative = AFTER_UPDATE.exec(line)?.[1];
  const start = relative ? update.get(relative) : dates[0];
  if (!start) return null; // An older update date absent from this document is unknown.
  const end = relative ? dates[0] ?? null : dates[1] ?? null;
  return { start, end };
}

function candidate(article: Article, item: { title: string; type: EventType }, update: Map<string, string>, ctx: ParseContext): GachaEvent | null {
  const rows = article.body.split("\n").map(s => s.trim());
  // A single gameplay table has three unlock phases and one event end.
  const row = rows.find(s => /^(?:Event Duration:\s*|Event Gameplay Phases \| Phase I \||After (?:the )?Version \d+\.\d+ [Uu]pdate\s*[–—-]|<t class="t_(?:lc|gl)"[^>]*>20\d{2}\/)/.test(s));
  if (!row) return null;
  if (row.startsWith("Event Gameplay Phases | Phase I |") && taggedDays(row).length !== 2) {
    throw new Error(`KQM GINews malformed gameplay phase dates: ${article.id}`);
  }
  const dates = period(row, update);
  if (!dates) return null;
  return GachaEvent.parse({
    id: eventId("genshin", item.title, dates.start), game: "genshin", ...item,
    summary: null, startsAt: dates.start, startPrecision: "day",
    endsAt: dates.end, endPrecision: dates.end ? "day" : "unknown",
    regionScoped: false, regionEnds: null,
    sourceUrl: `https://github.com/KQM-git/GINews/blob/master/archive/${article.id}.md`,
    sourceId: ctx.sourceId, status: "published", confidence: 0.8,
    extractionMethod: "parser", version: 1, firstSeenAt: ctx.now, updatedAt: ctx.now,
  });
}

export function parseKqmGinNews(raw: string, ctx: ParseContext): GachaEvent[] {
  const archive = articles(raw);
  if (!archive.length) throw new Error("KQM GINews archive headings missing");
  const update = updateDays(archive);
  const seen = new Map<string, GachaEvent>();
  const add = (event: GachaEvent | null) => {
    if (!event) return;
    const old = seen.get(event.id);
    if (old && (old.endsAt !== event.endsAt || old.startsAt !== event.startsAt)) {
      throw new Error(`KQM GINews conflicting duplicate: ${event.id}`);
    }
    seen.set(event.id, event);
  };
  for (const article of archive) {
    if (/^"Rainbow's End: Resplendent Starlight" Event/i.test(article.heading)) {
      const missive = /〓Missive of Grace: A Thank-You Gift〓([\s\S]*?)(?=〓|$)/.exec(article.body)?.[1];
      const starlight = /〓Resplendent Starlight - Daily Login Event〓([\s\S]*?)(?=〓|$)/.exec(article.body)?.[1];
      for (const [title, block] of [["Missive of Grace: A Thank-You Gift", missive], ["Resplendent Starlight", starlight]] as const) {
        if (!block) throw new Error(`KQM GINews login subsection missing: ${title}`);
        const line = /^Event Duration:\s*(.+)$/mi.exec(block)?.[1];
        if (!line) throw new Error(`KQM GINews login duration missing: ${title}`);
        add(candidate({ ...article, body: line }, { title, type: "login" }, update, ctx));
      }
      continue;
    }
    const item = entity(article, update);
    if (item) add(candidate(article, item, update, ctx));
  }
  if (seen.size === 0) throw new Error("KQM GINews no dated calendar notices");
  return [...seen.values()].sort((a, b) => a.id.localeCompare(b.id));
}

export const kqmGinNewsParser: SourceParser = {
  id: "kqm-ginews", label: "KQM GINews factual notice dates",
  canParse(raw) { return articles(raw).length > 0; },
  parse: parseKqmGinNews,
};

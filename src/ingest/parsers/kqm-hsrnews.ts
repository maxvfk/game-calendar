import { eventId, GachaEvent, type EventType } from "../../shared/schema.ts";
import type { ParseContext } from "../adapters/types.ts";
import type { SourceParser } from "./types.ts";

const ARTICLE = /^# \[([^\n]+)\]\(archive\/(\d+)\.md\)\s*$/gm;
const CLOCK = /(20\d{2})\/(\d{2})\/(\d{2})\s+(\d{2}):(\d{2}):(\d{2})\s*\((server|global)\)/gi;
const AFTER_UPDATE = /After the Version (\d+\.\d+) update/i;
const LIGHTWARD_MODE = /^- (Memory of Chaos: [^\n]+|Apocalyptic Shadow: [^\n]+|Pure Fiction: [^\n]+)$/;
const LIGHTWARD_PERIOD = new RegExp(`^(?:${AFTER_UPDATE.source}|${CLOCK.source})\\s*[-–—]\\s*${CLOCK.source}$`, "i");
const PARK_REWARDS: Record<string, { field: string; type: EventType; summary: string }> = {
  "Astral Imagea Park: Astral Trendible": {
    field: "Availability", type: "other",
    summary: "Limited Astral Trendible draw availability for this Imagea pool; the Astral Imagea Park itself remains accessible.",
  },
  "Astral Imagea Park: Park Souvenir": {
    field: "Claim Period", type: "login",
    summary: "Log in to claim six Trendible Vouchers before this reward claim period closes; the Astral Imagea Park itself remains accessible.",
  },
};
const PARK_PERIOD = new RegExp(`^${AFTER_UPDATE.source}\\s*[-–—]\\s*${CLOCK.source}$`, "i");

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
      let inOthers = false;
      let inGameplay = false;
      let inLightward = false;
      // Older factual excerpts omit the Gameplay/Lightward introduction.
      // Full notices must keep mode matches inside the announced block.
      const hasLightward = rows.some(row => /^"Treasures Lightward":/.test(row));
      for (let i = 0; i < rows.length; i++) {
        if (/^6\. New Events$/.test(rows[i]!)) { inEvents = true; continue; }
        if (/^\d+\. /.test(rows[i]!)) {
          inEvents = false;
          inOthers = rows[i] === "7. Others";
          inGameplay = false;
          inLightward = false;
        }
        if (/^■ /.test(rows[i]!)) {
          inGameplay = inOthers && rows[i] === "■ Gameplay";
          inLightward = false;
        }
        if (inGameplay && /^"Treasures Lightward":/.test(rows[i]!)) inLightward = true;
        const event = inEvents ? /^\*\*■ ([^*]+)\*\*$/.exec(rows[i]!) : null;
        const mode = hasLightward
          ? inLightward ? LIGHTWARD_MODE.exec(rows[i]!) : null
          : inOthers ? /^- (Apocalyptic Shadow: [^\n]+|Pure Fiction: [^\n]+)$/.exec(rows[i]!) : null;
        if (!event && !mode) continue;
        const reward = event ? PARK_REWARDS[event[1]!] : undefined;
        if (reward && event) {
          const following = rows.slice(i + 1);
          const boundary = following.findIndex(row => /^(?:\*\*■ |\d+\. |■ )/.test(row));
          const block = boundary < 0 ? following : following.slice(0, boundary);
          const fields = block.filter(row => /^- (?:Availability|Claim Period):/.test(row));
          const prefix = `- ${reward.field}: `;
          const line = (fields[0] ?? "").startsWith(prefix) ? fields[0]!.slice(prefix.length) : "";
          const version = /Version (\d+\.\d+)/.exec(article.heading)?.[1];
          const dates = PARK_PERIOD.test(line) ? clocks(line) : [];
          const value = fields.length === 1 && AFTER_UPDATE.exec(line)?.[1] === version &&
            dates.length === 1 && dates[0]!.zone === "global"
            ? item(article, event[1]!, reward.type, line, updates, ctx) : null;
          if (!value) throw new Error(`KQM HSRNews Park reward period missing or invalid: ${event[1]}`);
          add({ ...value, summary: reward.summary });
          continue;
        }
        if (mode && hasLightward) {
          // The first nonempty line is the period, never a clock in buff prose
          // or in the next phase. Reject incomplete/changed/extra boundaries.
          const following = rows.slice(i + 1);
          const boundary = following.findIndex(row => /^(?:■ |\d+\. |\*\*■ |- (?:Memory of Chaos:|Apocalyptic Shadow:|Pure Fiction:))/.test(row));
          const block = boundary < 0 ? following : following.slice(0, boundary);
          const line = block.find(Boolean) ?? "";
          const relative = AFTER_UPDATE.exec(line)?.[1];
          const version = /Version (\d+\.\d+)/.exec(article.heading)?.[1];
          const value = LIGHTWARD_PERIOD.test(line) && (!relative || relative === version)
            ? item(article, mode[1]!, "challenge", line, updates, ctx) : null;
          if (!value || block.filter(row => LIGHTWARD_PERIOD.test(row)).length !== 1 ||
            Date.parse(value.endsAt!) <= Date.parse(value.startsAt)) {
            throw new Error(`KQM HSRNews Lightward period missing or invalid: ${mode[1]}`);
          }
          add(value);
          continue;
        }
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

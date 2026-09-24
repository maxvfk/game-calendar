import { eventId, GachaEvent, type GachaEvent as Event } from "../../shared/schema.ts";
import { scanDocument, text } from "../html.ts";
import type { ParseContext } from "../adapters/types.ts";
import type { SourceParser } from "./types.ts";

const PERIOD = /^(\d{4})\/(\d{2})\/(\d{2}) (\d{2}):(\d{2}) [–-] (\d{4})\/(\d{2})\/(\d{2}) (\d{2}):(\d{2}) \(Server Time\)$/;
const SEASON_PERIOD = /^(\d{4})\/(\d{2})\/(\d{2}) (\d{2}):(\d{2}) [–-] (\d{4})\/(\d{2})\/(\d{2}) (\d{2}):(\d{2}) \(UTC([+-]\d{1,2})\)$/;

function instant(parts: readonly string[], offset: number): number {
  const [year, month, day, hour, minute] = parts.map(Number);
  if ([year, month, day, hour, minute].some(n => !Number.isInteger(n))) throw new Error("invalid Echoes cycle date");
  const date = new Date(Date.UTC(year!, month! - 1, day!, hour!, minute!));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() + 1 !== month ||
      date.getUTCDate() !== day || date.getUTCHours() !== hour || date.getUTCMinutes() !== minute) {
    throw new Error("invalid Echoes cycle calendar date");
  }
  return date.getTime() - offset * 3_600_000;
}

function period(value: string, offset: number, zoneRequired: boolean): [number, number] {
  const match = zoneRequired ? SEASON_PERIOD.exec(value) : PERIOD.exec(value);
  if (!match) throw new Error(`unrecognized Echoes cycle period: ${value.slice(0, 80)}`);
  if (zoneRequired && Number(match[11]) !== offset) throw new Error("Echoes season server offset changed");
  const start = instant(match.slice(1, 6), offset);
  const end = instant(match.slice(6, 11), offset);
  if (end <= start) throw new Error("Echoes cycle ends before it starts");
  return [start, end];
}

/** Fail closed on a missing/changed cycle table; the refresh runner keeps the previous snapshot. */
export function parseWikiGgEchoesSeason(html: string, ctx: ParseContext): Event[] {
  const heading = text(/<h1\b[^>]*id="firstHeading"[^>]*>([\s\S]*?)<\/h1>/i.exec(html)?.[1] ?? "");
  const name = /^Echoes of War: (Season of [A-Za-z ]+)$/.exec(heading)?.[1];
  if (!name || decodeURIComponent(new URL(ctx.sourceUrl).pathname).replaceAll("_", " ") !== `/wiki/Echoes of War: ${name}`) {
    throw new Error("Echoes season page identity does not match its URL");
  }
  const asiaPeriod = text(/<div\b[^>]*class="[^"]*druid-row-asiadate[^"]*"[^>]*>([\s\S]*?)<\/div><\/div>/i.exec(html)?.[1] ?? "");
  const westPeriod = text(/<div\b[^>]*class="[^"]*druid-row-ameudate[^"]*"[^>]*>([\s\S]*?)<\/div><\/div>/i.exec(html)?.[1] ?? "");
  const asia = period(asiaPeriod.replace(/^Asia Server\s*/, ""), 8, true);
  const west = period(westPeriod.replace(/^Americas \/ Europe Server\s*/, ""), -5, true);
  const nodes = scanDocument(html);
  const headingIndex = nodes.findIndex(n => n.kind === "h2" && n.text === "Season Cycles");
  const table = nodes[headingIndex + 1];
  if (headingIndex < 0 || !table || table.kind !== "table" ||
      table.rows[0]?.join("|") !== "Cycle Name|Cycle Duration" || table.rows.length !== 4) {
    throw new Error("Echoes season has no recognizable three-cycle table");
  }
  const cycles = table.rows.slice(1).map((row, index) => {
    const roman = ["I", "II", "III"][index];
    if (row.length !== 2 || row[0] !== `Cycle of ${name.slice("Season of ".length)} ${roman}`) {
      throw new Error("Echoes season cycle name changed");
    }
    return { roman, raw: row[1]!, asia: period(row[1]!, 8, false), west: period(row[1]!, -5, false) };
  });
  if (cycles[0]!.asia[0] !== asia[0] || cycles[0]!.west[0] !== west[0] ||
      cycles[1]!.asia[0] !== cycles[0]!.asia[1] + 60_000 ||
      cycles[2]!.asia[0] !== cycles[1]!.asia[1] + 60_000 ||
      cycles[1]!.asia[1] >= asia[1] || cycles[1]!.west[1] >= west[1] ||
      cycles[2]!.asia[0] >= asia[1] || cycles[2]!.west[0] >= west[1]) {
    throw new Error("Echoes cycles conflict with the sourced season window");
  }
  return cycles.slice(0, 2).map((cycle, index) => {
    const day = cycle.raw.slice(0, 10).replaceAll("/", "-");
    const title = `Echoes of War: ${name} — Cycle ${cycle.roman}`;
    const regionEnds = {
      asia: new Date(cycle.asia[1]).toISOString(),
      america: new Date(cycle.west[1]).toISOString(),
      europe: new Date(cycle.west[1]).toISOString(),
    };
    return GachaEvent.parse({
      id: eventId("endfield", title, `${day}T00:00:00.000Z`), game: "endfield", title,
      type: "challenge", summary: `Cycle ${cycle.roman} rating and stages reset when Cycle ${cycles[index + 1]!.roman} opens. The season continues.`,
      startsAt: `${day}T00:00:00.000Z`, startPrecision: "day",
      endsAt: regionEnds.asia, endPrecision: "exact", regionScoped: true, regionEnds,
      sourceUrl: ctx.sourceUrl, sourceId: ctx.sourceId, status: "published",
      provenanceStatus: "estimated", confidence: 0.85, extractionMethod: "parser", version: 1,
      firstSeenAt: ctx.now, updatedAt: ctx.now,
    });
  });
}

export const wikiGgEchoesParser: SourceParser = {
  id: "wikigg-echoes", label: "wiki.gg Echoes season",
  canParse: html => /id="Season_Cycles"/.test(html) && /id="firstHeading"/.test(html),
  parse: parseWikiGgEchoesSeason,
};

import { z } from "zod";
import { eventId, GachaEvent, type EventType } from "../../shared/schema.ts";
import type { ParseContext } from "../adapters/types.ts";
import { decodeEntities } from "../html.ts";
import type { SourceParser } from "./types.ts";

const Feed = z.object({ appnews: z.object({
  appid: z.literal(4508340),
  newsitems: z.array(z.object({
    gid: z.string(), title: z.string(), contents: z.string(), url: z.string().url(),
    appid: z.literal(4508340), feedname: z.string(), date: z.number().int(),
  })),
}) });
type Post = z.infer<typeof Feed>["appnews"]["newsitems"][number];

// Paragraph boundaries, not a global date scan. Unknown BBCode is left alone.
function lines(raw: string): string[] {
  return decodeEntities(raw)
    .replace(/\[\/?(?:p|h[1-6]|list|\*)\]/gi, "\n")
    .replace(/\[\/?(?:b|i|u)\]/gi, "")
    .replace(/[“”]/g, '"')
    .split(/\n/).map((s) => s.trim()).filter(Boolean);
}

const MONTHS = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];
const DATE = new RegExp(`^(${MONTHS.join("|")})\\s+(\\d{1,2})(?:,?\\s+(20\\d{2}))?`, "i");
type Boundary = { at: string; precision: "exact" | "day"; month: number; year: number };

function boundary(raw: string, year: number | undefined, utc8: boolean): Boundary | null {
  const match = DATE.exec(raw.trim());
  if (!match) return null;
  const y = match[3] ? Number(match[3]) : year;
  if (y === undefined) return null;
  const month = MONTHS.findIndex((m) => m.toLowerCase() === match[1]!.toLowerCase());
  const day = Number(match[2]);
  const date = new Date(Date.UTC(y, month, day));
  if (date.getUTCMonth() !== month || date.getUTCDate() !== day) throw new Error(`Invalid NTE date: ${raw}`);
  const clock = /\b(\d{1,2}):(\d{2})\b/.exec(raw.slice(match[0].length));
  const exact = utc8 && clock !== null && !/after (?:the )?(?:update|maintenance)/i.test(raw);
  if (clock && (Number(clock[1]) > 23 || Number(clock[2]) > 59)) throw new Error(`Invalid NTE time: ${raw}`);
  if (exact) date.setTime(date.getTime() + (Number(clock[1]) * 60 + Number(clock[2]) - 480) * 60_000);
  return { at: date.toISOString(), precision: exact ? "exact" : "day", month, year: y };
}

export function parseNtePeriod(raw: string, year?: number) {
  const utc8 = /UTC\s*\+\s*8\b/i.test(raw) && !/server time/i.test(raw);
  const parts = raw.split(/\s*[–—]\s*|\s+-\s+|(?<=\d)-(?!\d{4})|\s+to\s+/i);
  if (parts.length > 2) throw new Error(`Ambiguous NTE period: ${raw}`);
  const start = boundary(parts[0]!, year, utc8);
  if (!start) return null;
  if (!parts[1]) return { start, end: null };
  let endText = parts[1];
  // Maintenance prints the date once, then two clocks.
  if (/^\d{1,2}:\d{2}/.test(endText)) {
    const printedDate = DATE.exec(parts[0]!)![0];
    endText = `${printedDate}, ${endText}`;
  }
  const end = boundary(endText, start.year, utc8);
  if (!end) throw new Error(`Unreadable NTE end: ${raw}`);
  // No implicit Dec -> Jan year arithmetic. Require the publication to state it.
  if (end.at <= start.at) throw new Error(`Reversed/ambiguous NTE period: ${raw}`);
  return { start, end };
}

type Entity = { title: string; type: EventType };
function entity(heading: string, section: string): Entity | null {
  const quoted = /"([^"]+)"/.exec(heading)?.[1];
  if (/S-Class Character/i.test(heading)) {
    const board = /"([^"]+)"\s+Limited Board/i.exec(section)?.[1];
    return board ? { title: board, type: "banner" } : null;
  }
  if (/S-Class Arc/i.test(heading)) {
    const title = quoted ?? heading.split(":").slice(1).join(":").trim();
    return title ? { title, type: "banner" } : null;
  }
  if (/Limited Board|Limited Arc|Arc Research/i.test(heading)) {
    return { title: quoted ?? heading.replace(/\s+(?:Limited Board|Limited Arc|Arc Research).*$/i, "").trim(), type: "banner" };
  }
  if (/Limited-Time Event|Login Event|check-in|Mystery Box Event|Circle Bounty|Gameplay Guide/i.test(heading)) {
    if (!quoted) return null;
    return { title: quoted, type: /Login|check-in/i.test(heading) ? "login"
      : /^(?:Runaway Echoes|Hunter's Crucible|Surf Breaker)$/.test(quoted) ? "challenge" : "other" };
  }
  return null;
}

type Candidate = { event: GachaEvent; date: number; standalone: boolean };
function candidates(post: Post, ctx: ParseContext): Candidate[] {
  if (post.feedname !== "steam_community_announcements") return [];
  if (/preview|special program|livestream|trailer|\bPV\b|giveaway|discord|artwork|points shop/i.test(post.title)) return [];
  if (!/maintenance notice|patch notes|update(?: details)?|limited board|limited arc|arc research|limited-time event|login|check-in|gameplay guide/i.test(post.title)) return [];
  const text = lines(post.contents);
  // A year must be literally present in this publication, never inferred from
  // the current clock or another post. Yearless standalone guides are skipped.
  const years = [...new Set(`${post.title}\n${text.join("\n")}`.match(/\b20\d{2}\b/g) ?? [])];
  const year = years.length === 1 ? Number(years[0]) : undefined;
  const sections: Array<{ heading: string; body: string[] }> = [];
  let current = { heading: post.title, body: [] as string[] };
  sections.push(current);
  for (const line of text) {
    if (/^(?:●|\d+\.|\\\[)/.test(line) && !/^●\s*(?:Duration|Available)\b/i.test(line)) {
      current = { heading: line.replace(/^●\s*|^\d+\.\s*/, ""), body: [] };
      sections.push(current);
    } else current.body.push(line);
  }
  const result: Candidate[] = [];
  for (const section of sections) {
    const maintenance = /Maintenance(?: Window)?\s*&\s*Compensation/i.test(section.heading);
    const item = maintenance
      ? { title: post.title, type: "maintenance" as const }
      : entity(section.heading, section.body.join("\n"));
    if (!item) continue;
    const i = section.body.findIndex((s) => /^(?:●\s*)?(?:Event )?(?:Available|Duration|Period)\b/i.test(s));
    if (i < 0) continue;
    const line = section.body[i]!.replace(/^(?:●\s*)?(?:Event )?(?:Available|Duration|Period)\s*:?\s*/i, "");
    const period = parseNtePeriod(line || section.body[i + 1] || "", year);
    if (!period) continue;
    // Permanent unlocks never became entities above. A genuine limited item
    // with an announced start but missing end may retain an unknown end.
    const event = GachaEvent.parse({
      id: eventId("nte", item.title, period.start.at), game: "nte", ...item,
      summary: maintenance ? "Scheduled maintenance; actual completion may vary." : null,
      startsAt: period.start.at, startPrecision: period.start.precision,
      endsAt: period.end?.at ?? null, endPrecision: period.end?.precision ?? "unknown",
      regionScoped: false, regionEnds: null,
      sourceUrl: post.url, sourceId: ctx.sourceId,
      status: "published", confidence: 1, extractionMethod: "parser", provenanceStatus: "official",
      version: 1, firstSeenAt: ctx.now, updatedAt: ctx.now,
    });
    result.push({ event, date: post.date, standalone: !/patch notes|maintenance|update/i.test(post.title) });
  }
  return result;
}

function sameCycle(a: GachaEvent, b: GachaEvent) {
  if (a.title !== b.title) return false;
  if (a.id === b.id) return true;
  // Day precision is the printed date; exact UTC+8 may fall on the previous UTC day.
  const day = (e: GachaEvent) => e.startPrecision === "exact"
    ? new Date(Date.parse(e.startsAt) + 480 * 60_000).toISOString().slice(0, 10)
    : e.startsAt.slice(0, 10);
  if (day(a) === day(b)) return true;
  // Overlapping windows of the same named item with shifted starts need review,
  // not two copies. Disjoint rotations (Fons Rush) stay separate.
  return a.endsAt !== null && b.endsAt !== null && a.startsAt < b.endsAt && b.startsAt < a.endsAt;
}

export function parseNteSteamNews(raw: string, ctx: ParseContext): GachaEvent[] {
  const feed = Feed.parse(JSON.parse(raw));
  const kept: Candidate[] = [];
  for (const next of feed.appnews.newsitems.flatMap((p) => candidates(p, ctx))) {
    const i = kept.findIndex((c) => sameCycle(c.event, next.event));
    if (i < 0) { kept.push(next); continue; }
    const old = kept[i]!;
    for (const [field, precision] of [["startsAt", "startPrecision"], ["endsAt", "endPrecision"]] as const) {
      if (old.event[precision] === "exact" && next.event[precision] === "exact" && old.event[field] !== next.event[field]) {
        throw new Error(`NTE official date conflict: ${next.event.title} ${field}: ${old.event.sourceUrl} vs ${next.event.sourceUrl}`);
      }
    }
    const score = (c: Candidate) => (c.event.startPrecision === "exact" ? 2 : 0)
      + (c.event.endPrecision === "exact" ? 1 : 0);
    if (score(next) > score(old) || (score(next) === score(old) &&
      (Number(next.standalone) > Number(old.standalone) || (next.standalone === old.standalone && next.date > old.date)))) kept[i] = next;
  }
  return kept.map((c) => c.event).sort((a, b) => a.id.localeCompare(b.id));
}

export const nteSteamNewsParser: SourceParser = {
  id: "nte-steamnews", label: "NTE official Steam announcements",
  canParse(raw) { try { return Feed.safeParse(JSON.parse(raw)).success; } catch { return false; } },
  parse: parseNteSteamNews,
};

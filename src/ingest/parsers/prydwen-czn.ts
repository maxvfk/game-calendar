import { eventId, GachaEvent } from "../../shared/schema.ts";
import type { ParseContext } from "../adapters/types.ts";
import { decodeEntities } from "../html.ts";
import type { SourceParser } from "./types.ts";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function day(text: string): string {
  const m = /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (\d{1,2}), (20\d{2})$/.exec(text.trim());
  if (!m) throw new Error(`Unrecognized Prydwen date: ${text}`);
  const month = MONTHS.indexOf(m[1]!);
  const date = new Date(Date.UTC(Number(m[3]), month, Number(m[2])));
  if (date.getUTCMonth() !== month || date.getUTCDate() !== Number(m[2])) throw new Error(`Invalid Prydwen date: ${text}`);
  return date.toISOString();
}
function attr(html: string, name: string): string | undefined {
  const value = new RegExp(`\\b${name}="([^"]*)"`).exec(html)?.[1];
  return value === undefined ? undefined : decodeEntities(value);
}
function cards(html: string): string[] {
  return [...html.matchAll(/<article\b[^>]*data-banner-card="true"[\s\S]*?<\/article>/g)].map((m) => m[0]);
}

export function parsePrydwenCzn(html: string, ctx: ParseContext): GachaEvent[] {
  const rows = cards(html);
  if (!rows.length) throw new Error("Prydwen CZN banner cards missing");
  const events: GachaEvent[] = [];
  for (const card of rows) {
    if (!["current", "upcoming"].includes(attr(card, "data-section") ?? "")) continue;
    const name = decodeEntities(/class="banner-name">([^<]+)</.exec(card)?.[1] ?? "").trim();
    const range = attr(card, "data-range-global");
    if (!name || !range) throw new Error("Prydwen CZN card missing name/date range");
    // Use visible calendar dates, NOT machine countdown timestamps: the real
    // capture has 07:00/00:01 values that disagree with STOVE maintenance.
    // Upcoming "From ..." intentionally has no end; never invent 21 days.
    const parts = range.replace(/^From\s+/, "").split(/\s+–\s+/);
    if (parts.length > 2) throw new Error(`Ambiguous Prydwen range: ${range}`);
    const startsAt = day(parts[0]!);
    const endsAt = parts[1] ? day(parts[1]) : null;
    const title = `${name} Rate-Up Rescue`;
    events.push(GachaEvent.parse({
      id: eventId("czn", title, startsAt), game: "czn", title, type: "banner",
      summary: "Prydwen banner schedule; dates only, pending official time confirmation.",
      startsAt, startPrecision: "day", endsAt, endPrecision: endsAt ? "day" : "unknown",
      regionScoped: false, regionEnds: null, sourceUrl: ctx.sourceUrl, sourceId: ctx.sourceId,
      status: "published", confidence: 0.7, provenanceStatus: "estimated", extractionMethod: "parser",
      version: 1, firstSeenAt: ctx.now, updatedAt: ctx.now,
    }));
  }
  // These share one official normal-rescue rate-up, already published under
  // this canonical title. Keep that identity instead of minting two duplicates.
  const narja = events.find((e) => e.title === "Narja Rate-Up Rescue");
  const gaya = events.find((e) => e.title === "Gaya Rate-Up Rescue");
  if (narja && gaya) {
    if (narja.startsAt !== gaya.startsAt || narja.endsAt !== gaya.endsAt) throw new Error("Prydwen Narja/Gaya periods disagree; review required");
    const title = "Narja & Gaya Normal Rescue Rate-Up";
    const combined = { ...narja, title, id: eventId("czn", title, narja.startsAt) };
    return [...events.filter((e) => e !== narja && e !== gaya), combined];
  }
  return events;
}

export const prydwenCznParser: SourceParser = {
  id: "prydwen-czn", label: "Prydwen CZN banners",
  canParse: (html) => html.includes("/chaos-zero-nightmare/") && cards(html).length > 0,
  parse: parsePrydwenCzn,
};

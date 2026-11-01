/** Bounded source-text date reader. No ingestion defaults, DOM, evaluation or I/O.
 * Locations are UTF-16 offsets into the ORIGINAL input; quotes are verbatim.
 * A span is one dated boundary; range peers share a group and roles.
 */
import { createHash } from "node:crypto";
import { parseIsoDay } from "../ingest/dates.ts";

export const DATE_READER_VERSION = "notice-dates-v1";
export const DATE_LIMITS = { inputUnits: 250_000, spans: 256, quoteUnits: 512 } as const;
export type DateValue = {
  date: string | null; clock: string | null; offsetMinutes: number | null;
  instant: string | null; precision: "day" | "minute" | "second" | "unknown";
};
export type DateSpan = {
  kind: "date" | "unresolved"; ref: string; start: number; end: number; quote: string;
  role: "start" | "end" | "single"; group: number | null;
  region: "asia" | "europe" | "america" | null;
  value: DateValue; uncertainty: string[];
};
export type DateRead = { readerVersion: typeof DATE_READER_VERSION; spans: DateSpan[]; diagnostics: string[]; complete: boolean };
const months = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
const monthPattern = "(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\\.?";
const datePattern = `(?:\\d{4}[-/.]\\d{1,2}[-/.]\\d{1,2}|${monthPattern}\\s+\\d{1,2}(?:st|nd|rd|th)?(?:,?\\s+\\d{4})?|\\d{1,2}\\s+${monthPattern}(?:,?\\s+\\d{4})?|\\d{1,2}/\\d{1,2}(?:/\\d{2,4})?|\\d{1,2}\\.\\d{1,2}\\.\\d{2,4})`;
const clockPattern = "(?:(?:[ \\t,T]+)\\d{1,2}:\\d{2}(?::\\d{2})?(?:[ \\t]*[AP]M)?)?";
const zonePattern = "(?:[ \\t]*(?:\\(?[ \\t]*UTC(?:[ \\t]*[+−-]\\d{1,2}(?::?\\d{2})?)?[ \\t]*\\)?|Z|[+−-]\\d{2}:?\\d{2}|\\((?:server(?: time)?|global|[A-Z]{2,5})\\)))?";
const separator = /^[\s*_,]*(?:[-–—~]|to|until)[\s*_,]*$/i;

/** Mask markup, attributes, URL destinations and active content; never execute it.
 * Keep a source-offset map through one-pass entity decoding. Unknown entities
 * and malformed/unsupported constructs remain explicit evaluation uncertainty.
 */
function visible(raw: string, format: "markdown" | "html" | "bbcode", diagnose: (code: string) => void) {
  const chars = raw.split("");
  const mask = (start: number, end: number) => { for (let i = start; i < end; i++) if (chars[i] !== "\n" && chars[i] !== "\r") chars[i] = " "; };
  const stack: string[] = [];
  const voidTags = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]);
  // Linear tag scanner; quotes inside attributes cannot terminate a tag.
  for (let i = 0; i < raw.length; i++) {
    if (raw[i] !== "<") continue;
    if (raw.startsWith("<!--", i)) {
      const end = raw.indexOf("-->", i + 4);
      if (end < 0) { mask(i, raw.length); diagnose("malformed_markup"); break; }
      mask(i, end + 3); i = end + 2; continue;
    }
    if (!/[A-Za-z/!?]/.test(raw[i + 1] ?? "")) continue;
    let end = i + 1, quote = "";
    for (; end < raw.length; end++) {
      const c = raw[end]!;
      if (quote) { if (c === quote) quote = ""; }
      else if (c === "'" || c === '"') quote = c;
      else if (c === ">") break;
    }
    if (end === raw.length) { mask(i, end); diagnose("malformed_markup"); break; }
    const tag = raw.slice(i, end + 1);
    const active = /^<(script|style|iframe|object)\b/i.exec(tag)?.[1];
    if (active) {
      const close = new RegExp(`</${active}\\s*>`, "ig"); close.lastIndex = end + 1;
      const match = close.exec(raw);
      mask(i, match ? match.index + match[0].length : raw.length);
      diagnose("active_content_omitted"); i = match ? match.index + match[0].length - 1 : raw.length; continue;
    }
    if (/^<!|^<\?/.test(tag)) diagnose("unsupported_markup");
    const element = /^<(\/?)([a-z][a-z0-9-]*)\b/i.exec(tag);
    if (element) {
      const name = element[2]!.toLowerCase();
      if (element[1]) {
        if (stack.pop() !== name) diagnose("malformed_markup");
      } else if (!voidTags.has(name) && !/\/\s*>$/.test(tag)) stack.push(name);
    }
    mask(i, end + 1); i = end;
  }
  if (stack.length) diagnose("malformed_markup");
  if (format === "bbcode") {
    const tags = /\[(\/?)([a-z][a-z0-9]*)(?:[=\s][^\]\r\n]*)?\]/ig;
    const bbStack: string[] = [];
    for (const m of raw.matchAll(tags)) {
      mask(m.index!, m.index! + m[0].length);
      const name = m[2]!.toLowerCase();
      if (m[1]) { if (bbStack.pop() !== name) diagnose("malformed_markup"); }
      else if (!["br", "hr"].includes(name)) bbStack.push(name);
    }
    if (bbStack.length) diagnose("malformed_markup");
    if (/\[(?:\/?(?:b|i|url|img|h[1-6]|list|quote|table|tr|td))(?:[=\s]|$)[^\]]*$/i.test(raw)) diagnose("malformed_markup");
  }
  // URLs and markdown link destinations are metadata, not dated prose.
  for (const m of raw.matchAll(/https?:\/\/[^\s<>"')\]]+|\]\([^\r\n)]*\)/g)) mask(m.index!, m.index! + m[0].length);
  const masked = chars.join("");
  let text = ""; const positions: number[] = [], ends: number[] = [];
  const entities: Record<string, string> = { nbsp: " ", amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", ndash: "–", mdash: "—" };
  for (let i = 0; i < masked.length; i++) {
    if (masked[i] === "&") {
      const entity = /^&(#x[\da-f]{1,6}|#\d{1,7}|[a-z]{1,16});/i.exec(masked.slice(i, i + 20));
      if (entity) {
        const key = entity[1]!, point = key.startsWith("#") ? Number.parseInt(key.slice(key[1]?.toLowerCase() === "x" ? 2 : 1), key[1]?.toLowerCase() === "x" ? 16 : 10) : null;
        const decoded = point !== null && point > 0 && point <= 0x10ffff && !(point >= 0xd800 && point <= 0xdfff) ? String.fromCodePoint(point) : entities[key.toLowerCase()];
        if (decoded === undefined) diagnose("unsupported_entity");
        const replacement = decoded ?? " ";
        for (const c of replacement.split("")) { text += c; positions.push(i); ends.push(i + entity[0].length); }
        i += entity[0].length - 1; continue;
      }
    }
    text += masked[i]; positions.push(i); ends.push(i + 1);
  }
  return { text, positions, ends };
}
function parseValue(text: string): { value: DateValue; uncertainty: string[] } {
  const uncertainty: string[] = [];
  const date = new RegExp(`^(${datePattern})`, "i").exec(text)![1]!;
  let year: number | null = null, month: number | null = null, day: number | null = null;
  let m: RegExpExecArray | null;
  if ((m = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/.exec(date))) {
    year = +m[1]!; month = +m[2]!; day = +m[3]!;
    const separators = date.match(/[-/.]/g)!;
    if (separators[0] !== separators[1]) uncertainty.push("mixed_date_separators");
  } else if ((m = /^(\d{1,2})[/.](\d{1,2})(?:[/.](\d{2,4}))?$/.exec(date))) {
    // No locale inference. Only unambiguous numeric ordering is accepted.
    if (+m[1]! > 12 && +m[2]! <= 12) { day = +m[1]!; month = +m[2]!; }
    else if (+m[2]! > 12 && +m[1]! <= 12) { month = +m[1]!; day = +m[2]!; }
    else uncertainty.push("ambiguous_numeric_order");
    if (m[3]?.length === 4) year = +m[3];
    else if (m[3]) uncertainty.push("ambiguous_short_year");
  } else {
    const name = new RegExp(monthPattern, "i").exec(date)![0];
    month = months.findIndex(n => n.startsWith(name.toLowerCase().replace(/\.$/, "").slice(0, 3))) + 1;
    const numbers = date.replace(name, "").match(/\d+/g) ?? [];
    day = +(numbers[0] ?? 0); if (numbers[1]?.length === 4) year = +numbers[1];
  }
  if (year === null) uncertainty.push("missing_year");
  const dayText = year !== null && month !== null && day !== null ? `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}` : null;
  const validDay = dayText && parseIsoDay(dayText) ? dayText : null;
  if (dayText && !validDay) uncertainty.push("invalid_date");
  const rest = text.slice(date.length);
  const clockMatch = /^[\s,T]+(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s*([AP])M)?/i.exec(rest);
  let clock: string | null = null;
  let offsetMinutes: number | null = null;
  if (clockMatch) {
    let h = +clockMatch[1]!; const min = +clockMatch[2]!, sec = +(clockMatch[3] ?? 0);
    if (clockMatch[4]) {
      if (h < 1 || h > 12) uncertainty.push("invalid_clock");
      h = h % 12 + (clockMatch[4].toUpperCase() === "P" ? 12 : 0);
    }
    if (h > 23 || min > 59 || sec > 59) uncertainty.push("invalid_clock");
    else clock = `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
    const zone = rest.slice(clockMatch[0].length).trim().replace(/[()]/g, "").replace("−", "-");
    const z = /^(?:UTC\s*)?([+-])(\d{1,2})(?::?(\d{2}))?$/i.exec(zone);
    if (/^(UTC|Z)$/i.test(zone)) offsetMinutes = 0;
    else if (z) {
      const magnitude = +z[2]! * 60 + +(z[3] ?? 0);
      if (+z[2]! > 14 || +(z[3] ?? 0) > 59 || magnitude > 840) uncertainty.push("invalid_offset");
      else offsetMinutes = (z[1] === "-" ? -1 : 1) * magnitude;
    } else uncertainty.push(zone ? "unsupported_timezone" : "missing_offset");
  }
  const precision = clockMatch ? clockMatch[3] ? "second" : "minute" : "day";
  const instant = validDay && clock && offsetMinutes !== null && uncertainty.length === 0 ? new Date(Date.parse(`${validDay}T${clock}Z`) - offsetMinutes * 60_000).toISOString() : null;
  return { value: { date: validDay, clock, offsetMinutes, instant, precision }, uncertainty };
}

export function readDateSpans(raw: string, format: "markdown" | "html" | "bbcode" = "markdown"): DateRead {
  const diagnostics: string[] = [];
  const diagnose = (code: string) => { if (!diagnostics.includes(code)) diagnostics.push(code); };
  if (raw.length > DATE_LIMITS.inputUnits) return { readerVersion: DATE_READER_VERSION, spans: [], diagnostics: ["input_limit"], complete: false };
  const { text, positions, ends } = visible(raw, format, diagnose);
  const re = new RegExp(`(?<![\\p{L}\\d/.-])${datePattern}${clockPattern}${zonePattern}(?![\\p{L}\\d/])`, "giu");
  const spans: DateSpan[] = [];
  const locations: Array<{ start: number; end: number }> = [];
  for (const match of text.matchAll(re)) {
    if (spans.length === DATE_LIMITS.spans) { diagnose("span_limit"); break; }
    const start = positions[match.index!]!, end = ends[match.index! + match[0].length - 1]!;
    if (end - start > DATE_LIMITS.quoteUnits) { diagnose("quote_limit"); continue; }
    const quote = raw.slice(start, end);
    const parsed = parseValue(match[0]);
    const line = text.slice(text.lastIndexOf("\n", match.index!) + 1, match.index!);
    const regions = [...line.matchAll(/\b(Asia|Europe|America)\b/gi)].map(m => m[1]!.toLowerCase());
    const region = regions.length === 1 ? regions[0] as DateSpan["region"] : null;
    if (regions.length > 1) parsed.uncertainty.push("ambiguous_region");
    spans.push({ kind: "date", ref: createHash("sha256").update(JSON.stringify([DATE_READER_VERSION, start, end, quote])).digest("hex"),
      start, end, quote, role: "single", group: null, region, ...parsed });
    locations.push({ start: match.index!, end: match.index! + match[0].length });
  }
  let group = 0;
  for (let i = 0; i + 1 < spans.length; i++) {
    if (separator.test(text.slice(locations[i]!.end, locations[i + 1]!.start))) {
      spans[i]!.role = "start"; spans[i]!.group = group;
      spans[i + 1]!.role = "end"; spans[i + 1]!.group = group++; i++;
    }
  }
  // Date-like unsupported forms stay visible through diagnostics. Never certify
  // coverage when a known marker fell outside the recognized language.
  const remainder = text.split("");
  for (const l of locations) for (let i = l.start; i < l.end; i++) remainder[i] = " ";
  const unresolved = new RegExp(`${monthPattern}\\s+\\d[^\\n;]{0,80}|\\d{4}[-/.]\\d[^\\n;]{0,80}|\\d{1,2}/\\d{1,2}[^\\n;]{0,40}|\\d{1,2}\\.\\d{1,2}\\.\\d{2,4}|\\d{1,2}:\\d{2}(?::\\d{2})?|\\b(?:tomorrow|TBD|TBA|after (?:the )?(?:version \\d+\\.\\d+ (?:update|maintenance)|update|maintenance))\\b`, "gi");
  if (!spans.length) diagnose("no_recognized_dates");
  for (const m of remainder.join("").matchAll(unresolved)) {
    diagnose("unresolved_date_expression");
    if (spans.length === DATE_LIMITS.spans) { diagnose("span_limit"); break; }
    const start = positions[m.index!]!, end = ends[m.index! + m[0].length - 1]!;
    if (end - start > DATE_LIMITS.quoteUnits) { diagnose("quote_limit"); continue; }
    const quote = raw.slice(start, end);
    spans.push({ kind: "unresolved", ref: createHash("sha256").update(JSON.stringify([DATE_READER_VERSION, start, end, quote])).digest("hex"),
      start, end, quote, role: "single", group: null, region: null,
      value: { date: null, clock: null, offsetMinutes: null, instant: null, precision: "unknown" }, uncertainty: ["unsupported_date_expression"] });
  }
  spans.sort((a, b) => a.start - b.start);
  return { readerVersion: DATE_READER_VERSION, spans, diagnostics: diagnostics.sort(), complete: !diagnostics.some(c => c.endsWith("_limit")) };
}

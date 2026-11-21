import { eventId, GachaEvent, type EventType } from "../../shared/schema.ts";
import type { ParseContext } from "../adapters/types.ts";
import { decodeEntities } from "../html.ts";
import { clipSummary, sanitizeRecognitionSubjects } from "../sanitize.ts";
import type { SourceParser } from "./types.ts";

const ENTRY = /<entry>([\s\S]*?)<\/entry>/g;
const DATE = /(20\d{2})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})/g;
const BLOCK_BREAK = /<\/(?:p|li|h[1-6]|div)>|<br\s*\/?\s*>/gi;
type Article = {
  sourceUrl: string;
  id: string;
  title: string;
  lines: string[];
  content: string;
  headings: string[];
  headingBoundaries: string[];
  evidenceLines: string[];
  lineToEvidence: number[];
};

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

/** Canonical Atom article discovery; no event/date filtering. */
export function discoverWuwaArticles(raw: string): Article[] {
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
    const textLines = (content: string) => decodeEntities(content
      .replace(/<\/(?:p|li|h[1-6]|div)>/gi, "\n")
      .replace(/<br\s*\/?\s*>/gi, "\n")
      .replace(/<[^>]*>/g, " "))
      .split("\n").map(s => s.replace(/\s+/g, " ").trim()).filter(Boolean);
    const lines = textLines(content);
    const evidenceLines = textLines(content.replace(/[\r\n]/g, " ").replace(/<\/?(?:span|strong|b|em|i|a)\b[^>]*>/gi, ""));
    const chunkLines: string[] = [];
    const chunkEvLines: string[] = [];
    const rawLinks: number[] = [];
    for (const chunk of content.split(BLOCK_BREAK)) {
      const rawChunk = textLines(chunk);
      const evChunk = textLines(chunk.replace(/[\r\n]/g, " ").replace(/<\/?(?:span|strong|b|em|i|a)\b[^>]*>/gi, ""));
      const evBase = chunkEvLines.length;
      for (const l of evChunk) chunkEvLines.push(l);
      // Link a raw line to an evidence line only when the same HTML block yields
      // one identical line in both views; otherwise fail closed (-1).
      const exactLink = rawChunk.length === 1 && evChunk.length === 1 && rawChunk[0] === evChunk[0] ? evBase : -1;
      for (const l of rawChunk) {
        chunkLines.push(l);
        rawLinks.push(exactLink);
      }
    }
    const aligned = chunkLines.length === lines.length && chunkEvLines.length === evidenceLines.length &&
      chunkLines.every((l, idx) => l === lines[idx]) && chunkEvLines.every((l, idx) => l === evidenceLines[idx]);
    const lineToEvidence = aligned ? rawLinks : lines.map(() => -1);
    const headings = [...content.matchAll(/<h[1-6]\b[^>]*>([\s\S]*?)<\/h[1-6]>/gi)]
      .map(m => decodeEntities(m[1]!.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim());
    const headingBoundaries = [...new Set([
      ...headings,
      ...[...content.matchAll(/<h[1-6]\b[^>]*>([\s\S]*?)<\/h[1-6]>/gi)]
        .flatMap(m => textLines(m[1]!.replace(/[\r\n]/g, " ").replace(/<\/?(?:span|strong|b|em|i|a)\b[^>]*>/gi, ""))),
    ])].filter(Boolean);
    return { sourceUrl: link, id, title: decodeEntities(title), lines, content, headings, headingBoundaries, evidenceLines, lineToEvidence };
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

const PATCH_EVENTS = new Set(["Cubie Wars", "Dreams in the Capsule", "Gifts of Waking Moon", "Gifts of Singing Drizzle"]);
const PATCH_TITLE = /^Patch Notes for Wuthering Waves Version (\d+\.\d+): .+$/i;

/** New patch-title contract is scoped to approved current event families.
 * Do not activate historical banner backfill through a global anchor change. */
function patchOpening(article: Article): string {
  const rows = article.evidenceLines.filter(line => /^✦?Maintenance Time:/.test(line));
  const line = rows[0] ?? "";
  const times = [...line.matchAll(DATE)];
  const clock = "20\\d{2}-\\d{2}-\\d{2}\\s+\\d{2}:\\d{2}";
  const shape = new RegExp(`^✦?Maintenance Time: ${clock}\\s*[-–—]\\s*${clock} \\(UTC\\+8\\)$`);
  if (!shape.test(line) || rows.length !== 1 || times.length !== 2 || !/\(UTC\+8\)$/.test(line) ||
    serverTime(times[1]!, 8) <= serverTime(times[0]!, 8)) {
    throw new Error("WuWa patch maintenance calendar anchor missing or invalid");
  }
  return day(times[0]!); // calendar anchor only, never maintenance completion
}

function patchDuration(article: Article, near: string[], version: string) {
  const rows = near.filter(line => /^✦?Duration:/.test(line));
  const line = (rows[0] ?? "").replace(/^✦/, "");
  const clock = "20\\d{2}-\\d{2}-\\d{2}\\s+\\d{2}:\\d{2}";
  const relative = `Version ${version.replace(".", "\\.")} Update`;
  const shape = new RegExp(`^Duration: (?:${relative}|${clock})\\s*[-–—]\\s*${clock} \\(server time\\)$`);
  if (rows.length !== 1 || !shape.test(line)) throw new Error("WuWa patch event duration missing or invalid");
  const updates = new Map([[version, patchOpening(article)]]);
  return { line, updates };
}

function identity(line: string): { title: string; type: EventType } | null {
  // Category brackets are not an event identity. Reject other nested layouts
  // rather than publishing the category itself as a new completion key.
  const nested = /^\[Special Events\]\s+(\[[^\]]+\]\s+.+)$/.exec(line);
  if (nested) line = nested[1]!;
  if (/^\[[^\]]+\]\s+\[/.test(line)) return null;
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

const CONDITIONAL_REWARD = /^\[Log in for \d+ days? in total\]:\s*.+/i;
const DURATION_LINE = /^(?:✦?Duration\b|20\d{2}-|Version \d+\.\d+ [Uu]pdate)/i;
const SECTION_BOUNDARY = /^\[[^\]]+\]|^(?:New |Convene Rules|Eligibility|Notes\b|Maintenance\b|For more details)/i;

function sectionContext(
  lines: string[],
  type: EventType,
  heading: string,
  articleHeadings: readonly string[],
): { recognitionSubjects?: string[]; summary: string | null } {
  const unknownHeading = (line: string) =>
    articleHeadings.includes(line) && !/^(?:Duration|Rewards)$/i.test(line);
  const firstDuration = lines.findIndex(line => /\(server time\)/i.test(line) && DURATION_LINE.test(line));
  const firstBoundary = lines.findIndex(line => (SECTION_BOUNDARY.test(line) && !CONDITIONAL_REWARD.test(line)) || unknownHeading(line));
  // Fail closed when the duration line is absent or preceded by an unrecognized
  // HTML/section heading (same boundary contract as E1 evidence extraction).
  if (firstDuration < 0 || (firstBoundary >= 0 && firstBoundary < firstDuration)) {
    return { summary: null };
  }
  const intro: string[] = [];
  for (const line of lines.slice(0, firstDuration)) {
    if (DURATION_LINE.test(line)) break;
    if (/^(?:Rewards)$/i.test(line)) continue;
    intro.push(line);
  }
  if (type === "banner") {
    const featuredLines = intro.filter(l => /^During the event,\s*5-Star\s+(?:Resonator|Weapon):/i.test(l));
    if (featuredLines.length > 1) return { summary: null };
    const featuredLine = featuredLines[0];
    if (featuredLine) {
      const expectedKind = /Featured Weapon Convene/i.test(heading) ? "Weapon"
        : /Featured Resonator Convene/i.test(heading) ? "Resonator" : null;
      const kindPattern = expectedKind ?? "(?:Resonator|Weapon)";
      const m = new RegExp(`^During the event,\\s*5-Star\\s+${kindPattern}:\\s*([^,!.]+?)(?:,|\\s+receive boosted drop rates)`, "i").exec(featuredLine);
      if (!m) return { summary: null };
      const recognitionSubjects = sanitizeRecognitionSubjects(m[1] ? [m[1]] : undefined);
      return {
        ...(recognitionSubjects ? { recognitionSubjects } : {}),
        summary: clipSummary(featuredLine),
      };
    }
    return { summary: clipSummary(intro.slice(0, 2).join(" ")) };
  }
  return { summary: clipSummary(intro.slice(0, 2).join(" ")) };
}

function candidate(
  article: Article,
  title: string,
  type: EventType,
  line: string,
  updates: Map<string, string>,
  ctx: ParseContext,
  contextLines: string[],
  heading: string,
): GachaEvent | null {
  const dates = period(line, updates);
  if (!dates) return null;
  const { recognitionSubjects, summary } = sectionContext(contextLines, type, heading, article.headingBoundaries);
  return GachaEvent.parse({
    id: eventId("wuwa", title, dates.start), game: "wuwa", title, type,
    ...(recognitionSubjects ? { recognitionSubjects } : {}),
    summary,
    startsAt: dates.start, startPrecision: "day", endsAt: dates.endsAt, endPrecision: "exact",
    regionScoped: true, regionEnds: dates.regionEnds,
    sourceUrl: `https://wutheringwaves.kurogames.com/en/main/news/detail/${article.id}`,
    sourceId: ctx.sourceId, status: "published", confidence: 0.8,
    extractionMethod: "parser", version: 1, firstSeenAt: ctx.now, updatedAt: ctx.now,
  });
}

/** Shared identity/date traversal. Evidence never changes the parser's winner selection. */
export function wuwaEventSections(raw: string, ctx: ParseContext, evidenceWhitespace = false) {
  const archive = discoverWuwaArticles(raw);
  if (!archive.length) throw new Error("WuWa Atom entries missing");
  const updates = updateDays(archive);
  const scopedPatchDays = new Map<string, string>();
  const result: Array<{ event: GachaEvent; heading: string; lines: string[]; content: string; headings: string[]; repeatedHeading: boolean }> = [];
  for (const article of archive) {
    const standaloneMatch = /\[([^\]]+)\]\s+(Combat Event|Featured (?:Resonator|Weapon) Convene)/i.exec(article.title);
    const standalone = standaloneMatch?.[1];
    // Preserve legacy parser line splitting; evidence normalizes soft newlines inside HTML blocks.
    const articleLines = evidenceWhitespace ? article.evidenceLines : article.lines;
    // Keep the banner kind stated by the Atom title (Resonator vs Weapon); the
    // identity/ID only uses the bracketed name, so this never moves an event ID.
    const standaloneKind = standaloneMatch
      ? /Weapon Convene/i.test(standaloneMatch[2]!) ? "Featured Weapon Convene"
        : /Convene/i.test(standaloneMatch[2]!) ? "Featured Resonator Convene" : "Combat Event"
      : null;
    const prefix = standalone && standaloneKind ? [`[${standalone}] ${standaloneKind}`] : [];
    const candidates = [...prefix, ...articleLines];
    const evidenceCandidates = [...prefix, ...article.evidenceLines];
    const candidateToEvidence = evidenceWhitespace
      ? candidates.map((_, idx) => idx)
      : [
          ...prefix.map((_, idx) => idx),
          ...article.lineToEvidence.map(idx => (idx >= 0 ? idx + prefix.length : -1)),
        ];
    for (let i = 0; i < candidates.length; i++) {
      const item = identity(candidates[i]!);
      if (!item) continue;
      const near: string[] = [];
      for (const line of candidates.slice(i + 1, i + 9)) {
        if (identity(line)) break;
        near.push(line);
      }
      const patchVersion = PATCH_TITLE.exec(article.title)?.[1];
      const scoped = patchVersion && PATCH_EVENTS.has(item.title)
        ? patchDuration(article, near, patchVersion) : null;
      if (scoped && patchVersion) {
        const date = scoped.updates.get(patchVersion)!;
        const old = scopedPatchDays.get(patchVersion);
        if (old && old !== date) throw new Error(`WuWa conflicting Version ${patchVersion} patch calendar anchor`);
        scopedPatchDays.set(patchVersion, date);
      }
      const duration = scoped?.line ?? near.find(s => /\(server time\)/i.test(s) &&
        (/^Duration:/i.test(s) || /^20\d{2}-/.test(s) || /^Version \d+\.\d+ [Uu]pdate/i.test(s)));
      if (duration) {
        let contextLines: string[] = [];
        const evIdx = candidateToEvidence[i] ?? -1;
        if (evIdx >= 0) {
          const evFollowing = evidenceCandidates.slice(evIdx + 1);
          const evNext = evFollowing.findIndex(line => identity(line) !== null);
          contextLines = evNext < 0 ? evFollowing : evFollowing.slice(0, evNext);
        }
        const event = candidate(article, item.title, item.type, duration, scoped?.updates ?? updates, ctx, contextLines, candidates[i]!);
        if (event) {
          const following = candidates.slice(i + 1);
          const next = following.findIndex(line => identity(line) !== null);
          result.push({ event, heading: candidates[i]!, lines: next < 0 ? following : following.slice(0, next), content: article.content, headings: article.headings,
            repeatedHeading: candidates.filter(line => line === candidates[i]).length > 1 });
        }
      }
    }
  }
  return result;
}

export function parseWuwaKuroAtom(raw: string, ctx: ParseContext): GachaEvent[] {
  const seen = new Map<string, GachaEvent>();
  for (const { event: value } of wuwaEventSections(raw, ctx)) {
    const old = seen.get(value.id);
    if (old && (old.endsAt !== value.endsAt || old.startsAt !== value.startsAt ||
      JSON.stringify(old.regionEnds) !== JSON.stringify(value.regionEnds))) {
      throw new Error(`WuWa Atom conflicting duplicate: ${value.id}`);
    }
    if (!old) seen.set(value.id, value);
  }
  if (!seen.size) throw new Error("WuWa Atom no dated calendar notices");
  return [...seen.values()].sort((a, b) => a.id.localeCompare(b.id));
}

export const wuwaKuroAtomParser: SourceParser = {
  id: "wuwa-kuro-atom", label: "WuWa Kuro notice Atom mirror",
  canParse(raw) { try { return discoverWuwaArticles(raw).length > 0; } catch { return false; } },
  parse: parseWuwaKuroAtom,
};

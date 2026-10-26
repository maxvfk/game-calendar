import { createHash } from "node:crypto";
import { z } from "zod";
import { EventFeed } from "../shared/feed.ts";
import { Region, type GachaEvent } from "../shared/schema.ts";
import { TimelineTitle, originalTimelineIdentity } from "../shared/timelineIdentity.ts";

export const FINGERPRINT_CONTRACT = "timeline-semantic-sha256-v1";
export const RULES_VERSION = "v1";
export const DEFAULT_BATCH_SIZE = 25;
const DAY = 86_400_000;
const safeText = (max: number) => z.string().min(1).max(max).refine(
  s => s === s.trim() && !/[<>\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/u.test(s),
  "expected trimmed plain text",
);
const common = {
  eventId: safeText(300),
  fingerprint: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  rulesVersion: z.string().min(1).max(64).regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/),
  reason: safeText(300).optional(),
};
export const TimelineDecision = z.discriminatedUnion("decision", [
  z.object({ ...common, decision: z.literal("label"), timelineTitle: TimelineTitle }).strict(),
  z.object({ ...common, decision: z.literal("keep_original") }).strict(),
  z.object({ ...common, decision: z.literal("needs_research"), reason: safeText(300) }).strict(),
]);
export type TimelineDecision = z.infer<typeof TimelineDecision>;
export const TimelineRegistry = z.object({
  schemaVersion: z.literal(1), decisions: z.array(TimelineDecision).max(100_000),
}).strict().superRefine((registry, ctx) => {
  const seen = new Set<string>();
  registry.decisions.forEach((d, i) => {
    if (seen.has(d.eventId)) ctx.addIssue({ code: "custom", path: ["decisions", i, "eventId"], message: "duplicate eventId" });
    seen.add(d.eventId);
  });
});
export type TimelineRegistry = z.infer<typeof TimelineRegistry>;

/** Fixed order. Only summary whitespace/NFC is normalized; identities are verbatim. */
export function semanticFingerprint(event: GachaEvent): string {
  const summary = event.summary?.normalize("NFC").replace(/\s+/gu, " ").trim() || null;
  const canonical = JSON.stringify({
    fingerprintVersion: 1,
    id: event.id, game: event.game, type: event.type, title: event.title,
    recognitionSubjects: event.recognitionSubjects ?? [], summary,
  });
  return `sha256:${createHash("sha256").update(canonical, "utf8").digest("hex")}`;
}

export function publicEvent(event: GachaEvent): boolean {
  return event.status === "published" && event.provenanceStatus !== "leak" &&
    event.sourceId !== "you" && !event.id.startsWith("myevent:");
}
const compare = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;

/** Latest possible end, only for review ordering/overlap, never a public deadline.
 * Unknown/incomplete regional ends are unbounded. A date-only end is kept for
 * two UTC days to cover the entire named day and server/local-zone uncertainty. */
export function endBound(event: GachaEvent): number {
  if (event.endsAt === null) return Infinity;
  if (event.regionScoped) {
    const ends = Region.options.map(region => event.regionEnds?.[region]);
    return ends.every(end => end !== undefined)
      ? Math.max(...ends.map(end => Date.parse(end!))) : Infinity;
  }
  return event.endPrecision === "day"
    ? Date.parse(`${event.endsAt.slice(0, 10)}T00:00:00Z`) + 2 * DAY : Date.parse(event.endsAt);
}
function startBound(event: GachaEvent): number {
  return event.startPrecision === "unknown" ? -Infinity : event.startPrecision === "day"
    ? Date.parse(`${event.startsAt.slice(0, 10)}T00:00:00Z`) - 14 * 3_600_000 : Date.parse(event.startsAt);
}
function overlaps(a: GachaEvent, b: GachaEvent): boolean {
  return startBound(a) < endBound(b) && startBound(b) < endBound(a);
}

export interface LabelDiagnostics { errors: string[]; warnings: string[] }
export const comparable = (s: string) => s.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");

/** Semantic correctness still needs a human review; these are conservative guards. */
export function labelDiagnostics(events: readonly GachaEvent[], registry: TimelineRegistry): LabelDiagnostics {
  const result: LabelDiagnostics = { errors: [], warnings: [] };
  const decisions = new Map(registry.decisions.map(d => [d.eventId, d]));
  const effective = events.filter(publicEvent).map(event => {
    const d = decisions.get(event.id);
    const label = d?.decision === "label" && d.fingerprint === semanticFingerprint(event) ? d.timelineTitle : null;
    if (label !== null) {
      const qualifiers = event.title.match(/\b(?:phase|cycle|season)\s+[\p{L}\p{N}]+/giu) ?? [];
      for (const qualifier of qualifiers) if (!label.toLowerCase().includes(qualifier.toLowerCase())) {
        result.warnings.push(`${event.id}: check lost qualifier ${qualifier}`);
      }
      for (const subject of event.recognitionSubjects ?? []) if (!comparable(label).includes(comparable(subject))) {
        result.warnings.push(`${event.id}: check missing featured subject ${subject}`);
      }
      if (label.length > 80) result.warnings.push(`${event.id}: long label (${label.length} chars), check compactness`);
      if (/\b(?:confirmed|official|guaranteed|ends?\s+\d)|\d{1,2}:\d{2}/i.test(label) && !event.title.includes(label)) {
        result.warnings.push(`${event.id}: check added certainty/date claim`);
      }
    }
    return { event, label, identity: label ?? originalTimelineIdentity(event) };
  });
  for (let i = 0; i < effective.length; i++) for (let j = i + 1; j < effective.length; j++) {
    const a = effective[i]!, b = effective[j]!;
    if ((!a.label && !b.label) || a.event.game !== b.event.game || !overlaps(a.event, b.event)) continue;
    const x = comparable(a.identity), y = comparable(b.identity);
    if (x === y) result.errors.push(`ambiguous overlapping labels: ${a.event.id} / ${b.event.id}`);
    else if (Math.min(x.length, y.length) >= 6 && (x.startsWith(y) || y.startsWith(x))) {
      result.warnings.push(`possibly confusable overlapping labels: ${a.event.id} / ${b.event.id}`);
    }
  }
  return result;
}

/** Source-supplied/cached presentation is stripped before exact registry lookup. */
export function applyTimelineLabels(events: readonly GachaEvent[], input: unknown): GachaEvent[] {
  const registry = TimelineRegistry.parse(input);
  const diagnostics = labelDiagnostics(events, registry);
  if (diagnostics.errors.length) throw new Error(diagnostics.errors.join("\n"));
  const decisions = new Map(registry.decisions.map(d => [d.eventId, d]));
  return events.map(event => {
    const { timelineTitle: _untrusted, ...original } = event;
    const d = decisions.get(event.id);
    return publicEvent(event) && d?.decision === "label" && d.fingerprint === semanticFingerprint(event)
      ? { ...original, timelineTitle: d.timelineTitle } : original;
  });
}

/** Validated final feed in; explicit clock and cap make output byte-replayable. */
export function buildTimelineQueue(feedInput: unknown, registryInput: unknown, asOf?: string, limit = DEFAULT_BATCH_SIZE) {
  const feed = EventFeed.parse(feedInput);
  const registry = TimelineRegistry.parse(registryInput);
  const at = z.string().datetime().parse(asOf ?? feed.generatedAt);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new Error("batch limit must be 1..100");
  const now = Date.parse(at);
  const events = feed.events.filter(publicEvent);
  if (new Set(events.map(e => e.id)).size !== events.length) throw new Error("duplicate final feed eventId");
  const published = new Map(events.map(e => [e.id, e]));
  const decisions = new Map(registry.decisions.map(d => [d.eventId, d]));
  let stale = 0, orphaned = 0, labelled = 0, kept = 0, historical = 0;
  for (const d of registry.decisions) {
    const event = published.get(d.eventId);
    if (!event) orphaned++;
    else if (semanticFingerprint(event) !== d.fingerprint) stale++;
  }
  const unresolved: Array<{ eventId: string; fingerprint: string; reason: string }> = [];
  const eligible: GachaEvent[] = [];
  for (const event of events) {
    const fingerprint = semanticFingerprint(event);
    const d = decisions.get(event.id);
    const matching = d?.fingerprint === fingerprint ? d : undefined;
    if (matching?.decision === "label") labelled++;
    else if (matching?.decision === "keep_original") kept++;
    else if (matching?.decision === "needs_research") unresolved.push({ eventId: event.id, fingerprint, reason: matching.reason });
    if (endBound(event) <= now) { historical++; continue; }
    if (matching === undefined) eligible.push(event);
  }
  eligible.sort((a, b) => {
    const futureA = startBound(a) > now, futureB = startBound(b) > now;
    return Number(futureA) - Number(futureB) ||
      (futureA && futureB ? startBound(a) - startBound(b) : 0) ||
      compareBound(endBound(a), endBound(b)) || compare(a.id, b.id);
  });
  unresolved.sort((a, b) => compare(a.eventId, b.eventId));
  return {
    schemaVersion: 1 as const, fingerprintContract: FINGERPRINT_CONTRACT, rulesVersion: RULES_VERSION,
    asOf: at, batchLimit: limit,
    counts: { published: events.length, eligible: eligible.length, batch: Math.min(limit, eligible.length),
      remaining: Math.max(0, eligible.length - limit), labelled, kept, needsResearch: unresolved.length,
      unresolvedRemaining: Math.max(0, unresolved.length - limit), stale, orphaned, historical },
    events: eligible.slice(0, limit).map(event => ({
      eventId: event.id, fingerprint: semanticFingerprint(event), game: event.game, type: event.type,
      title: event.title, currentIdentity: originalTimelineIdentity(event),
      ...(event.recognitionSubjects === undefined ? {} : { recognitionSubjects: event.recognitionSubjects }),
      summary: event.summary?.normalize("NFC").replace(/\s+/gu, " ").trim().slice(0, 300) || null,
      startsAt: event.startsAt, startPrecision: event.startPrecision,
      endsAt: event.endsAt, endPrecision: event.endPrecision,
      regionScoped: event.regionScoped, regionEnds: event.regionEnds, sourceUrl: event.sourceUrl,
    })),
    unresolved: unresolved.slice(0, limit),
  };
}
function compareBound(a: number, b: number): number { return a === b ? 0 : a < b ? -1 : 1; }
export type TimelineQueue = ReturnType<typeof buildTimelineQueue>;
export const queueBytes = (queue: TimelineQueue): string => `${JSON.stringify(queue, null, 2)}\n`;

/** Read-only acceptance seam. Only the current capped routine batch is writable. */
export function validateTimelineProposals(
  proposals: unknown, feedInput: unknown, registryInput: unknown, asOf?: string,
): LabelDiagnostics {
  const result: LabelDiagnostics = { errors: [], warnings: [] };
  const parsed = TimelineRegistry.safeParse(proposals);
  if (!parsed.success) return { errors: [parsed.error.message], warnings: [] };
  const feed = EventFeed.parse(feedInput), registry = TimelineRegistry.parse(registryInput);
  const queue = buildTimelineQueue(feed, registry, asOf);
  const queued = new Map(queue.events.map(e => [e.eventId, e]));
  for (const d of parsed.data.decisions) {
    const event = queued.get(d.eventId);
    if (!event) result.errors.push(`${d.eventId}: not in current review batch`);
    else if (event.fingerprint !== d.fingerprint) result.errors.push(`${d.eventId}: stale/wrong fingerprint`);
  }
  if (result.errors.length) return result;
  const incoming = new Set(parsed.data.decisions.map(d => d.eventId));
  return labelDiagnostics(feed.events, { schemaVersion: 1, decisions: [
    ...registry.decisions.filter(d => !incoming.has(d.eventId)), ...parsed.data.decisions,
  ] });
}

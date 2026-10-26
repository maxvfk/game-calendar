import { z } from "zod";
import { EventFeed } from "../shared/feed.ts";
import type { GachaEvent } from "../shared/schema.ts";
import {
  RULES_VERSION, TimelineDecision, TimelineRegistry, comparable, endBound, labelDiagnostics, publicEvent,
  semanticFingerprint,
} from "./timeline-labels.ts";

/** The model's whole response. Each decision is checked on its own below. */
const Proposals = z.object({ schemaVersion: z.literal(1), decisions: z.array(z.unknown()).max(100) }).strict();

export type AcceptOutcome =
  | { eventId: string; outcome: "accepted"; decision: TimelineDecision["decision"]; timelineTitle?: string }
  | { eventId: string; outcome: "guarded"; proposed: string; why: string }
  | { eventId: string; outcome: "rejected"; why: string };
export interface AcceptResult {
  registry: TimelineRegistry;
  changed: boolean;
  outcomes: AcceptOutcome[];
  warnings: string[];
}

const CONNECTORS = new Set(["a", "an", "and", "at", "by", "for", "from", "in", "of", "on", "or", "the", "to", "vs", "with"]);
/** Words that turn copy into a claim or an instruction. Each needs support in the event text. */
const CLAIMS = new Set(["free", "guaranteed", "confirmed", "official", "exclusive", "final", "last", "new", "rerun",
  "permanent", "extended", "early", "ignore", "disregard", "instruction", "instructions", "prompt", "click", "visit"]);
const QUALIFIER = /\b(?:phase|cycle|season|part|act|chapter|version)\s+[\p{L}\p{N}][\p{L}\p{N}.]*/giu;
const LINK = /https?:|www\.|\b[\p{L}\p{N}-]+\.(?:com|net|org|io|gg|jp|kr|cn|co)\b/iu;

const words = (text: string) => text.normalize("NFKC").split(/[^\p{L}\p{N}]+/u).filter(Boolean);

/** A label word is grounded when the event's own text has it, allowing a plural ending. */
function grounded(word: string, source: ReadonlySet<string>): boolean {
  const w = word.toLowerCase();
  return source.has(w) || source.has(`${w}s`) || source.has(`${w}es`) ||
    (w.endsWith("es") && source.has(w.slice(0, -2))) || (w.endsWith("s") && source.has(w.slice(0, -1)));
}

/**
 * Checks a proposed label only against the event's canonical input (title, subjects,
 * summary) and the reviewed vocabulary, never against model-written text.
 * Returns why the label is unsafe, or null.
 */
export function labelGuard(event: GachaEvent, label: string, vocabulary: readonly string[]): string | null {
  const subjects = event.recognitionSubjects ?? [];
  const source = new Set(words([event.title, ...subjects, event.summary ?? ""].join(" ")).map(w => w.toLowerCase()));
  for (const w of vocabulary) source.add(w);
  if (LINK.test(label)) return "link or domain";
  const ungrounded = words(label).filter(w => !CONNECTORS.has(w.toLowerCase()) && !grounded(w, source));
  const names = ungrounded.filter(w => /^\p{Lu}/u.test(w) || /\p{N}/u.test(w));
  if (names.length) return `name or number not in the event: ${names.join(", ")}`;
  const claims = ungrounded.filter(w => CLAIMS.has(w.toLowerCase()));
  if (claims.length) return `unsupported claim: ${claims.join(", ")}`;
  const lost = (event.title.match(QUALIFIER) ?? []).filter(q => !comparable(label).includes(comparable(q)));
  if (lost.length) return `lost ${lost.join(", ")}`;
  const missing = subjects.filter(s => !comparable(label).includes(comparable(s)));
  if (missing.length) return `lost featured subject ${missing.join(", ")}`;
  return null;
}

/** A guard hit is recorded, not published: the event leaves the queue until its input changes. */
function guardedDecision(base: { eventId: string; fingerprint: string; rulesVersion: string }, why: string, proposed: string): TimelineDecision {
  const tail = `; proposed "${proposed}"`;
  const room = 300 - "auto-guard: ".length - tail.length;
  const shortWhy = why.length <= room ? why : `${why.slice(0, Math.max(0, room - 1)).trimEnd()}…`;
  const { eventId, fingerprint, rulesVersion } = base;
  return { eventId, fingerprint, rulesVersion, decision: "needs_research", reason: `auto-guard: ${shortWhy}${tail}` };
}

/**
 * Deterministic accept step. Run it against the freshest feed and registry: every
 * decision is re-checked there (published, same fingerprint, not yet decided, not
 * over), so a stale model answer is rejected rather than written. Partial acceptance:
 * a rejected decision is simply not recorded and its event returns to the queue.
 */
export function acceptTimelineProposals(
  proposalsInput: unknown, feedInput: unknown, registryInput: unknown,
  vocabulary: readonly string[] = [], asOf?: string,
): AcceptResult {
  const proposals = Proposals.parse(proposalsInput);
  const feed = EventFeed.parse(feedInput);
  const registry = TimelineRegistry.parse(registryInput);
  const now = Date.parse(z.string().datetime().parse(asOf ?? feed.generatedAt));
  const published = new Map(feed.events.filter(publicEvent).map(e => [e.id, e]));
  const recorded = new Map(registry.decisions.map(d => [d.eventId, d]));
  const counts = new Map<string, number>();
  for (const raw of proposals.decisions) {
    const id = (raw as { eventId?: unknown } | null)?.eventId;
    if (typeof id === "string") counts.set(id, (counts.get(id) ?? 0) + 1);
  }

  const outcomes: AcceptOutcome[] = [];
  const incoming = new Map<string, TimelineDecision>();
  for (const raw of proposals.decisions) {
    const parsed = TimelineDecision.safeParse(raw);
    const rawId = (raw as { eventId?: unknown } | null)?.eventId;
    const eventId = typeof rawId === "string" ? rawId.slice(0, 300) : "(missing eventId)";
    const reject = (why: string) => outcomes.push({ eventId, outcome: "rejected", why });
    if (!parsed.success) { reject(`invalid decision: ${parsed.error.issues[0]?.message ?? "schema"}`); continue; }
    const d = parsed.data;
    const event = published.get(d.eventId);
    const prior = recorded.get(d.eventId);
    if ((counts.get(d.eventId) ?? 0) > 1) reject("duplicate eventId in proposals");
    else if (d.rulesVersion !== RULES_VERSION) reject(`rulesVersion ${d.rulesVersion} is not ${RULES_VERSION}`);
    else if (!event) reject("not a published event");
    else if (semanticFingerprint(event) !== d.fingerprint) reject("stale fingerprint: the event changed");
    else if (prior?.fingerprint === d.fingerprint) reject("already decided");
    else if (endBound(event) <= now) reject("event is over");
    else if (d.decision !== "label") {
      incoming.set(d.eventId, d);
      outcomes.push({ eventId: d.eventId, outcome: "accepted", decision: d.decision });
    } else {
      const why = labelGuard(event, d.timelineTitle, vocabulary);
      if (why === null) {
        incoming.set(d.eventId, d);
        outcomes.push({ eventId: d.eventId, outcome: "accepted", decision: "label", timelineTitle: d.timelineTitle });
      } else {
        incoming.set(d.eventId, guardedDecision(d, why, d.timelineTitle));
        outcomes.push({ eventId: d.eventId, outcome: "guarded", proposed: d.timelineTitle, why });
      }
    }
  }

  // A new label that collides with an overlapping identity is guarded too; repeat until clean.
  const merge = (): TimelineRegistry => ({
    schemaVersion: 1,
    decisions: [
      ...registry.decisions.map(d => incoming.get(d.eventId) ?? d),
      ...[...incoming.values()].filter(d => !recorded.has(d.eventId)),
    ],
  });
  for (;;) {
    const errors = labelDiagnostics(feed.events, merge()).errors;
    if (!errors.length) break;
    const colliding = new Set(errors.flatMap(e => e.match(/^ambiguous overlapping labels: (\S+) \/ (\S+)$/)?.slice(1) ?? []));
    const culprit = [...incoming.values()].find(d => d.decision === "label" && colliding.has(d.eventId));
    if (culprit?.decision !== "label") throw new Error(errors.join("\n"));
    const why = "same name as an overlapping event";
    incoming.set(culprit.eventId, guardedDecision(culprit, why, culprit.timelineTitle));
    const i = outcomes.findIndex(o => o.eventId === culprit.eventId && o.outcome === "accepted");
    outcomes[i] = { eventId: culprit.eventId, outcome: "guarded", proposed: culprit.timelineTitle, why };
  }

  const next = TimelineRegistry.parse(merge());
  const newIds = new Set([...incoming.values()].filter(d => d.decision === "label").map(d => d.eventId));
  const warnings = labelDiagnostics(feed.events, next).warnings.filter(w => [...newIds].some(id => w.includes(id)));
  return { registry: next, changed: incoming.size > 0, outcomes, warnings };
}

/** Key order of the reviewed file. Parsing reorders keys, so writing restores it. */
const KEY_ORDER = ["eventId", "fingerprint", "rulesVersion", "decision", "timelineTitle", "reason"] as const;
const ordered = (d: TimelineDecision) =>
  Object.fromEntries(KEY_ORDER.flatMap(k => k in d ? [[k, (d as Record<string, unknown>)[k]]] : []));

/** Same bytes as the reviewed file, so an unchanged registry is an empty diff. */
export const registryBytes = (registry: TimelineRegistry): string =>
  `${JSON.stringify({ schemaVersion: registry.schemaVersion, decisions: registry.decisions.map(ordered) }, null, 2)}\n`;

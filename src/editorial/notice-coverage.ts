/** C1a.1: deterministic offline analysis only. Never imported by feed/client. */
import { z } from "zod";
import { ArticleNotice, EvidenceSidecar, type Diagnostic } from "./event-evidence.ts";
import { ARTICLE_SOURCE_GAMES, isArticleSource } from "./article-evidence.ts";
import { DATE_LIMITS, DATE_READER_VERSION, readDateSpans, type DateSpan } from "./date-spans.ts";
import { Baseline, BaselineEntry, IgnoreRegistry, baselineKey, decisionKey, emptyBaseline, emptyIgnores } from "./coverage-state.ts";
import { GachaEvent, Region } from "../shared/schema.ts";

export const COVERAGE_LIMITS = { notices: 2000, events: 5000, attributions: 10000, diagnostics: 20000, totalTextUnits: 5_000_000, inputBytes: 32 * 1024 * 1024, outputBytes: 24 * 1024 * 1024, associationsPerNotice: 64, matchesPerSpan: 16, totalSpans: 20000 } as const;
export type CoverageStatus = "processed" | "partially processed" | "unprocessed" | "ignored";
export type Evaluation = "complete" | "uncertain" | "incomplete" | "not evaluated";
export type BoundaryMatch = { eventId: string; field: string; value: string; basis: "confirmed-attribution" | "reviewed-notice-url"; precision: "day" | "minute" | "second" };
const compare = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
const sorted = <T>(items: T[], key: (t: T) => string) => [...items].sort((a, b) => compare(key(a), key(b)));
const unique = (items: string[]) => [...new Set(items)].sort(compare);
const fatalInventory = new Set(["source_unavailable", "article_extraction_failed", "article_inventory_empty", "article_inventory_incomplete", "article_assembly_failed", "sidecar_assembly_failed", "diagnostic_validation_failed"]);
const refusal = (d: Diagnostic) => /^(?:winner_|merge_source_conflict|duplicate_candidate|ambiguous_|candidate_reference_conflict|notice_reference_conflict|unmatched_notice_attribution|no_exact_winner)/.test(d.code);

/** Deliberately do not compare floating source clocks to UTC values or invent
 * regional offsets. Day-only spans match day-precision boundaries only.
 * A region-scoped end needs an explicit source region; endsAt alone is merely
 * the calendar's selected regional representative, not a global deadline.
 */
function matchBoundary(span: DateSpan, event: GachaEvent, basis: BoundaryMatch["basis"]): BoundaryMatch[] {
  if (span.uncertainty.length || span.value.date === null || span.value.precision === "unknown") return [];
  const candidates: Array<{ field: string; value: string; precision: string }> = [];
  if (span.role !== "end" && span.region === null) candidates.push({ field: "startsAt", value: event.startsAt, precision: event.startPrecision });
  if (span.role !== "start" && event.endsAt) {
    if (event.regionScoped) {
      if (span.region && event.regionEnds?.[span.region]) candidates.push({ field: `regionEnds.${span.region}`, value: event.regionEnds[span.region]!, precision: event.endPrecision });
    } else if (span.region === null) candidates.push({ field: "endsAt", value: event.endsAt, precision: event.endPrecision });
  }
  return candidates.filter(c => {
    if (span.value.precision === "day") return c.precision === "day" && c.value.slice(0, 10) === span.value.date;
    if (c.precision !== "exact" || !span.value.instant) return false;
    // Exact in the public schema is minute precision; do not erase nonzero
    // seconds stated by a notice or by the represented boundary.
    return span.value.precision === "second" ? Date.parse(c.value) === Date.parse(span.value.instant) :
      Date.parse(c.value) === Date.parse(span.value.instant);
  }).map(c => ({ eventId: event.id, field: c.field, value: c.value, basis, precision: span.value.precision as BoundaryMatch["precision"] }));
}
export function makeCoverageBaseline(notices: ArticleNotice[]) {
  const entries = notices.map(n => BaselineEntry.parse({ sourceId: n.sourceId, noticeId: n.noticeId,
    position: n.position, sourceUrl: n.sourceUrl, contentHash: n.contentHash, format: n.format }));
  return Baseline.parse({ schemaVersion: 1, purpose: "initial-notification-suppression-only", entries: sorted(entries, baselineKey) });
}

export function buildNoticeCoverage(input: {
  sidecar: unknown; finalEvents: unknown; ignores?: unknown; baseline?: unknown;
}) {
  const ignores = IgnoreRegistry.parse(input.ignores ?? emptyIgnores());
  const baseline = Baseline.parse(input.baseline ?? emptyBaseline());
  const diagnostics: string[] = [];
  // Preflight limits before expensive sidecar hash/reference validation.
  const envelope = input.sidecar as Partial<z.infer<typeof EvidenceSidecar>> | null;
  const arrays = envelope && [envelope.notices, envelope.articleAttributions, envelope.diagnostics];
  const auxiliaryLimit = envelope && [envelope.entries, envelope.unattached].some(a => Array.isArray(a) && a.length > COVERAGE_LIMITS.events);
  let limited = Boolean(auxiliaryLimit);
  if (arrays && Array.isArray(arrays[0]) && Array.isArray(arrays[1]) && Array.isArray(arrays[2])) {
    limited ||= arrays[0].length > COVERAGE_LIMITS.notices || arrays[1].length > COVERAGE_LIMITS.attributions || arrays[2].length > COVERAGE_LIMITS.diagnostics;
    let units = 0;
    if (!limited) for (const n of arrays[0] as ArticleNotice[]) {
      units += typeof n?.content === "string" ? n.content.length : 0;
      units += typeof n?.title === "string" ? n.title.length : 0;
      if (units > COVERAGE_LIMITS.totalTextUnits) { limited = true; break; }
    }
  }
  if (Array.isArray(input.finalEvents) && input.finalEvents.length > COVERAGE_LIMITS.events) limited = true;
  const sideResult = limited ? null : EvidenceSidecar.safeParse(input.sidecar);
  const eventsResult = limited ? null : z.array(GachaEvent).max(COVERAGE_LIMITS.events).safeParse(input.finalEvents);
  const side = sideResult?.success ? sideResult.data : null;
  const finals = eventsResult?.success ? eventsResult.data : null;
  if (limited) diagnostics.push("report_input_limit");
  else {
    if (!side) diagnostics.push("invalid_notice_inventory");
    if (!finals) diagnostics.push("invalid_final_event_evidence");
  }
  const finalIdCounts = new Map<string, number>();
  const finalByUrl = new Map<string, GachaEvent[]>();
  for (const event of finals ?? []) {
    finalIdCounts.set(event.id, (finalIdCounts.get(event.id) ?? 0) + 1);
    const values = finalByUrl.get(event.sourceUrl) ?? [];
    values.push(event); finalByUrl.set(event.sourceUrl, values);
  }
  let spanBudget = COVERAGE_LIMITS.totalSpans;
  const usedIgnores = new Set<string>();
  const reports = Object.entries(ARTICLE_SOURCE_GAMES).sort(([a], [b]) => compare(a, b)).map(([sourceId, game]) => {
    const sourceDiagnostics = side?.diagnostics.filter(d => d.sourceId === sourceId || !d.sourceId && fatalInventory.has(d.code)) ?? [];
    const sourceAvailable = Boolean(side && side.notices.some(n => n.sourceId === sourceId) && !sourceDiagnostics.some(d => fatalInventory.has(d.code)));
    const inventoryValid = sourceAvailable && !sourceDiagnostics.some(d => fatalInventory.has(d.code));
    const notices = sorted(side?.notices.filter(n => n.sourceId === sourceId) ?? [], n => String(n.position).padStart(12, "0"));
    const records = notices.map(notice => {
      const duplicate = notices.filter(n => n.noticeId === notice.noticeId).length !== 1;
      const localDiagnostics = unique([
        ...sourceDiagnostics.filter(d => !d.noticeId || d.noticeId === notice.noticeId).map(d => d.code),
        ...(duplicate ? ["duplicate_notice_identity"] : []),
        ...(!inventoryValid ? ["inventory_not_trustworthy"] : []),
        ...(notice.game !== game ? ["notice_source_game_conflict"] : []),
        ...(!finals ? ["invalid_final_event_evidence"] : []),
      ]);
      const rows = side!.articleAttributions.filter(a => a.event.sourceId === sourceId && a.noticeId === notice.noticeId && a.noticePosition === notice.position);
      const associations: Array<{ event: GachaEvent; basis: BoundaryMatch["basis"] }> = [];
      let associationLimit = false;
      if (inventoryValid && !duplicate && notice.game === game && finals) {
        for (const event of finalByUrl.get(notice.sourceUrl) ?? []) {
          if (associations.length === COVERAGE_LIMITS.associationsPerNotice) { associationLimit = true; break; }
          if (event.game !== game || event.status !== "published" || finalIdCounts.get(event.id) !== 1) continue;
          const related = rows.filter(a => a.event.id === event.id);
          // Existing refusal diagnostics remain authoritative. A direct reviewed
          // URL cannot bypass a refused C0 association to the same event.
          const refused = side!.diagnostics.some(d => d.sourceEventId === event.id && (!d.sourceId || d.sourceId === sourceId) && refusal(d));
          if (refused) continue;
          const confirmed = related.length === 1 && related[0]!.finalEventId === event.id &&
            related[0]!.event.sourceUrl === notice.sourceUrl && event.sourceUrl === notice.sourceUrl &&
            (event.sourceId === sourceId || event.sourceId === `reviewed-${game}`) &&
            related[0]!.event.type === event.type &&
            (["startsAt", "endsAt", "startPrecision", "endPrecision", "regionScoped"] as const).every(k => related[0]!.event[k] === event[k]) &&
            Region.options.every(r => related[0]!.event.regionEnds?.[r] === event.regionEnds?.[r]);
          if (confirmed) associations.push({ event, basis: "confirmed-attribution" });
          else if (related.length === 0 && event.sourceId === `reviewed-${game}` && event.extractionMethod === "manual" && event.sourceUrl === notice.sourceUrl &&
            notices.filter(n => n.sourceUrl === notice.sourceUrl).length === 1)
            associations.push({ event, basis: "reviewed-notice-url" });
        }
      }
      const decisions = sorted(ignores.decisions.filter(d => d.sourceId === sourceId && d.noticeId === notice.noticeId &&
        d.position === notice.position && d.sourceUrl === notice.sourceUrl && d.contentHash === notice.contentHash), decisionKey);
      const wholeIgnore = decisions.find(d => !d.span);
      if (wholeIgnore) usedIgnores.add(decisionKey(wholeIgnore));
      const reads = (["title", "content"] as const).map(field => {
        const read = spanBudget <= 0 ? { readerVersion: DATE_READER_VERSION, spans: [], diagnostics: ["report_span_limit"], complete: false } : readDateSpans(notice[field], notice.format);
        if (read.spans.length > spanBudget) {
          read.spans = read.spans.slice(0, Math.max(0, spanBudget));
          read.diagnostics.push("report_span_limit"); read.complete = false;
        }
        spanBudget -= read.spans.length;
        return { field, read };
      });
      let matchLimit = false;
      const datedSpans = reads.flatMap(({ field, read }) => read.spans.map(span => {
        const ignore = decisions.find(d => d.span?.field === field && d.span.ref === span.ref) ?? null;
        if (ignore) usedIgnores.add(decisionKey(ignore));
        const matches = sorted(associations.flatMap(a => matchBoundary(span, a.event, a.basis)), m => JSON.stringify([m.eventId, m.field]));
        if (matches.length > COVERAGE_LIMITS.matchesPerSpan) matchLimit = true;
        return { ...span, field, matches: matches.slice(0, COVERAGE_LIMITS.matchesPerSpan), ignore, disposition: wholeIgnore || ignore ? "ignored" as const : matches.length ? "matched" as const : "unmatched" as const,
          reason: wholeIgnore || ignore ? "reviewed_ignore" : matches.length ? null : span.uncertainty.length ? "unresolved_date" :
            !associations.length ? "no_trustworthy_notice_event_association" : "no_compatible_represented_boundary" };
      }));
      // A complete explicit range must refer to boundaries of the SAME event.
      // Independently coincident dates from two different events are insufficient.
      for (const field of ["title", "content"] as const) {
        const groups = new Set(datedSpans.filter(s => s.field === field && s.group !== null).map(s => s.group));
        for (const group of groups) {
          const peers = datedSpans.filter(s => s.field === field && s.group === group);
          if (peers.length !== 2 || peers.some(s => s.disposition === "ignored")) continue;
          const common = peers[0]!.matches.filter(m => peers[1]!.matches.some(other => other.eventId === m.eventId)).map(m => m.eventId);
          for (const peer of peers) {
            peer.matches = peer.matches.filter(m => common.includes(m.eventId));
            if (peer.disposition === "matched" && !peer.matches.length) { peer.disposition = "unmatched"; peer.reason = "range_not_represented_by_one_event"; }
          }
        }
      }
      // An undated title is ordinary. An undated body or another unreadable body
      // expression is not proof of complete coverage.
      const readDiagnostics = unique(reads.flatMap(({ field, read }) => read.diagnostics.filter(c => c !== "unresolved_date_expression" && (c !== "no_recognized_dates" || field === "content" && !datedSpans.length)).map(c => `${field}:${c}`)));
      const allDiagnostics = unique([...localDiagnostics, ...readDiagnostics, ...(associationLimit ? ["association_limit"] : []), ...(matchLimit ? ["match_limit"] : [])]);
      const incomplete = associationLimit || matchLimit || reads.some(r => !r.read.complete);
      const uncertain = !inventoryValid || duplicate || !finals || allDiagnostics.length > 0 || datedSpans.some(s => s.uncertainty.length && s.disposition !== "ignored");
      const evaluation: Evaluation = incomplete ? "incomplete" : uncertain ? "uncertain" : "complete";
      let status: CoverageStatus | null;
      if (wholeIgnore) status = "ignored";
      else if (!datedSpans.length) status = null;
      else if (!incomplete && !uncertain && datedSpans.every(s => s.disposition === "ignored")) status = "ignored";
      else if (!incomplete && !uncertain && datedSpans.every(s => s.disposition !== "unmatched")) status = "processed";
      else status = associations.length ? "partially processed" : "unprocessed";
      return { sourceId, game, noticeId: notice.noticeId, position: notice.position, sourceUrl: notice.sourceUrl,
        contentHash: notice.contentHash, format: notice.format, status, evaluation,
        baselineMember: baseline.entries.some(e => baselineKey(e) === baselineKey(BaselineEntry.parse({ sourceId, noticeId: notice.noticeId, position: notice.position, sourceUrl: notice.sourceUrl, contentHash: notice.contentHash, format: notice.format }))),
        associations: sorted(associations.map(a => ({ eventId: a.event.id, basis: a.basis })), a => a.eventId),
        spans: datedSpans, unmatchedSpans: datedSpans.filter(s => s.disposition === "unmatched").map(s => ({ field: s.field, ref: s.ref, quote: s.quote, reason: s.reason })),
        ignores: decisions, diagnostics: allDiagnostics };
    });
    return { sourceId, game, available: sourceAvailable,
      evaluation: !side || !notices.length ? "not evaluated" as const : inventoryValid ? "evaluated" as const : "uncertain" as const,
      limitations: unique(["Inventory availability is not source or calendar completeness", ...(!inventoryValid ? ["Missing, invalid or incomplete notice inventory"] : [])]),
      diagnostics: unique(sourceDiagnostics.map(d => d.code)), notices: records };
  });
  const unknownSources = unique(side?.notices.filter(n => !isArticleSource(n.sourceId)).map(n => n.sourceId) ?? []);
  return { schemaVersion: 1 as const, engineVersion: "notice-coverage-v1" as const, readerVersion: DATE_READER_VERSION,
    limits: { ...COVERAGE_LIMITS, dateReader: DATE_LIMITS }, diagnostics: unique(diagnostics), sources: reports,
    unsupported: [{ game: "endfield", evaluation: "not evaluated", reason: "notice inventory unsupported" },
      { game: "czn", evaluation: "not evaluated", reason: "notice inventory unsupported" },
      ...unknownSources.map(sourceId => ({ sourceId, evaluation: "not evaluated", reason: "notice inventory unsupported" }))],
    unusedIgnoreDecisions: sorted(ignores.decisions.filter(d => !usedIgnores.has(decisionKey(d))), decisionKey) };
}
export type NoticeCoverageReport = ReturnType<typeof buildNoticeCoverage>;

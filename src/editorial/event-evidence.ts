/** Internal, untrusted source evidence. Never import from shared feed/client code. */
import { z } from "zod";
import { createHash } from "node:crypto";
import { GachaEvent, Region } from "../shared/schema.ts";
import type { MergeResult } from "../ingest/merge.ts";

export const HASH_CONTRACT = "event-evidence-sha256-v1";
export const codePoints = (text: string) => [...text].length;
export const normalizeEvidence = (text: string) => text.normalize("NFC").replace(/\s+/gu, " ").trim();
const bounded = (max: number) => z.string().min(1).refine(s => codePoints(s) <= max, `exceeds ${max} code points`);
const id = bounded(300);
const url = bounded(2048).refine(s => { try { return new URL(s).protocol === "https:"; } catch { return false; } }, "expected HTTPS URL");
export const Excerpt = z.object({
  kind: z.enum(["featured", "activity", "rewards"]),
  text: bounded(500).refine(s => s === normalizeEvidence(s) && !/[<>\p{C}\uFFFD]|&(?:#[^; ]+|[a-z]+);/iu.test(s), "expected normalized plain text"),
}).strict();
export type Excerpt = z.infer<typeof Excerpt>;
export const Capture = z.object({
  capturedAt: z.string().datetime().nullable(),
  lastConfirmedAt: z.string().datetime().nullable(),
  // Fixture filenames establish a day, not an exact midnight capture instant.
  fixtureCaptureDay: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
}).strict();
export type Capture = z.infer<typeof Capture>;
const Source = z.object({
  sourceEventId: id, sourceId: id, sourceUrl: url,
  ...Capture.shape,
  excerpts: z.array(Excerpt).min(1).max(6),
}).strict().refine(s => s.excerpts.reduce((n, e) => n + codePoints(e.text), 0) <= 2000, "source evidence limit exceeded");
export type EvidenceSource = z.infer<typeof Source>;
const textCount = (sources: EvidenceSource[]) => sources.reduce((n, s) => n + s.excerpts.reduce((k, e) => k + codePoints(e.text), 0), 0);
const EntryContent = z.object({
  eventId: id, game: z.literal("wuwa"), sources: z.array(Source).min(1).max(2),
}).strict().refine(e => e.sources.reduce((n, s) => n + s.excerpts.length, 0) <= 6 && textCount(e.sources) <= 2000 && new Set(e.sources.flatMap(s => s.excerpts.map(x => x.text))).size === e.sources.flatMap(s => s.excerpts).length, "event evidence limits exceeded");
type EntryContent = z.infer<typeof EntryContent>;
export function evidenceHash(entry: EntryContent): string {
  // Fixed field order; timestamps/extractor version never participate.
  return createHash("sha256").update(JSON.stringify({
    contract: HASH_CONTRACT, eventId: entry.eventId, game: entry.game,
    sources: entry.sources.map(s => ({ sourceEventId: s.sourceEventId, sourceId: s.sourceId, sourceUrl: s.sourceUrl,
      excerpts: s.excerpts.map(e => ({ kind: e.kind, text: e.text })) })),
  })).digest("hex");
}
const Entry = z.object({ eventId: id, game: z.literal("wuwa"), sources: z.array(Source).min(1).max(2), evidenceHash: z.string().regex(/^[a-f0-9]{64}$/) }).strict()
  .superRefine((e, ctx) => {
    if (!EntryContent.safeParse({ eventId: e.eventId, game: e.game, sources: e.sources }).success || evidenceHash(e) !== e.evidenceHash)
      ctx.addIssue({ code: "custom", message: "invalid evidence bounds/hash" });
  });
export type EvidenceEntry = z.infer<typeof Entry>;
export const Diagnostic = z.object({ code: bounded(80), sourceEventId: id.nullable(), sourceUrl: url.nullable(), detail: bounded(300), sourceId: id.optional(), noticeId: id.nullable().optional(), finalSourceId: id.optional(), finalSourceUrl: url.optional() }).strict();
export type Diagnostic = z.infer<typeof Diagnostic>;
/** Full untrusted notice data for offline coverage replay; NEVER eligible model excerpts. */
export const ArticleNotice = z.object({
  sourceId: id, game: z.enum(["genshin", "hsr", "zzz", "nte", "wuwa"]), noticeId: id, sourceUrl: url,
  // Position is a snapshot locator, not part of the stable source/item identity.
  position: z.number().int().nonnegative(), title: z.string(), content: z.string(),
  format: z.enum(["markdown", "html", "bbcode"]), contentHash: z.string().regex(/^[a-f0-9]{64}$/),
  ...Capture.shape,
}).strict().refine(n => createHash("sha256").update(JSON.stringify([n.title, n.content])).digest("hex") === n.contentHash,
  "notice content hash mismatch");
export type ArticleNotice = z.infer<typeof ArticleNotice>;
export const ArticleAttribution = z.object({
  event: GachaEvent, noticeId: id.nullable(), noticePosition: z.number().int().nonnegative().nullable(),
  finalEventId: id.nullable(),
}).strict();
export type ArticleAttribution = z.infer<typeof ArticleAttribution>;
export const EvidenceSidecar = z.object({
  schemaVersion: z.literal(1), extractorVersion: z.enum(["wuwa-event-local-v1", "article-notices-v1"]), hashContract: z.literal(HASH_CONTRACT),
  entries: z.array(Entry),
  // Unattached source material is diagnostic only, never eligible agent input.
  unattached: z.array(Source), diagnostics: z.array(Diagnostic),
  notices: z.array(ArticleNotice).default([]), articleAttributions: z.array(ArticleAttribution).default([]),
}).strict().superRefine((s, ctx) => {
  if (new Set(s.entries.map(e => e.eventId)).size !== s.entries.length)
    ctx.addIssue({ code: "custom", message: "duplicate final event ID" });
  if (new Set(s.notices.map(n => JSON.stringify([n.sourceId, n.position]))).size !== s.notices.length)
    ctx.addIssue({ code: "custom", message: "duplicate notice locator" });
  for (const row of s.articleAttributions) {
    const notices = s.notices.filter(n => n.sourceId === row.event.sourceId && n.game === row.event.game &&
      n.noticeId === row.noticeId && n.sourceUrl === row.event.sourceUrl);
    if (row.noticeId === null ? row.noticePosition !== null || row.finalEventId !== null :
      notices.length !== 1 || notices[0]!.position !== row.noticePosition ||
      s.notices.filter(n => n.sourceId === row.event.sourceId && n.noticeId === row.noticeId).length !== 1 ||
      (row.finalEventId !== null && row.finalEventId !== row.event.id))
      ctx.addIssue({ code: "custom", message: "invalid article attribution reference" });
  }
});
export type EvidenceCandidate = { event: GachaEvent; source: EvidenceSource };
export type Extraction = { candidates: EvidenceCandidate[]; diagnostics: Diagnostic[]; notices?: ArticleNotice[]; articleAttributions?: ArticleAttribution[] };
/** Only explicit Git-reviewed callers may supply mappings. E1 ships no production mappings. */
export const EvidenceMapping = z.object({ sourceEventId: id, sourceId: id, sourceUrl: url, eventId: id, finalSourceUrl: url }).strict();
export type EvidenceMapping = z.infer<typeof EvidenceMapping>;
const order = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
const sourceKey = (s: EvidenceSource) => JSON.stringify([s.sourceId, s.sourceEventId, s.sourceUrl]);

/** Shared E1 exact-winner gate. Shared URLs, titles or dates alone never suffice. */
function exactWinner(event: GachaEvent, finalEvents: GachaEvent[], conflicts: MergeResult["conflicts"], mapping?: EvidenceMapping): GachaEvent | string {
  const targets = finalEvents.filter(e => e.id === (mapping?.eventId ?? event.id));
  if (targets.length !== 1) return targets.length ? "ambiguous_final_id" : "no_exact_winner";
  const target = targets[0]!;
  if (target.game !== event.game || target.type !== event.type ||
    (mapping ? target.sourceUrl !== mapping.finalSourceUrl : target.sourceUrl !== event.sourceUrl ||
      (target.sourceId !== event.sourceId && target.sourceId !== `reviewed-${event.game}`))) return "winner_reference_conflict";
  if (conflicts.some(c => [c.kept, c.rejected].some(e => e.id === event.id || e.id === target.id))) return "merge_source_conflict";
  return target;
}

/** Whole facts only: skip an oversized paragraph, never slice names/qualifiers. */
export function boundExcerpts(excerpts: Excerpt[], diagnose: (code: string) => void): Excerpt[] {
  const result: Excerpt[] = [];
  for (const kind of ["featured", "activity", "rewards"] as const) for (const raw of excerpts.filter(e => e.kind === kind)) {
    const e = { kind, text: normalizeEvidence(raw.text) };
    if (result.some(old => old.text === e.text)) continue;
    if (codePoints(e.text) > 500) { diagnose("fragment_limit"); continue; }
    if (!Excerpt.safeParse(e).success) { diagnose("unsafe_fragment"); continue; }
    if (result.length === 6 || result.reduce((n, x) => n + codePoints(x.text), 0) + codePoints(e.text) > 2000) { diagnose("event_limit"); continue; }
    result.push(e);
  }
  return result;
}

export function buildEvidenceSidecar(extraction: Extraction, finalEvents: GachaEvent[], conflicts: MergeResult["conflicts"] = [], mappings: EvidenceMapping[] = []) {
  mappings = mappings.map(m => EvidenceMapping.parse(m));
  const diagnostics = [...extraction.diagnostics];
  const unattached: EvidenceSource[] = [];
  const assigned = new Map<string, EvidenceCandidate[]>();
  const candidates = [...extraction.candidates].sort((a, b) => order(sourceKey(a.source), sourceKey(b.source)));
  for (const row of candidates) {
    Source.parse(row.source);
    const fail = (code: string) => {
      unattached.push(row.source);
      diagnostics.push({ code, sourceEventId: row.source.sourceEventId, sourceUrl: row.source.sourceUrl, detail: "Evidence omitted from eligible entries" });
    };
    if (row.event.id !== row.source.sourceEventId || row.event.sourceId !== row.source.sourceId || row.event.sourceUrl !== row.source.sourceUrl || row.event.game !== "wuwa") { fail("candidate_reference_conflict"); continue; }
    const duplicate = candidates.filter(r => sourceKey(r.source) === sourceKey(row.source));
    if (duplicate.length > 1) { fail("duplicate_candidate"); continue; }
    const maps = mappings.filter(m => m.sourceEventId === row.event.id && m.sourceId === row.source.sourceId && m.sourceUrl === row.source.sourceUrl);
    if (maps.length > 1) { fail("ambiguous_mapping"); continue; }
    const mapping = maps[0];
    const target = exactWinner(row.event, finalEvents, conflicts, mapping);
    if (typeof target === "string") { fail(target); continue; }
    const group = assigned.get(target.id) ?? [];
    group.push(row); assigned.set(target.id, group);
  }
  const entries: EvidenceEntry[] = [];
  for (const [eventId, rows] of [...assigned].sort(([a], [b]) => order(a, b))) {
    const diag = (code: string, detail = "Combined evidence omitted whole facts at pilot ceiling") => diagnostics.push({ code, sourceEventId: eventId, sourceUrl: null, detail });
    // Conflicting featured claims from independent documents need review.
    const featured = rows.map(r => r.source.excerpts.filter(e => e.kind === "featured").map(e => e.text).join("\n")).filter(Boolean);
    if (new Set(featured).size > 1) {
      rows.forEach(r => unattached.push(r.source));
      diag("conflicting_featured", "Conflicting featured claims require reviewed resolution"); continue;
    }
    const selected = new Map<EvidenceCandidate, Excerpt[]>();
    let count = 0, length = 0;
    const seenText = new Set<string>();
    for (const kind of ["featured", "activity", "rewards"] as const) for (const row of rows) {
      for (const e of row.source.excerpts.filter(e => e.kind === kind)) {
        if (seenText.has(e.text)) continue;
        if (!selected.has(row) && selected.size === 2) { diag("source_limit"); continue; }
        if (count === 6 || length + codePoints(e.text) > 2000) { diag("event_limit"); continue; }
        const excerpts = selected.get(row) ?? [];
        excerpts.push(e); selected.set(row, excerpts); count++; length += codePoints(e.text); seenText.add(e.text);
      }
    }
    const sources = rows.filter(row => selected.has(row)).map(row => ({ ...row.source, excerpts: selected.get(row)! }));
    if (sources.length) {
      const entry = { eventId, game: "wuwa" as const, sources };
      entries.push({ ...entry, evidenceHash: evidenceHash(entry) });
    }
  }
  const notices = (extraction.notices ?? []).map(n => ArticleNotice.parse(n));
  const articleRows = extraction.articleAttributions ?? [];
  const articleAttributions = articleRows.map(raw => {
    const row = { ...ArticleAttribution.parse(raw), finalEventId: null as string | null };
    const sameId = finalEvents.filter(e => e.id === row.event.id);
    const final = sameId.length === 1 ? sameId[0]! : null;
    const fail = (code: string) => diagnostics.push({ code, sourceEventId: row.event.id, sourceUrl: row.event.sourceUrl,
      sourceId: row.event.sourceId, noticeId: row.noticeId,
      ...(final ? { finalSourceId: final.sourceId, finalSourceUrl: final.sourceUrl } : {}),
      detail: "Article evidence omitted from confirmed final associations" });
    if (row.noticeId === null) {
      if (!diagnostics.some(d => d.sourceEventId === row.event.id && d.sourceUrl === row.event.sourceUrl &&
        ["candidate_reference_conflict", "unmatched_notice_attribution", "ambiguous_notice_attribution"].includes(d.code)))
        fail("unmatched_notice_attribution");
      return row;
    }
    const matches = notices.filter(n => n.sourceId === row.event.sourceId && n.game === row.event.game &&
      n.noticeId === row.noticeId && n.sourceUrl === row.event.sourceUrl);
    if (matches.length !== 1 || matches[0]!.position !== row.noticePosition ||
      notices.filter(n => n.sourceId === row.event.sourceId && n.noticeId === row.noticeId).length !== 1) {
      fail("notice_reference_conflict"); return { ...row, noticeId: null, noticePosition: null };
    }
    if (articleRows.filter(r => r.event.sourceId === row.event.sourceId && r.event.id === row.event.id).length !== 1) {
      fail("duplicate_candidate"); return row;
    }
    const target = exactWinner(row.event, finalEvents, conflicts);
    let refused = typeof target === "string";
    if (typeof target === "string") fail(target);
    // Keep every independently observed refusal, even behind a URL mismatch.
    if (final && final.type !== row.event.type) { fail("winner_type_conflict"); refused = true; }
    if (final && typeof target === "string" && target !== "merge_source_conflict" &&
      conflicts.some(c => [c.kept, c.rejected].some(e => e.id === row.event.id))) fail("merge_source_conflict");
    // A reviewed refinement is not proof of identical source dates/precision.
    if (final && ((["startsAt", "endsAt", "startPrecision", "endPrecision", "regionScoped"] as const).some(k =>
      row.event[k] !== final[k]) || Region.options.some(region =>
      row.event.regionEnds?.[region] !== final.regionEnds?.[region]))) {
      fail("winner_period_conflict"); refused = true;
    }
    if (refused || typeof target === "string") return row;
    return { ...row, finalEventId: target.id };
  });
  return EvidenceSidecar.parse({ schemaVersion: 1, extractorVersion: extraction.notices ? "article-notices-v1" : "wuwa-event-local-v1",
    hashContract: HASH_CONTRACT, entries, unattached, diagnostics, notices, articleAttributions });
}

/**
 * An invalid auxiliary candidate (or future extractor regression) must not
 * invalidate a successfully validated canonical feed. Fail closed for ALL
 * evidence in the failed lane, preserving a machine-readable diagnostic.
 */
export function safelyBuildEvidenceSidecar(
  extraction: Extraction,
  finalEvents: GachaEvent[],
  conflicts: MergeResult["conflicts"] = [],
  mappings: EvidenceMapping[] = [],
): z.infer<typeof EvidenceSidecar> {
  try {
    return buildEvidenceSidecar(extraction, finalEvents, conflicts, mappings);
  } catch {
    // Invalid article data must not discard independently valid WuWa E1 entries.
    if (extraction.notices?.length || extraction.articleAttributions?.length) {
      const sources = new Map((extraction.notices ?? []).map(n => [n.sourceId, n.sourceUrl]));
      const failure = { code: "article_assembly_failed", sourceEventId: null,
        detail: "Optional article validation failed; article inventory and associations omitted" };
      try {
        return buildEvidenceSidecar({ ...extraction, notices: [], articleAttributions: [],
          diagnostics: [...extraction.diagnostics, ...(sources.size ? [...sources].map(([sourceId, sourceUrl]) => ({
            ...failure, sourceId, sourceUrl,
          })) : [{ ...failure, sourceUrl: null }])] }, finalEvents, conflicts, mappings);
      } catch { /* Try recovering the independent article lane below. */ }
    }
    // Conversely, invalid E1 candidates cannot discard a valid article lane.
    // No candidates from the failed lane become eligible excerpts.
    if (extraction.notices?.length || extraction.articleAttributions?.length) {
      try {
        return buildEvidenceSidecar({ ...extraction, candidates: [],
          diagnostics: [...extraction.diagnostics, {
            code: "event_evidence_assembly_failed", sourceEventId: null, sourceUrl: null,
            detail: "Optional event evidence validation failed; event-local evidence omitted",
          }],
        }, finalEvents, conflicts);
      } catch { /* Neither lane could be recovered independently. */ }
    }
    return EvidenceSidecar.parse({
      schemaVersion: 1,
      extractorVersion: "wuwa-event-local-v1",
      hashContract: HASH_CONTRACT,
      entries: [],
      unattached: [],
      diagnostics: [...extraction.diagnostics.filter(d => Diagnostic.safeParse(d).success), {
        code: "sidecar_assembly_failed",
        sourceEventId: null,
        sourceUrl: null,
        detail: "Optional evidence validation failed; all evidence omitted",
      }],
    });
  }
}

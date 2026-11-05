import { expect, test } from "bun:test";
import { ArticleNotice, buildEvidenceSidecar } from "../src/editorial/event-evidence.ts";
import { noticeContentHash } from "../src/editorial/article-evidence.ts";
import { buildNoticeCoverage, makeCoverageBaseline } from "../src/editorial/notice-coverage.ts";
import { Baseline, migratePositionalBaseline } from "../src/editorial/coverage-state.ts";
import { readDateSpans } from "../src/editorial/date-spans.ts";
import { GachaEvent } from "../src/shared/schema.ts";
const now = "2026-10-30T12:00:00.000Z", sourceId = "genshin-kqm-ginews";
function notice(content: string, position = 0, noticeId = "synthetic") {
  const title = "Synthetic boundary-evidence notice";
  return ArticleNotice.parse({ sourceId, game: "genshin", noticeId, position, title, content, format: "markdown", contentHash: noticeContentHash(title, content),
    sourceUrl: `https://example.org/notices/${noticeId}`, capturedAt: null, lastConfirmedAt: null, fixtureCaptureDay: null });
}
function event(n: ArticleNotice, overrides: Partial<GachaEvent> = {}) {
  return GachaEvent.parse({ id: "genshin:main:2026-10-19", game: "genshin", title: "Main event", type: "other", summary: null,
    startsAt: "2026-10-19T10:00:00.000Z", startPrecision: "exact", endsAt: "2026-11-02T03:59:00.000Z", endPrecision: "exact",
    regionScoped: false, regionEnds: null, sourceId, sourceUrl: n.sourceUrl, status: "published", extractionMethod: "parser", confidence: 1, version: 1, firstSeenAt: now, updatedAt: now, ...overrides });
}
function report(notices: ArticleNotice[], events: GachaEvent[] = [], state: { ignores?: unknown; baseline?: unknown } = {}) {
  const sidecar = buildEvidenceSidecar({ candidates: [], diagnostics: [], notices, articleAttributions: events.map(e => ({ event: e, noticeId: notices.find(n => n.sourceUrl === e.sourceUrl)!.noticeId,
    noticePosition: notices.find(n => n.sourceUrl === e.sourceUrl)!.position, finalEventId: null })) }, events);
  return buildNoticeCoverage({ sidecar, finalEvents: events, ...state }).sources.find(s => s.sourceId === sourceId)!.notices;
}

test("F1 discriminative explicit-UTC Starlight analogue: missing quest is partial; fixed quest is fully covered", () => {
  // Authored synthetic evidence. These explicit UTC clocks are NOT a timezone
  // interpretation or rewrite of the real frozen t_lc source notice.
  const n = notice("Main duration: 2026-10-19T10:00Z ~ 2026-11-02T03:59Z\nQuest completion: 2026-10-19T10:00Z ~ 2026-10-29T04:00Z");
  const main = event(n), quest = event(n, { id: "genshin:quest:2026-10-19", endsAt: "2026-10-29T04:00:00.000Z" });
  const missing = report([n], [main])[0]!, fixed = report([n], [main, quest])[0]!;
  expect(missing.status).toBe("partially processed");
  expect(missing.unmatchedSpans.map(s => s.quote)).toEqual(["2026-10-19T10:00Z", "2026-10-29T04:00Z"]);
  expect(fixed.status).toBe("processed"); expect(fixed.evaluation).toBe("complete"); expect(fixed.unmatchedSpans).toEqual([]);
  expect(fixed.spans[3]!.matches.map(m => [m.eventId, m.field])).toEqual([[quest.id, "endsAt"]]);
  expect(fixed.spans.map(s => s.ref)).toEqual(missing.spans.map(s => s.ref));
});
test("F1 clocks cannot borrow day precision or infer region from equal represented instant", () => {
  const n = notice("2026-10-19T10:00Z ~ 2026-11-02T03:59Z");
  const approximate = event(n, { startPrecision: "day", endPrecision: "day" });
  expect(report([n], [approximate])[0]!.spans.every(s => s.matches.length === 0)).toBe(true);
  const regional = event(n, { regionScoped: true, regionEnds: { asia: "2026-11-02T03:59:00.000Z", europe: "2026-11-02T10:59:00.000Z", america: "2026-11-02T16:59:00.000Z" } });
  expect(report([n], [regional])[0]!.status).not.toBe("processed");
  expect(report([n], [regional])[0]!.spans[1]!.matches).toEqual([]);
  const explicit = notice("Asia: 2026-11-02T03:59Z");
  expect(report([explicit], [event(explicit, regional)])[0]!.spans[0]!.matches[0]!.field).toBe("regionEnds.asia");
});
test("F2 baseline survives newest-first insertion and reorder but not a content edit", () => {
  const a = notice("October 29, 2026", 0, "old"), b = notice("November 2, 2026", 1, "older");
  const baseline = makeCoverageBaseline([a, b]);
  expect(report([notice("November 4, 2026", 0, "new"), { ...a, position: 1 }, { ...b, position: 2 }], [], { baseline }).map(n => n.baselineMember)).toEqual([false, true, true]);
  expect(report([{ ...b, position: 0 }, { ...a, position: 1 }], [], { baseline }).map(n => n.baselineMember)).toEqual([true, true]);
  expect(report([notice("October 30, 2026", 0, "old")], [], { baseline })[0]!.baselineMember).toBe(false);
});
test("F2 ignores survive insertion; duplicates never inherit ignores or baseline membership", () => {
  const n = notice("October 29, 2026");
  const decision = { sourceId, noticeId: n.noticeId, sourceUrl: n.sourceUrl, contentHash: n.contentHash, format: n.format, category: "shop", reason: "Reviewed synthetic exclusion" };
  const ignores = { schemaVersion: 1, decisions: [decision] }, baseline = makeCoverageBaseline([n]);
  expect(report([{ ...n, position: 8 }], [], { ignores, baseline })[0]).toMatchObject({ status: "ignored", baselineMember: true });
  const duplicate = report([n, { ...n, position: 1 }], [], { ignores, baseline });
  expect(duplicate.every(n => n.status !== "ignored" && !n.baselineMember && !n.ignores.length)).toBe(true);
});
test("F3 actual NTE clock range never produces a false UTC instant", async () => {
  const fixture = await Bun.file("test/fixtures/editorial/c1a1-review-nte.json").json();
  const p = fixture.notices.find((p: { gid: string }) => p.gid === "1843481262703497");
  const r = readDateSpans(p.contents, "bbcode");
  const range = r.spans.find(s => s.quote.includes("September 16, 2026, 00:00-12:00"))!;
  expect(range.value.instant).toBeNull(); expect(range.value.offsetMinutes).toBeNull(); expect(range.uncertainty.length).toBeGreaterThan(0);
  expect(r.spans.some(s => s.quote === "September 16, 2026, 00:00 (UTC+8)" && s.value.instant === "2026-09-15T16:00:00.000Z")).toBe(true);
});
test("F3 human clock ranges are uncertain; UTC-prefixed and ISO-T offsets stay exact", () => {
  for (const token of ["00:00-12:00", "00:00 -12:00", "00:00–12:00", "00:00-1200", "00:00+08:00"]) {
    const r = readDateSpans(`September 16, 2026, ${token}`);
    expect(r.spans[0]!.value.instant).toBeNull(); expect(r.spans[0]!.value.offsetMinutes).toBeNull();
  }
  for (const [text, expected] of [
    ["2026-09-16T00:00-12:00", "2026-09-16T12:00:00.000Z"], ["2026-09-16T00:00+0800", "2026-09-15T16:00:00.000Z"],
    ["September 16, 2026, 00:00 (UTC+8)", "2026-09-15T16:00:00.000Z"], ["2026/09/16 00:00 UTC-12", "2026-09-16T12:00:00.000Z"],
  ]) expect(readDateSpans(text!).spans[0]!.value.instant).toBe(expected!);
});
test("F4 an unrelated same-day mail eligibility date cannot certify an event boundary", () => {
  const n = notice("Mail eligibility checked October 19, 2026.");
  const e = event(n, { startsAt: "2026-10-19T00:00:00.000Z", startPrecision: "day" });
  const r = report([n], [e])[0]!;
  expect(r.status).not.toBe("processed"); expect(r.evaluation).toBe("uncertain"); expect(r.spans[0]!.matches).toEqual([]);
});
test("F5 invisible/masked/limited content has actionable unscanned attention without invented dates", () => {
  for (const text of ["x".repeat(250001), '<t bad="unterminated>October 29, 2026', "<script>October 29, 2026", "<!-- October 29, 2026 -->"]) {
    const r = report([notice(text)])[0]!;
    expect(r.spans).toEqual([]); expect(r.status).toBeNull();
    expect(r.attention).toMatchObject({ required: true });
    expect(r.attention.unscanned.length).toBeGreaterThan(0);
  }
});
test("F5 partial scans preserve attention even when all extracted dates were represented", () => {
  const n = notice("2026-10-19T10:00Z ~ 2026-11-02T03:59Z\n<script>hidden cutoff");
  const r = report([n], [event(n)])[0]!;
  expect(r.spans).toHaveLength(2); expect(r.unmatchedSpans).toEqual([]); expect(r.status).not.toBe("processed");
  expect(r.attention).toMatchObject({ required: true });
});
test("F6 actual escaped NTE FAQ and bracketed prose do not masquerade as BBCode", async () => {
  const fixture = await Bun.file("test/fixtures/editorial/c1a1-review-nte.json").json();
  const p = fixture.notices.find((p: { gid: string }) => p.gid === "1841579228661424");
  expect(readDateSpans(p.contents, "bbcode").diagnostics).not.toContain("malformed_markup");
  const raw = String.raw`\[User Center] [Deadline October 29, 2026] [b]November 2, 2026[/b]`;
  const r = readDateSpans(raw, "bbcode");
  expect(r.diagnostics).toEqual([]); expect(r.spans.map(s => s.quote)).toEqual(["October 29, 2026", "November 2, 2026"]);
});


test("F2 span ignores remain bound to revision and format across insertion, but not edits or URL changes", () => {
  const n = notice("October 29, 2026; November 2, 2026");
  const ref = report([n])[0]!.spans[0]!.ref;
  const decision = { sourceId, noticeId: n.noticeId, sourceUrl: n.sourceUrl, contentHash: n.contentHash, format: n.format, span: { field: "content", ref }, category: "shop", reason: "Reviewed first deadline" };
  const state = { ignores: { schemaVersion: 1, decisions: [decision] }, baseline: makeCoverageBaseline([n]) };
  const moved = report([{ ...n, position: 10 }], [], state)[0]!;
  expect(moved.spans.map(s => s.disposition)).toEqual(["ignored", "unmatched"]); expect(moved.baselineMember).toBe(true);
  for (const changed of [notice(n.content + "; December 1, 2026"), { ...n, sourceUrl: "https://example.org/changed" }, { ...n, format: "html" as const }]) {
    const r = report([changed], [], state)[0]!;
    expect(r.baselineMember).toBe(false); expect(r.ignores).toEqual([]);
  }
  const otherRevision = notice("October 30, 2026", 1);
  expect(report([n, otherRevision], [], state).every(n => !n.baselineMember && !n.ignores.length)).toBe(true);
  expect(() => makeCoverageBaseline([n, { ...n, position: 1 }])).toThrow("duplicate");
});
test("F2 explicit positional baseline migration changes shape only, refuses ambiguous legacy identities", () => {
  const identity = { sourceId, noticeId: "old", sourceUrl: "https://example.org/old", contentHash: "a".repeat(64), format: "markdown" } as const;
  const legacy = { schemaVersion: 1, purpose: "initial-notification-suppression-only", entries: [{ ...identity, position: 28 }] };
  expect(() => Baseline.parse(legacy)).toThrow();
  expect(migratePositionalBaseline(legacy)).toEqual({ schemaVersion: 1, purpose: "initial-notification-suppression-only", entries: [identity] });
  expect(() => migratePositionalBaseline({ ...legacy, entries: [legacy.entries[0], { ...identity, position: 29 }] })).toThrow("Ambiguous");
});
test("F3 bare offsets require adjacent ISO-T syntax and balanced explicit timezone delimiters", () => {
  for (const text of ["2026-09-16T00:00 -12:00", "September 16, 2026, 00:00 (UTC+8", "September 16, 2026, 00:00 UTC+8)"]) {
    const span = readDateSpans(text).spans[0]!;
    expect(span.value.instant).toBeNull(); expect(span.uncertainty.length).toBeGreaterThan(0);
  }
});
test("F1 earlier prose about a region cannot scope a later date by coincidence", () => {
  const r = readDateSpans("For players in Asia, the FAQ follows. 2026-11-02T03:59Z");
  expect(r.spans[0]!.region).toBeNull();
});
test("F5 a span ceiling keeps an actionable unscanned reason", () => {
  const r = report([notice("November 2, 2026; ".repeat(257))])[0]!;
  expect(r.spans).toHaveLength(256); expect(r.evaluation).toBe("incomplete");
  expect(r.attention.required).toBe(true); expect(r.attention.unscanned).toContainEqual({ field: "content", reason: "span_limit" });
});
test("F6 supported attributed tags remain balanced, escaping and arbitrary bracket prose remain readable", () => {
  const raw = String.raw`[p][img src="asset.png"][/img][dynamiclink href="https://example.org/"]Link[/dynamiclink][/p] \[b]October 29, 2026\[/b] [b November 2, 2026]`;
  const r = readDateSpans(raw, "bbcode");
  expect(r.diagnostics).toEqual([]); expect(r.spans.map(s => s.quote)).toEqual(["October 29, 2026", "November 2, 2026"]);
  expect(readDateSpans('[img src="unfinished', "bbcode").diagnostics).toContain("malformed_markup");
  expect(readDateSpans('[b]<script>2026-10-29</script>[/b]', "bbcode").diagnostics).toContain("active_content_omitted");
});

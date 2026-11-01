import { expect, test } from "bun:test";
import { ArticleNotice, buildEvidenceSidecar } from "../src/editorial/event-evidence.ts";
import { noticeContentHash, extractArticleEvidence, safelyExtractArticleEvidence } from "../src/editorial/article-evidence.ts";
import { buildNoticeCoverage, makeCoverageBaseline } from "../src/editorial/notice-coverage.ts";
import { Baseline, IgnoreRegistry } from "../src/editorial/coverage-state.ts";
import { GachaEvent } from "../src/shared/schema.ts";
import { adapterById } from "../src/ingest/adapters/index.ts";

const now = "2026-10-30T12:00:00.000Z";
const capture = { capturedAt: null, lastConfirmedAt: null, fixtureCaptureDay: "2026-10-28" };
const sourceId = "genshin-kqm-ginews";
function notice(content: string, position = 0, noticeId = "synthetic") {
  const title = "Synthetic calendar notice";
  return ArticleNotice.parse({ sourceId, game: "genshin", noticeId, position, title, content, format: "markdown", contentHash: noticeContentHash(title, content), sourceUrl: `https://example.org/notices/${noticeId}`, ...capture });
}
function event(n: ArticleNotice, fields: Partial<GachaEvent> = {}): GachaEvent {
  return GachaEvent.parse({ id: "genshin:synthetic:2026-10-19", game: "genshin", title: "Arbitrary title", type: "other", summary: null,
    startsAt: "2026-10-19T00:00:00.000Z", startPrecision: "day", endsAt: "2026-11-02T00:00:00.000Z", endPrecision: "day",
    regionScoped: false, regionEnds: null, sourceId, sourceUrl: n.sourceUrl, status: "published", extractionMethod: "parser", confidence: 1,
    version: 1, firstSeenAt: now, updatedAt: now, ...fields });
}
function side(n: ArticleNotice[], emitted: GachaEvent[] = [], finals = emitted) {
  return buildEvidenceSidecar({ candidates: [], diagnostics: [], notices: n,
    articleAttributions: emitted.map(e => ({ event: e, noticeId: n.find(n => n.sourceUrl === e.sourceUrl)!.noticeId, noticePosition: n.find(n => n.sourceUrl === e.sourceUrl)!.position, finalEventId: null })) }, finals);
}
function report(n: ArticleNotice[], emitted: GachaEvent[] = [], finals = emitted, options: { ignores?: unknown; baseline?: unknown } = {}) {
  return buildNoticeCoverage({ sidecar: side(n, emitted, finals), finalEvents: finals, ...options });
}
const record = (r: ReturnType<typeof buildNoticeCoverage>, pos = 0) => r.sources.find(s => s.sourceId === sourceId)!.notices[pos]!;

test("fully covered multi-event notice, deterministic order and exact offsets", () => {
  const n = notice("October 19, 2026 – November 2, 2026\n2026/10/20 10:00 UTC+8 ~ 2026/10/29 04:00 UTC+8");
  const a = event(n), b = event(n, { id: "genshin:second:2026-10-20", startsAt: "2026-10-20T02:00:00.000Z", endsAt: "2026-10-28T20:00:00.000Z", startPrecision: "exact", endPrecision: "exact" });
  const r = record(report([n], [a, b]));
  expect(r.status).toBe("processed"); expect(r.evaluation).toBe("complete");
  expect(r.spans.map(s => s.matches.map(m => [m.eventId, m.field]))).toEqual([
    [[a.id, "startsAt"]], [[a.id, "endsAt"]], [[b.id, "startsAt"]], [[b.id, "endsAt"]],
  ]);
  expect(report([n], [a, b], [a, b])).toEqual(report([n], [b, a], [b, a]));
});
test("unprocessed dated and zero-output notices retain every date; undated/unreadable are explicitly uncertain", () => {
  const n = notice("October 29, 2026; November 2, 2026; December 1, 2026");
  const r = record(report([n]));
  expect(r.status).toBe("unprocessed"); expect(r.unmatchedSpans.map(s => s.quote)).toEqual(["October 29, 2026", "November 2, 2026", "December 1, 2026"]);
  for (const text of ["No dates announced", "after maintenance tomorrow at 04:00", "10/11/26"]) {
    const uncertain = record(report([notice(text)]));
    expect(uncertain.evaluation).toBe("uncertain"); expect(uncertain.status).not.toBe("processed");
  }
});
test("one represented event cannot conceal unrelated deadlines", () => {
  const n = notice("October 19, 2026 – November 2, 2026; quest deadline October 29, 2026; mail December 1, 2026");
  const r = record(report([n], [event(n)]));
  expect(r.status).toBe("partially processed");
  expect(r.unmatchedSpans.map(s => s.quote)).toEqual(["October 29, 2026", "December 1, 2026"]);
});
test("reviewed exact URL is verifiable; different URL, source identity, duplicate final IDs and final-winner refusals cannot count", () => {
  const n = notice("October 19, 2026 – November 2, 2026");
  const reviewed = event(n, { sourceId: "reviewed-genshin", extractionMethod: "manual" });
  expect(record(report([n], [], [reviewed])).status).toBe("processed");
  expect(record(report([n], [], [{ ...reviewed, sourceUrl: "https://example.org/other" }])).status).toBe("unprocessed");
  expect(record(report([n], [], [event(n, { sourceId: "another-source" })])).status).toBe("unprocessed");
  expect(record(report([n], [], [reviewed, reviewed])).status).toBe("unprocessed");
  const refused = record(report([n], [event(n)], [{ ...reviewed, endsAt: "2026-11-03T00:00:00.000Z" }]));
  expect(refused.associations).toEqual([]); expect(refused.diagnostics).toContain("winner_period_conflict");
});
test("precision, offsets and region-scoped boundaries fail conservatively", () => {
  const n = notice("October 19, 2026; November 2, 2026; 2026-11-02 03:59 (server time)\nEurope: 2026-11-02 03:59 UTC+1\nAsia: 2026-11-02 03:59 UTC+8\nAmerica: 2026-11-02 03:59 UTC-5");
  const e = event(n, { endsAt: "2026-11-01T19:59:00.000Z", endPrecision: "exact", regionScoped: true,
    regionEnds: { asia: "2026-11-01T19:59:00.000Z", europe: "2026-11-02T02:59:00.000Z", america: "2026-11-02T08:59:00.000Z" } });
  const r = record(report([n], [e]));
  expect(r.spans.map(s => s.matches.map(m => m.field))).toEqual([["startsAt"], [], [], ["regionEnds.europe"], ["regionEnds.asia"], ["regionEnds.america"]]);
  expect(r.status).toBe("partially processed");
  expect(record(report([notice("2026-11-02 00:00 UTC")], [], [event(n, { sourceId: "reviewed-genshin", extractionMethod: "manual" })])).spans[0]!.matches).toEqual([]);
});
test("duplicate notice IDs stay separate occurrences with original content and fail closed", () => {
  const a = notice("October 29, 2026", 0), b = notice("November 2, 2026", 1);
  const r = report([b, a], [], [event(a, { sourceId: "reviewed-genshin", extractionMethod: "manual" })]);
  expect(r.sources.find(s => s.sourceId === sourceId)!.notices.map(n => [n.position, n.status, n.evaluation])).toEqual([[0, "unprocessed", "uncertain"], [1, "unprocessed", "uncertain"]]);
  expect(record(r, 0).spans[0]!.quote).toBe("October 29, 2026"); expect(record(r, 1).spans[0]!.quote).toBe("November 2, 2026");
});
test("span ignore does not hide a second gap; whole-notice ignore is explicit and revision-bound", () => {
  const n = notice("October 29, 2026; November 2, 2026");
  const first = record(report([n])).spans[0]!;
  const decision = { sourceId, noticeId: n.noticeId, position: n.position, sourceUrl: n.sourceUrl, contentHash: n.contentHash,
    category: "shop", reason: "Reviewed synthetic scope exclusion", span: { field: "content", ref: first.ref } };
  const ignores = { schemaVersion: 1, decisions: [decision] };
  const r = record(report([n], [], [], { ignores }));
  expect(r.status).toBe("unprocessed"); expect(r.spans.map(s => s.disposition)).toEqual(["ignored", "unmatched"]);
  expect(r.unmatchedSpans.map(s => s.quote)).toEqual(["November 2, 2026"]);
  const { span: _span, ...whole } = decision;
  expect(record(report([n], [], [], { ignores: { schemaVersion: 1, decisions: [whole] } })).status).toBe("ignored");
  const edited = notice(n.content + "; December 1, 2026");
  const changed = report([edited], [], [], { ignores });
  expect(record(changed).unmatchedSpans).toHaveLength(3); expect(changed.unusedIgnoreDecisions).toHaveLength(1);
  expect(() => IgnoreRegistry.parse({ schemaVersion: 2, decisions: [] })).toThrow();
  expect(() => IgnoreRegistry.parse({ schemaVersion: 1, decisions: [decision, decision] })).toThrow();
});
test("baseline is explicit, deterministic and notification-only; content changes never erase new evidence", () => {
  const n = notice("October 29, 2026"); const baseline = makeCoverageBaseline([n]);
  const before = record(report([n])), after = record(report([n], [], [], { baseline }));
  expect(before.baselineMember).toBe(false); expect(after).toEqual({ ...before, baselineMember: true });
  const edited = notice(n.content + "; November 2, 2026");
  const r = record(report([edited], [], [], { baseline }));
  expect(r.baselineMember).toBe(false); expect(r.status).toBe("unprocessed"); expect(r.unmatchedSpans).toHaveLength(2);
  expect(() => Baseline.parse({ ...baseline, schemaVersion: 2 })).toThrow();
  expect(() => Baseline.parse({ ...baseline, reviewed: true })).toThrow();
  expect(makeCoverageBaseline([notice("2026-10-29", 1), n])).toEqual(makeCoverageBaseline([n, notice("2026-10-29", 1)]));
});
test("missing/invalid inventory and final evidence are not evaluated; unsupported families stay explicit", () => {
  for (const bad of [null, {}, { notices: "invalid" }]) {
    const r = buildNoticeCoverage({ sidecar: bad, finalEvents: [] });
    expect(r.diagnostics).toContain("invalid_notice_inventory");
    expect(r.sources.every(s => !s.available && s.evaluation === "not evaluated")).toBe(true);
    expect(r.unsupported).toEqual([{ game: "endfield", evaluation: "not evaluated", reason: "notice inventory unsupported" }, { game: "czn", evaluation: "not evaluated", reason: "notice inventory unsupported" }]);
  }
  const n = notice("October 29, 2026");
  const r = buildNoticeCoverage({ sidecar: side([n]), finalEvents: null });
  expect(record(r).evaluation).toBe("uncertain"); expect(record(r).status).not.toBe("processed");
});
test("malformed inventory and source content limits are visible without claiming complete coverage", () => {
  const ctx = { now, sourceId, game: "genshin" as const, sourceUrl: "https://example.org/index" };
  const bad = buildEvidenceSidecar(safelyExtractArticleEvidence("# broken archive/9.md", ctx, capture, []), []);
  expect(buildNoticeCoverage({ sidecar: bad, finalEvents: [] }).sources.find(s => s.sourceId === sourceId)).toMatchObject({ available: false, evaluation: "not evaluated", notices: [] });
  const huge = notice("x".repeat(250001));
  expect(record(report([huge]))).toMatchObject({ status: null, evaluation: "incomplete", diagnostics: ["content:input_limit"] });
  const malformed = notice("<b>October 29, 2026");
  expect(record(report([malformed], [], [event(malformed, { sourceId: "reviewed-genshin", extractionMethod: "manual", endsAt: "2026-10-29T00:00:00.000Z" })])).evaluation).toBe("uncertain");
});

test("#130 Starlight real frozen text with SYNTHETIC main-event-only output retains October 29 cutoff", async () => {
  const raw = await Bun.file("test/fixtures/genshin/starlight-voyage-2026-10-28.md").text();
  const adapter = adapterById(sourceId)!;
  const ctx = { now, sourceId, game: adapter.game, sourceUrl: adapter.url };
  const main = adapter.parse(raw, ctx).filter(e => e.id === "genshin:starlight-voyage-heart-unbound:2026-10-19");
  expect(main).toHaveLength(1); expect(main[0]!.regionEnds!.america).toBe("2026-11-02T08:59:00.000Z");
  const ex = extractArticleEvidence(raw, ctx, capture, main);
  const r = record(buildNoticeCoverage({ sidecar: buildEvidenceSidecar(ex, main), finalEvents: main }));
  expect(r.status).toBe("partially processed"); expect(r.evaluation).toBe("uncertain");
  expect(r.spans.map(s => s.value.date)).toEqual(["2026-10-19", "2026-11-02", "2026-10-19", "2026-10-29"]);
  expect(r.unmatchedSpans.some(s => s.quote === "2026/10/29 04:00" && s.reason === "unresolved_date")).toBe(true);
  // No original-parser success is claimed: pre-#130 parser actually threw.
});

test("#119 actual recorded pre-repair HSR parser outputs leave both missing MoC windows visible", async () => {
  const [historical] = await Bun.file("test/fixtures/editorial/c0/historical-results.json").json();
  const raw = await Bun.file(historical.file).text();
  expect(new Bun.CryptoHasher("sha256").update(raw).digest("hex")).toBe(historical.inputSha256);
  const events: GachaEvent[] = historical.events.map((e: unknown) => GachaEvent.parse(e));
  const id = "hsr-kqm-hsrnews", adapter = adapterById(id)!;
  const ex = extractArticleEvidence(raw, { now, sourceId: id, game: adapter.game, sourceUrl: adapter.url }, capture, events);
  const r = buildNoticeCoverage({ sidecar: buildEvidenceSidecar(ex, events), finalEvents: events }).sources.find(s => s.sourceId === id)!.notices[0]!;
  expect(r.status).toBe("partially processed");
  expect(r.spans.filter(s => s.kind === "date")).toHaveLength(21); // 20 real clocks, plus the literal character name March 7th (unknown year).
  expect(r.unmatchedSpans.map(s => s.quote)).toContain("2026/11/02 03:59:00 (server)");
  expect(r.unmatchedSpans.map(s => s.quote)).toContain("2026/12/14 03:59:00 (server)");
  expect(events.some(e => e.id.includes("memory-of-chaos"))).toBe(false);
});

test("one event's start plus another event's end cannot certify a complete range", () => {
  const n = notice("October 19, 2026 – November 2, 2026");
  const a = event(n, { endsAt: "2026-10-25T00:00:00.000Z" });
  const b = event(n, { id: "genshin:second:2026-10-01", startsAt: "2026-10-01T00:00:00.000Z" });
  const r = record(report([n], [a, b]));
  expect(r.status).toBe("partially processed"); expect(r.unmatchedSpans).toHaveLength(2);
  expect(r.spans.every(s => s.matches.length === 0 && s.reason === "range_not_represented_by_one_event")).toBe(true);
});

test("#131 frozen tracked Genshin recovery notices: synthetic missing-event replay preserves all three gaps", async () => {
  const id = "genshin-kqm-ginews", a = adapterById(id)!;
  const raw = await Bun.file("test/fixtures/genshin/expiries-2026-10-28.md").text();
  const ex = extractArticleEvidence(raw, { now, sourceId: id, game: a.game, sourceUrl: a.url }, capture, []);
  const r = buildNoticeCoverage({ sidecar: buildEvidenceSidecar(ex, []), finalEvents: [] }).sources.find(s => s.sourceId === id)!;
  expect(r.notices.map(n => [n.noticeId, n.status, n.spans.filter(s => s.kind === "date").map(s => s.value.date)])).toEqual([
    ["21053", "unprocessed", ["2026-10-26", "2026-11-02"]],
    ["21891", "unprocessed", ["2026-10-21", "2026-11-02"]],
    ["21890", "unprocessed", ["2026-10-13", "2026-11-03"]],
  ]);
});

test("WuWa factual excerpt: all four convene windows and Echo Erase survive synthetic zero-output replay", async () => {
  const id = "wuwa-kuro-mirror", a = adapterById(id)!;
  const raw = await Bun.file("test/fixtures/wuwa/evidence-2026-10-21.xml").text();
  const ex = extractArticleEvidence(raw, { now, sourceId: id, game: a.game, sourceUrl: a.url }, capture, []);
  const r = buildNoticeCoverage({ sidecar: buildEvidenceSidecar(ex, []), finalEvents: [] }).sources.find(s => s.sourceId === id)!;
  expect(r.notices.map(n => [n.noticeId, n.status, n.spans.filter(s => s.kind === "date").map(s => s.value.date)])).toEqual([
    ["5668", "unprocessed", ["2026-10-22", "2026-11-11", "2026-10-22", "2026-11-11", "2026-10-22", "2026-11-11", "2026-10-22", "2026-11-11"]],
    ["5571", "unprocessed", ["2026-10-22", "2026-11-09"]],
  ]);
});

test("ZZZ factual event windows remain visible under synthetic missing-event replay", async () => {
  const id = "zzz-steam-events-official", a = adapterById(id)!;
  const raw = await Bun.file("test/fixtures/zzz/steam-rss-excerpts-2026-10-27.xml").text();
  const ex = extractArticleEvidence(raw, { now, sourceId: id, game: a.game, sourceUrl: a.url }, capture, []);
  const r = buildNoticeCoverage({ sidecar: buildEvidenceSidecar(ex, []), finalEvents: [] }).sources.find(s => s.sourceId === id)!;
  const update = r.notices.find(n => n.noticeId === "652616887841064662")!;
  expect(update.status).toBe("unprocessed");
  for (const quote of ["2026/10/22 10:00 (server time)", "2026/11/30 03:59 (server time)"]) expect(update.unmatchedSpans.map(s => s.quote)).toContain(quote);
});


test("#139 frozen HSR Park claim recovery: synthetic missing-event scenario retains both November 11 boundaries", async () => {
  const id = "hsr-kqm-hsrnews", a = adapterById(id)!;
  const raw = await Bun.file("test/fixtures/editorial/c0/hsr-1437-complete.md").text();
  const ex = extractArticleEvidence(raw, { now, sourceId: id, game: a.game, sourceUrl: a.url }, capture, []);
  const r = buildNoticeCoverage({ sidecar: buildEvidenceSidecar(ex, []), finalEvents: [] }).sources.find(s => s.sourceId === id)!.notices[0]!;
  expect(r.status).toBe("unprocessed");
  const quotes = r.unmatchedSpans.map(s => s.quote);
  expect(quotes.filter(q => q === "2026/11/11 06:00:00 (global)")).toHaveLength(4);
  expect(quotes.filter(q => q === "2026/11/11 03:59:00 (global)")).toHaveLength(4);
});

test("NTE frozen BBCode shop and event dates retain missing-year and clock precision without auto-ignore", async () => {
  const id = "nte-steamnews-official", a = adapterById(id)!;
  const raw = await Bun.file("test/fixtures/editorial/c0/nte.json").text();
  const ex = extractArticleEvidence(raw, { now, sourceId: id, game: a.game, sourceUrl: a.url }, capture, []);
  const r = buildNoticeCoverage({ sidecar: buildEvidenceSidecar(ex, []), finalEvents: [] }).sources.find(s => s.sourceId === id)!;
  const shop = r.notices.find(n => n.noticeId === "1847920302233942")!;
  expect(shop.status).toBe("unprocessed"); expect(shop.ignores).toEqual([]);
  expect(shop.spans.filter(s => s.kind === "date").map(s => [s.quote, s.uncertainty])).toEqual([
    ["October 28, 06:30", ["missing_year", "missing_offset"]], ["November 11, 05:59 (UTC+8)", ["missing_year"]], ["October 28, 06:30 (UTC+8)", ["missing_year"]],
  ]);
  const eventNotice = r.notices.find(n => n.noticeId === "1847286114027833")!;
  expect(eventNotice.spans.find(s => s.quote === "November 11, 2026, 05:59 (UTC+8)")?.value.instant).toBe("2026-11-10T21:59:00.000Z");
});

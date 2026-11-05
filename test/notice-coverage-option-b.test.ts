import { expect, test } from "bun:test";
import { ArticleNotice, buildEvidenceSidecar } from "../src/editorial/event-evidence.ts";
import { noticeContentHash } from "../src/editorial/article-evidence.ts";
import { readDateSpans } from "../src/editorial/date-spans.ts";
import { buildNoticeCoverage } from "../src/editorial/notice-coverage.ts";
import { GachaEvent } from "../src/shared/schema.ts";

const period = "2026-10-19T10:00Z ~ 2026-11-02T03:59Z";
const quest = "[Quest](2026-10-29T04:00Z)";
function coverage(content: string, title = "Synthetic Option B notice") {
  const n = ArticleNotice.parse({ sourceId: "genshin-kqm-ginews", game: "genshin", noticeId: "option-b", position: 0,
    sourceUrl: "https://example.org/option-b", title, content, format: "markdown", contentHash: noticeContentHash(title, content),
    capturedAt: null, lastConfirmedAt: null, fixtureCaptureDay: null });
  const e = GachaEvent.parse({ id: "genshin:option-b:2026-10-19", game: "genshin", title: "Represented main", type: "other", summary: null,
    startsAt: "2026-10-19T10:00:00.000Z", startPrecision: "exact", endsAt: "2026-11-02T03:59:00.000Z", endPrecision: "exact", regionScoped: false, regionEnds: null,
    sourceId: n.sourceId, sourceUrl: n.sourceUrl, status: "published", extractionMethod: "parser", confidence: 1, version: 1,
    firstSeenAt: "2026-10-30T00:00:00.000Z", updatedAt: "2026-10-30T00:00:00.000Z" });
  const sidecar = buildEvidenceSidecar({ candidates: [], diagnostics: [], notices: [n], articleAttributions: [{ event: e, noticeId: n.noticeId, noticePosition: 0, finalEventId: null }] }, [e]);
  const r = buildNoticeCoverage({ sidecar, finalEvents: [e] }).sources.find(s => s.sourceId === n.sourceId)!.notices[0]!;
  for (const span of r.spans) expect(n[span.field].slice(span.start, span.end)).toBe(span.quote);
  return r;
}
for (const destination of [
  "2026-10-29T04:00Z", "archive/2030-10-31.md", "2026/10/29", "29/10/2026", "2026-99-99",
  "<October 29, 2026>", "<29 October 2026>", "<October 29>", "2026-10-", "04:00", "TBD", "TBA", "tomorrow", "<after the Version 6.0 update>",
]) for (const field of ["title", "content"] as const) test(`Option B ${field}: masked ${destination} requires attention without inventing a span`, () => {
  const link = `🧭 [Quest](${destination})`, raw = field === "content" ? `Main: ${period}\n${link}` : link;
  const read = readDateSpans(raw);
  expect(read.diagnostics).toContain("masked_date_like_destination"); expect(read.complete).toBe(true);
  for (const span of read.spans) expect(raw.slice(span.start, span.end)).toBe(span.quote);
  // The guard does not parse metadata as a date, even if an offset appears there.
  expect(read.spans).toHaveLength(field === "content" ? 2 : 0);
  const r = field === "content" ? coverage(raw) : coverage(`Main: ${period}`, raw);
  expect(r.status).toBe("partially processed"); expect(r.evaluation).toBe("uncertain"); expect(r.attention.required).toBe(true);
  expect(r.diagnostics).toContain(`${field}:masked_date_like_destination`);
  expect(r.attention.reasons).toContain("uncertain_evaluation"); expect(r.unmatchedSpans).toEqual([]);
  expect(r.spans.map(s => s.value.instant)).toEqual(["2026-10-19T10:00:00.000Z", "2026-11-02T03:59:00.000Z"]);
  expect(r.spans.every(s => s.disposition === "matched")).toBe(true);
});

// Fifteen reported P1-C shapes, independently authored, remain safe without
// requiring full CommonMark conformance. Code literals must remain unmatched;
// an unsupported masking decision must instead be diagnosed, never certified.
const counterexamples: Array<[string, string]> = [
  ["inline", `\`${quest}\``], ["HTML code", `<code>${quest}</code>`],
  ["four spaces", `    ${quest}`], ["tab", `\t${quest}`],
  ["quote", `> quote\n>\n>     ${quest}`], ["bullet", `-     ${quest}`], ["ordered", `1.     ${quest}`],
  ["nested", `> -     ${quest}`], ["thematic star", `* * *\n    ${quest}`], ["thematic dash", `- - -\n    ${quest}`],
  ["thematic underscore", `_ _ _\n\n    ${quest}`], ["empty item", `-\n\n    ${quest}`],
  ["non-one interruption", `Text\n2. foo\n\n     ${quest}`],
  ["lazy ancestry", `1. a\nlazy\n*\n      ${quest}`], ["cross-container fence", `> \`\`\`\n> code\n\`\`\`\n${quest}`],
];
for (const [name, body] of counterexamples) test(`Option B prior P1-C ${name} remains safe`, () => {
  const raw = `🧭 Main: ${period}\n\n${body}`, read = readDateSpans(raw), r = coverage(raw);
  for (const span of read.spans) expect(raw.slice(span.start, span.end)).toBe(span.quote);
  expect(r.status).toBe("partially processed"); expect(r.attention.required).toBe(true);
  const missing = r.spans.find(s => s.value.instant === "2026-10-29T04:00:00.000Z");
  expect(missing).toBeDefined(); expect(missing!.matches).toEqual([]);
  expect(r.unmatchedSpans.some(s => s.ref === missing!.ref)).toBe(true);
  expect(r.evaluation).toBe(name === "cross-container fence" ? "uncertain" : "complete");
});
test("Option B ordinary links, HTTP(S) and dated image URLs remain metadata and coverage stays usable", () => {
  for (const link of [
    "[Guide](archive/guide.md)", "[Year](2026)", "[Count](12345)", "[Site](https://example.org/2026-10-29)",
    "[Site](HTTP://example.org/2026/10/29)", "![Banner](https://example.org/upload/2026/10/22/banner.jpg)",
    '[Guide](archive/guide.md "October 29, 2026")',
  ]) {
    const raw = `🧭 Main: ${period}\n${link}`, read = readDateSpans(raw), r = coverage(raw);
    for (const span of read.spans) expect(raw.slice(span.start, span.end)).toBe(span.quote);
    expect(read.diagnostics).toEqual([]); expect(read.spans).toHaveLength(2);
    expect(r.status).toBe("processed"); expect(r.evaluation).toBe("complete"); expect(r.attention.required).toBe(false);
    const withTitle = coverage(`Main: ${period}`, link);
    expect(withTitle.status).toBe("processed"); expect(withTitle.attention.required).toBe(false);
  }
  const covered = coverage(`🧭 Main: ${period}\n\`${"[End](2026-11-02T03:59Z)"}\``);
  expect(covered.status).toBe("processed"); expect(covered.evaluation).toBe("complete"); expect(covered.spans).toHaveLength(3);
});

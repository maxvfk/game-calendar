import { expect, test } from "bun:test";
import { ArticleNotice, buildEvidenceSidecar } from "../src/editorial/event-evidence.ts";
import { noticeContentHash } from "../src/editorial/article-evidence.ts";
import { readDateSpans, type DateSpan } from "../src/editorial/date-spans.ts";
import { buildNoticeCoverage } from "../src/editorial/notice-coverage.ts";
import { GachaEvent } from "../src/shared/schema.ts";
const period = "2026-10-19T10:00Z ~ 2026-11-02T03:59Z";
function coverage(content: string, format: ArticleNotice["format"]) {
  const title = "Synthetic Astra audit notice";
  const n = ArticleNotice.parse({ sourceId: "genshin-kqm-ginews", game: "genshin", noticeId: "astra", position: 0,
    sourceUrl: "https://example.org/astra", title, content, format, contentHash: noticeContentHash(title, content),
    capturedAt: null, lastConfirmedAt: null, fixtureCaptureDay: null });
  const e = GachaEvent.parse({ id: "genshin:astra-main:2026-10-19", game: "genshin", title: "Represented main event", type: "other", summary: null,
    startsAt: "2026-10-19T10:00:00.000Z", startPrecision: "exact", endsAt: "2026-11-02T03:59:00.000Z", endPrecision: "exact", regionScoped: false, regionEnds: null,
    sourceId: n.sourceId, sourceUrl: n.sourceUrl, status: "published", extractionMethod: "parser", confidence: 1, version: 1,
    firstSeenAt: "2026-10-30T00:00:00.000Z", updatedAt: "2026-10-30T00:00:00.000Z" });
  const sidecar = buildEvidenceSidecar({ candidates: [], diagnostics: [], notices: [n], articleAttributions: [{ event: e, noticeId: n.noticeId, noticePosition: 0, finalEventId: null }] }, [e]);
  return buildNoticeCoverage({ sidecar, finalEvents: [e] }).sources.find(s => s.sourceId === n.sourceId)!.notices[0]!;
}
function mapped(raw: string, spans: DateSpan[]) { for (const span of spans) expect(raw.slice(span.start, span.end)).toBe(span.quote); }
function gap(raw: string, format: ArticleNotice["format"]) {
  const r = coverage(raw, format); mapped(raw, r.spans);
  expect(r.status).not.toBe("processed"); expect(r.evaluation).not.toBe("complete"); expect(r.attention.required).toBe(true);
  return r;
}
const formatted: Array<[ArticleNotice["format"], string]> = [
  ["markdown", "**October** 29, 2026"], ["markdown", "October **29**, 2026"], ["markdown", "*October* 29, 2026"], ["markdown", "***October*** 29, 2026"],
  ["html", "<b>2026</b>-10-29"], ["html", "2026-<em>10</em>-29"], ["bbcode", "[b]2026[/b]-10-29"],
];
for (const [format, expression] of formatted) test(`P1-A ${format}: visible ${expression} cannot hide the quest cutoff`, () => {
  const raw = `🧭 Main: ${period}\n⏳ Quest deadline: ${expression}`;
  const read = readDateSpans(raw, format); mapped(raw, read.spans);
  expect(read.spans.some(s => s.value.date === "2026-10-29")).toBe(true);
  expect(gap(raw, format).unmatchedSpans.length).toBeGreaterThan(0);
});
test("P1-A inline projection preserves exact positive matches and separates block boundaries", () => {
  for (const [format, raw] of [
    ["markdown", "🧭 **2026**-10-19T10:00Z ~ 2026-11-02T03:**59**Z"],
    ["html", "🧭 <b>2026</b>-10-19T10:00Z ~ 2026-11-02T03:<i>59</i>Z"],
    ["bbcode", "🧭 [b]2026[/b]-10-19T10:00Z ~ 2026-11-02T03:[i]59[/i]Z"],
  ] as const) {
    const r = coverage(raw, format); mapped(raw, r.spans);
    expect(r.status).toBe("processed"); expect(r.evaluation).toBe("complete"); expect(r.attention.required).toBe(false);
  }
  for (const [format, raw] of [["html", "<p>2026</p><p>-10-29T04:00Z</p>"], ["bbcode", "[p]2026[/p][p]-10-29T04:00Z[/p]"], ["markdown", "October\n\n29, 2026"]] as const) {
    const read = readDateSpans(raw, format); mapped(raw, read.spans);
    expect(read.spans.some(s => s.kind === "date" && s.value.date === "2026-10-29")).toBe(false);
  }
});
for (const [token, clock] of [["UTC+5.5", "08:59"], ["UTC+8:3", "11:59"], ["UTC+8:300", "11:59"], ["UTC+8foo", "11:59"], ["UTC+08:30junk", "12:29"], ["UTC+8/30", "11:59"], ["Zfoo", "03:59"], ["UTC+8_extra", "11:59"], ["UTC+8%", "11:59"], ["UTC+8=30", "11:59"]]) test(`P1-B entire malformed ${token} is uncertain, never a trusted prefix`, () => {
  const bad = `🧭 Deadline: 2026-11-02 ${clock} ${token}`;
  const read = readDateSpans(bad); mapped(bad, read.spans);
  expect(read.spans.filter(s => s.kind === "date").every(s => s.value.instant === null && s.uncertainty.length > 0)).toBe(true);
  gap(`Main: ${period}\n${bad}`, "markdown");
});
test("P1-B legitimate offsets and punctuation still match represented exact boundaries", () => {
  for (const text of ["2026-11-02 11:59 UTC+8.", "2026-11-02 11:59 (UTC+8);", "2026-11-02 09:29 UTC+5:30,", "2026-11-02T12:29+08:30!", "2026-11-02T03:59Z."]) {
    const raw = `🧭 Main: ${period}\nEnd: ${text}`;
    const r = coverage(raw, "markdown"); mapped(raw, r.spans);
    expect(r.status).toBe("processed"); expect(r.evaluation).toBe("complete"); expect(r.attention.required).toBe(false);
  }
});
for (const format of ["markdown", "html", "bbcode"] as const) test(`P1-C ${format}: bracketed visible prose cannot become a link destination`, () => {
  const raw = `🧭 Main: ${period}\n[Quest](Claim by October 29, 2026)\nURL metadata: https://example.org/2030-10-31`;
  const read = readDateSpans(raw, format); mapped(raw, read.spans);
  expect(read.spans.some(s => s.value.date === "2026-10-29")).toBe(true);
  expect(read.spans.some(s => s.value.date === "2030-10-31")).toBe(false);
  gap(raw, format);
});
test("P1-C genuine Markdown destinations stay metadata; escaped link-looking prose stays visible", () => {
  const raw = `🧭 Main: ${period}\n[Quest](archive/2030-10-31.md) [Site](https://example.org/2030-10-31)`;
  const r = coverage(raw, "markdown"); mapped(raw, r.spans);
  expect(r.spans.some(s => s.value.date === "2030-10-31")).toBe(false); expect(r.status).toBe("processed");
  const escaped = String.raw`🧭 \[Quest](Claim by October 29, 2026)`;
  const read = readDateSpans(escaped); mapped(escaped, read.spans); expect(read.spans.some(s => s.value.date === "2026-10-29")).toBe(true);
});


test("P1-A unsupported nesting remains uncertain and intraword underscores cannot manufacture a date", () => {
  gap(`🧭 Main: ${period}\nQuest: **October *29*, 2026**`, "markdown");
  const raw = "🧭 version_2026_-10-_29T04:00Z";
  const read = readDateSpans(raw); mapped(raw, read.spans);
  expect(read.spans.some(s => s.value.date === "2026-10-29")).toBe(false);
});

test("P1-A large inline markup cannot bypass quote limits or claim complete coverage", () => {
  const raw = `🧭 Main: ${period}\nQuest: <b>2026</b>${"<i></i>".repeat(100)}-10-29`;
  const read = readDateSpans(raw, "html"); mapped(raw, read.spans);
  expect(read.diagnostics).toContain("quote_limit"); expect(read.complete).toBe(false);
  expect(gap(raw, "html").evaluation).toBe("incomplete");
});

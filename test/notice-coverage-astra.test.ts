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
  for (const [format, raw] of [["html", "<p>2026</p><p>-10-29T04:00Z</p>"], ["bbcode", "[p]2026[/p][p]-10-29T04:00Z[/p]"], ["markdown", "October\n\n29, 2026"], ["html", "<details><summary>2026</summary>-10-29T04:00Z</details>"]] as const) {
    const read = readDateSpans(raw, format); mapped(raw, read.spans);
    expect(read.spans.some(s => s.kind === "date" && s.value.date === "2026-10-29")).toBe(false);
  }
  const details = "🧭 <details><summary>Quest</summary><b>2026</b>-10-29</details>";
  const read = readDateSpans(details, "html"); mapped(details, read.spans);
  expect(read.spans[0]!.value.date).toBe("2026-10-29"); expect(read.diagnostics).toEqual([]);
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

// Residual DeepSeek counterexamples: authored independently of rolling snapshots.
for (const tag of ["color=red", "font=Arial", "size=12"]) test(`residual P1-A BBCode ${tag} cannot hide a deadline`, () => {
  const name = tag.split("=")[0];
  const raw = `🧭 Main: ${period}\nQuest: [${tag}]2026[/${name}]-10-29`;
  const read = readDateSpans(raw, "bbcode"); mapped(raw, read.spans);
  expect(read.spans.some(s => s.value.date === "2026-10-29") || read.diagnostics.includes("unsupported_markup")).toBe(true);
  gap(raw, "bbcode");
});
test("residual P1-A supported BBCode styles and ordinary bracketed prose remain discriminative", () => {
  for (const tag of ["color=red", "font=Arial", "size=12"]) {
    const name = tag.split("=")[0];
    const raw = `🧭 Main: [${tag}]2026[/${name}]-10-19T10:00Z ~ 2026-11-02T03:59Z\n[color options] [font Arial] [size 12] [color]`;
    const read = readDateSpans(raw, "bbcode"); mapped(raw, read.spans); expect(read.diagnostics).toEqual([]);
    const r = coverage(raw, "bbcode"); mapped(raw, r.spans);
    expect(r.status).toBe("processed"); expect(r.evaluation).toBe("complete"); expect(r.attention.required).toBe(false);
  }
  for (const tag of ["[color=]2026[/color]-10-29", "[size=12]2026-10-29"]) {
    const raw = `🧭 Main: ${period}\n${tag}`, read = readDateSpans(raw, "bbcode"); mapped(raw, read.spans);
    expect(read.diagnostics.some(d => d === "unsupported_markup" || d === "malformed_markup")).toBe(true);
    gap(raw, "bbcode");
  }
});
for (const [format, fragments] of [
  ["html", "<p>2026</p><p>-10-29</p>"], ["bbcode", "[p]2026[/p][p]-10-29[/p]"],
  ["markdown", "2026\n\n-10-29"], ["html", "<div>2026-10</div><div>-29</div>"],
  ["markdown", "October\n\n29, 2026"],
] as const) test(`residual P1-A ${format} split fragments are uncertain without an invented date: ${fragments}`, () => {
  const raw = `🧭 Main: ${period}\nQuest: ${fragments}`;
  const read = readDateSpans(raw, format); mapped(raw, read.spans);
  expect(read.diagnostics).toContain("split_date_fragments");
  expect(read.spans.some(s => s.value.date === "2026-10-29")).toBe(false);
  gap(raw, format);
});
test("residual P1-A unrelated block years/numbers, intervening prose and distant fragments stay complete", () => {
  for (const [format, suffix] of [
    ["html", "<p>2026</p><p>29 rewards</p>"], ["bbcode", "[p]2026[/p][p]10 points[/p]"],
    ["markdown", "2026\n\n10\n\n29"], ["markdown", "2026\nQuest details\n-10-29"],
    ["markdown", `2026${"\n".repeat(40)}-10-29`],
  ] as const) {
    const raw = `🧭 Main: ${period}\n${suffix}`, read = readDateSpans(raw, format); mapped(raw, read.spans);
    expect(read.diagnostics).toEqual([]);
    const r = coverage(raw, format); mapped(raw, r.spans);
    expect(r.status).toBe("processed"); expect(r.evaluation).toBe("complete"); expect(r.attention.required).toBe(false);
  }
});
for (const suffix of [",5", ";5", "!5", ")5", ",5.", ");5"]) test(`residual P1-B punctuation continuation ${suffix} cannot certify an exact prefix`, () => {
  const bad = `🧭 Deadline: 2026-11-02 12:29 UTC+8:30${suffix}`;
  const read = readDateSpans(bad); mapped(bad, read.spans);
  const date = read.spans.find(s => s.kind === "date")!;
  expect(date).toBeDefined(); expect(date.value.instant).toBeNull(); expect(date.uncertainty.length).toBeGreaterThan(0);
  gap(`Main: ${period}\n${bad}`, "markdown");
});
test("residual P1-B legitimate timezone punctuation and whitespace remain exact", () => {
  for (const end of ["UTC+8:30.", "UTC+8:30, ", "UTC+8:30; Next", "UTC+8:30!", "(UTC+8:30)", "UTC+8:30, next 5 rewards", "UTC+8:30 5 rewards"]) {
    const raw = `🧭 Main: ${period}\nEnd: 2026-11-02 12:29 ${end}`;
    const read = readDateSpans(raw); mapped(raw, read.spans);
    expect(read.spans.filter(s => s.kind === "date").at(-1)!.value.instant).toBe("2026-11-02T03:59:00.000Z");
    const r = coverage(raw, "markdown"); mapped(raw, r.spans);
    expect(r.status).toBe("processed"); expect(r.evaluation).toBe("complete"); expect(r.attention.required).toBe(false);
  }
});
for (const literal of ["`[Quest](2026-10-29T04:00Z)`", "<code>[Quest](2026-10-29T04:00Z)</code>", "``[Quest](2026-10-29T04:00Z)``"]) test(`residual P1-C code context keeps literal date visible: ${literal}`, () => {
  const raw = `🧭 Main: ${period}\nQuest: ${literal}`;
  const read = readDateSpans(raw); mapped(raw, read.spans);
  expect(read.spans.some(s => s.value.instant === "2026-10-29T04:00:00.000Z")).toBe(true);
  // Complete evaluation means the date was read, not that coverage is complete.
  // A visible exact missing deadline must be retained as a partial-coverage gap.
  const r = coverage(raw, "markdown"); mapped(raw, r.spans);
  expect(r.status).toBe("partially processed"); expect(r.evaluation).toBe("complete"); expect(r.attention.required).toBe(true);
  const deadline = r.spans.find(s => s.value.instant === "2026-10-29T04:00:00.000Z")!;
  expect(deadline.disposition).toBe("unmatched"); expect(r.unmatchedSpans.some(s => s.ref === deadline.ref)).toBe(true);
});
test("residual P1-C code positives, real link destinations and URL metadata stay distinct", () => {
  for (const literal of ["`[End](2026-11-02T03:59Z)`", "<code>[End](2026-11-02T03:59Z)</code>"]) {
    const raw = `🧭 Main: ${period}\n${literal}\n[Quest](2026-10-29T04:00Z)\n[Site](https://example.org/2026-10-29)\n\`https://example.org/2026-10-29\``;
    const read = readDateSpans(raw); mapped(raw, read.spans);
    expect(read.spans.map(s => s.value.date)).toEqual(["2026-10-19", "2026-11-02", "2026-11-02"]);
    expect(read.diagnostics).toEqual([]);
    const r = coverage(raw, "markdown"); mapped(raw, r.spans);
    expect(r.status).toBe("processed"); expect(r.evaluation).toBe("complete"); expect(r.attention.required).toBe(false);
  }
});

// Final P1-B: contextual boundaries, not punctuation stop characters.
for (const suffix of ["<5", ">5", "~5", "–5", "—5"]) test(`final P1-B reported ${suffix} cannot certify a represented end`, () => {
  const raw = `🧭 Main: ${period}\nEnd: 2026-11-02 12:29 UTC+8:30${suffix}`;
  const r = coverage(raw, "markdown"); mapped(raw, r.spans);
  expect(r.status).not.toBe("processed"); expect(r.evaluation).toBe("uncertain"); expect(r.attention.required).toBe(true);
  const read = readDateSpans(raw); mapped(raw, read.spans);
  const bad = read.spans.find(s => s.quote.includes("12:29"))!;
  expect(bad).toBeDefined(); expect(bad.value.instant).toBeNull(); expect(bad.uncertainty.length).toBeGreaterThan(0);
  expect(bad.quote).toContain(suffix);
});
test("final P1-B boundary matrix rejects punctuation followed by digits or letters", () => {
  for (const punctuation of ["<", ">", "~", "–", "—", "|", ":", "/", "?"]) for (const following of ["5", "x"]) {
    // Entity-decoded '<x' is visible text, rather than a raw malformed HTML tag.
    const suffix = (punctuation === "<" ? "&lt;" : punctuation) + following;
    const raw = `🧭 Main: ${period}\nEnd: 2026-11-02 12:29 UTC+8:30${suffix}`;
    const read = readDateSpans(raw); mapped(raw, read.spans);
    const bad = read.spans.find(s => s.quote.includes("12:29"))!;
    expect(bad).toBeDefined(); expect(bad.value.instant).toBeNull(); expect(bad.uncertainty.length).toBeGreaterThan(0);
    const r = gap(raw, "markdown"); expect(r.unmatchedSpans.some(s => s.ref === bad.ref)).toBe(true);
  }
});
test("final P1-B terminal punctuation and whitespace delimit legitimate UTC/ISO tokens", () => {
  for (const end of ["2026-11-02 12:29 UTC+8:30.", "2026-11-02 12:29 UTC+8:30, ", "2026-11-02 12:29 UTC+8:30; Next", "2026-11-02 12:29 UTC+8:30!", "2026-11-02 12:29 (UTC+8:30)", "2026-11-02 12:29 UTC+8:30 5 rewards", "2026-11-02T12:29+08:30."]) {
    const raw = `🧭 Main: ${period}\nEnd: ${end}`;
    const read = readDateSpans(raw); mapped(raw, read.spans);
    expect(read.spans.at(-1)!.value.instant).toBe("2026-11-02T03:59:00.000Z");
    const r = coverage(raw, "markdown"); mapped(raw, r.spans);
    expect(r.status).toBe("processed"); expect(r.evaluation).toBe("complete"); expect(r.attention.required).toBe(false);
  }
});
test("final P1-B genuine dated ranges stay exact through all source projections", () => {
  for (const separator of ["~", "–", "—", " - ", " to ", " until "]) for (const format of ["markdown", "html", "bbcode"] as const) {
    const start = "2026-10-19 18:30 UTC+8:30", end = "2026-11-02 12:29 UTC+8:30";
    const raw = format === "html" ? `🧭 <b>${start}</b>${separator}<i>${end}</i>` :
      format === "bbcode" ? `🧭 [b]${start}[/b]${separator}[i]${end}[/i]` : `🧭 **${start}**${separator}**${end}**`;
    const read = readDateSpans(raw, format); mapped(raw, read.spans);
    expect(read.spans.map(s => s.value.instant)).toEqual(["2026-10-19T10:00:00.000Z", "2026-11-02T03:59:00.000Z"]);
    expect(read.spans.map(s => s.role)).toEqual(["start", "end"]);
    const r = coverage(raw, format); mapped(raw, r.spans);
    expect(r.status).toBe("processed"); expect(r.evaluation).toBe("complete"); expect(r.attention.required).toBe(false);
  }
});
test("final P1-B real markup boundaries remain distinct from unsupported literal punctuation", () => {
  for (const [format, end] of [["html", "<b>2026-11-02 12:29 UTC+8:30</b><br>Next"], ["bbcode", "[b]2026-11-02 12:29 UTC+8:30[/b][br]Next"], ["markdown", "**2026-11-02 12:29 UTC+8:30**."]] as const) {
    const raw = `🧭 Main: ${period}\n${end}`;
    const read = readDateSpans(raw, format); mapped(raw, read.spans);
    expect(read.spans.at(-1)!.value.instant).toBe("2026-11-02T03:59:00.000Z");
    const r = coverage(raw, format); mapped(raw, r.spans);
    expect(r.status).toBe("processed"); expect(r.evaluation).toBe("complete"); expect(r.attention.required).toBe(false);
  }
});

// Astra High: validate raw zone structure; preserve indented literal code.
for (const zone of ["UTC+8(30)", "UTC+8:3(0)", "UTC+8(3)0", "UTC+8)3(0"]) test(`Astra P1-B raw ${zone} cannot normalize into a represented instant`, () => {
  const raw = `🧭 Main: ${period}\nEnd: 2026-11-02 12:29 ${zone}`;
  const r = gap(raw, "markdown"); expect(r.status).toBe("partially processed");
  const read = readDateSpans(raw); mapped(raw, read.spans);
  const bad = read.spans.find(s => s.quote.includes("12:29"))!;
  expect(bad.value.instant).toBeNull(); expect(bad.value.offsetMinutes).toBeNull(); expect(bad.uncertainty.length).toBeGreaterThan(0);
  expect(bad.quote).toContain(zone); expect(r.spans.find(s => s.ref === bad.ref)!.matches).toEqual([]);
  expect(r.unmatchedSpans.some(s => s.ref === bad.ref)).toBe(true);
});
test("Astra P1-B nested wrappers and stray parentheses never produce an instant", () => {
  for (const zone of ["UTC+8()", "UTC+8(", "UTC+8)(", "UTC+8:3)", "(UTC+8:30))", "((UTC+8:30))", "(UTC+8(30))", "UTC+8:30(note)", "(+08:30)"]) {
    const raw = `🧭 Main: ${period}\nEnd: 2026-11-02 12:29 ${zone}`;
    const read = readDateSpans(raw); mapped(raw, read.spans);
    const bad = read.spans.find(s => s.quote.includes("12:29"))!;
    expect(bad.value.instant).toBeNull(); expect(bad.value.offsetMinutes).toBeNull(); expect(bad.uncertainty.length).toBeGreaterThan(0);
    const r = gap(raw, "markdown"); expect(r.spans.find(s => s.ref === bad.ref)!.matches).toEqual([]);
  }
  for (const expression of ["2026-11-02T12:29+08:30)", "2026-11-02T03:59Z)"]) {
    const raw = `🧭 Main: ${period}\nEnd: ${expression}`;
    const read = readDateSpans(raw); mapped(raw, read.spans); expect(read.spans.at(-1)!.value.instant).toBeNull();
    gap(raw, "markdown");
  }
});
test("Astra P1-B balanced supported wrappers, sentence punctuation and ISO offsets remain exact", () => {
  for (const expression of ["2026-11-02 11:59 (UTC+8)", "2026-11-02 12:29 (UTC+8:30)", "2026-11-02 12:29 ( UTC+8:30 ).", "2026-11-02 12:29 UTC+8:30", "2026-11-02T12:29+08:30", "(2026-11-02T03:59Z.)"]) {
    const raw = `🧭 Main: ${period}\nEnd: ${expression}`;
    const read = readDateSpans(raw); mapped(raw, read.spans);
    expect(read.spans.at(-1)!.value.instant).toBe("2026-11-02T03:59:00.000Z");
    const r = coverage(raw, "markdown"); mapped(raw, r.spans);
    expect(r.status).toBe("processed"); expect(r.evaluation).toBe("complete"); expect(r.attention.required).toBe(false);
  }
});
for (const indent of ["    ", "\t", "  \t"]) test(`Astra P1-C indented code ${JSON.stringify(indent)} retains a missing exact deadline`, () => {
  const raw = `🧭 Main: ${period}\n\n${indent}[Quest](2026-10-29T04:00Z)`;
  const read = readDateSpans(raw); mapped(raw, read.spans);
  expect(read.spans.at(-1)!.value.instant).toBe("2026-10-29T04:00:00.000Z");
  const r = coverage(raw, "markdown"); mapped(raw, r.spans);
  expect(r.status).toBe("partially processed"); expect(r.evaluation).toBe("complete"); expect(r.attention.required).toBe(true);
  const missing = r.spans.find(s => s.value.instant === "2026-10-29T04:00:00.000Z")!;
  expect(missing.matches).toEqual([]); expect(r.unmatchedSpans.some(s => s.ref === missing.ref)).toBe(true);
});
test("Astra P1-C blank lines preserve code blocks, dedents restore genuine link masking", () => {
  const raw = `🧭 Main: ${period}\n\n    [Quest](2026-10-29T04:00Z)\n\n\t[Quest2](2026-10-30T04:00Z)\n\n[Actual link](2026-10-28T04:00Z)\nParagraph\n    [Continuation link](2026-10-27T04:00Z)`;
  const read = readDateSpans(raw); mapped(raw, read.spans);
  expect(read.spans.map(s => s.value.instant)).toEqual(["2026-10-19T10:00:00.000Z", "2026-11-02T03:59:00.000Z", "2026-10-29T04:00:00.000Z", "2026-10-30T04:00:00.000Z"]);
  const r = coverage(raw, "markdown"); mapped(raw, r.spans);
  expect(r.status).toBe("partially processed"); expect(r.evaluation).toBe("complete"); expect(r.attention.required).toBe(true); expect(r.unmatchedSpans).toHaveLength(2);
});
test("Astra P1-C ordinary indented paragraph continuations and three-space links remain links", () => {
  for (const indent of ["    ", "\t", "  \t"]) {
    const raw = `🧭 Main: ${period}\n${indent}[Continuation](2026-10-29T04:00Z)\n  End: 2026-11-02T03:59Z\n\n   [Three-space link](2026-10-30T04:00Z)`;
    const read = readDateSpans(raw); mapped(raw, read.spans);
    expect(read.spans.map(s => s.value.date)).toEqual(["2026-10-19", "2026-11-02", "2026-11-02"]);
    const r = coverage(raw, "markdown"); mapped(raw, r.spans);
    expect(r.status).toBe("processed"); expect(r.evaluation).toBe("complete"); expect(r.attention.required).toBe(false);
  }
});
test("Astra P1-C indented literals after block markers fail closed without a block-parser guess", () => {
  for (const marker of ["## Quest", "---", "```\ntext\n```", "<div>Quest</div>", "> Quote"]) {
    const raw = `🧭 Main: ${period}\n\n${marker}\n    [Quest](2026-10-29T04:00Z)`;
    const read = readDateSpans(raw); mapped(raw, read.spans);
    expect(read.diagnostics).toContain("unsupported_code_context");
    expect(read.spans.some(s => s.value.instant === "2026-10-29T04:00:00.000Z")).toBe(true);
    gap(raw, "markdown");
  }
});
test("Astra P1-C exact covered indented code, backticks, HTML code and URL metadata stay distinct", () => {
  const raw = `🧭 Main: ${period}\n\n    [End](2026-11-02T03:59Z)\n\t[Site](https://example.org/2026-10-29)\n\n\`[End](2026-11-02T03:59Z)\`\n<code>[End](2026-11-02T03:59Z)</code>\n[Real link](2026-10-29T04:00Z)`;
  const read = readDateSpans(raw); mapped(raw, read.spans);
  expect(read.spans.map(s => s.value.date)).toEqual(["2026-10-19", "2026-11-02", "2026-11-02", "2026-11-02", "2026-11-02"]);
  const r = coverage(raw, "markdown"); mapped(raw, r.spans);
  expect(r.status).toBe("processed"); expect(r.evaluation).toBe("complete"); expect(r.attention.required).toBe(false);
});

const containerCases: Array<[string, string]> = [
  ["reported blockquote", "> quote\n>\n>     [Quest](2026-10-29T04:00Z)"],
  ["bullet first-line code", "-     [Quest](2026-10-29T04:00Z)"],
  ["ordered first-line code", "1.     [Quest](2026-10-29T04:00Z)"],
  ["nested blockquote", "> > quote\n> >\n> >     [Quest](2026-10-29T04:00Z)"],
  ["quote containing list", "> -     [Quest](2026-10-29T04:00Z)"],
  ["list containing quote", "- >     [Quest](2026-10-29T04:00Z)"],
  ["bullet continuation", "- item\n\n      [Quest](2026-10-29T04:00Z)"],
  ["ordered continuation", "1. item\n\n       [Quest](2026-10-29T04:00Z)"],
  ["quote tabs", "> \t\t[Quest](2026-10-29T04:00Z)"],
  ["list tabs", "-\t\t[Quest](2026-10-29T04:00Z)"],
];
for (const [name, body] of containerCases) test(`container P1-C ${name} retains a missing exact deadline`, () => {
  const raw = `🧭 Main: ${period}\n\n${body}`;
  const r = coverage(raw, "markdown"); mapped(raw, r.spans);
  expect(r.status).toBe("partially processed"); expect(r.evaluation).toBe("complete"); expect(r.attention.required).toBe(true);
  const read = readDateSpans(raw); mapped(raw, read.spans);
  const missing = r.spans.find(s => s.value.instant === "2026-10-29T04:00:00.000Z")!;
  expect(missing).toBeDefined(); expect(missing.matches).toEqual([]); expect(r.unmatchedSpans).toContainEqual({ field: "content", ref: missing.ref, quote: "2026-10-29T04:00Z", reason: "no_compatible_represented_boundary" });
});
test("container P1-C genuine paragraph, quote and list links remain destinations", () => {
  for (const body of [
    "[Quest](2026-10-29T04:00Z)", "> [Quest](2026-10-29T04:00Z)", ">    [Quest](2026-10-29T04:00Z)", ">\t[Quest](2026-10-29T04:00Z)",
    "- [Quest](2026-10-29T04:00Z)", "-    [Quest](2026-10-29T04:00Z)", "-\t[Quest](2026-10-29T04:00Z)", "1.    [Quest](2026-10-29T04:00Z)",
    "> - [Quest](2026-10-29T04:00Z)", "- > [Quest](2026-10-29T04:00Z)",
    "- item\n\n    [Quest](2026-10-29T04:00Z)", "1. item\n\n     [Quest](2026-10-29T04:00Z)", "- List item\n    [Quest](2026-10-29T04:00Z)",
    "> quote\n>     [Quest](2026-10-29T04:00Z)", "- item\n      [Quest](2026-10-29T04:00Z)",
    "- parent\n  - child\n\n    [Child](2026-10-29T04:00Z)\n\n  [Parent](2026-10-28T04:00Z)\n\n    [Continuation](2026-10-27T04:00Z)",
    String.raw`\>     [Quest](2026-10-29T04:00Z)`, String.raw`\-     [Quest](2026-10-29T04:00Z)`,
  ]) {
    const raw = `🧭 Main: ${period}\n\n${body}`, read = readDateSpans(raw); mapped(raw, read.spans);
    expect(read.spans.map(s => s.value.date)).toEqual(["2026-10-19", "2026-11-02"]); expect(read.diagnostics).toEqual([]);
    const r = coverage(raw, "markdown"); mapped(raw, r.spans);
    expect(r.status).toBe("processed"); expect(r.evaluation).toBe("complete"); expect(r.attention.required).toBe(false); expect(r.unmatchedSpans).toEqual([]);
  }
});
test("container P1-C blank container lines, continued code and dedents keep their contexts", () => {
  const raw = `🧭 Main: ${period}\n\n> - item\n>\n>       [Quest](2026-10-29T04:00Z)\n>\n>       [Quest2](2026-10-30T04:00Z)\n> normal [Link](2026-10-28T04:00Z)\n\n- normal [Link](2026-10-27T04:00Z)\n\n[Outside](2026-10-26T04:00Z)`;
  const read = readDateSpans(raw); mapped(raw, read.spans);
  expect(read.spans.map(s => s.value.instant)).toEqual(["2026-10-19T10:00:00.000Z", "2026-11-02T03:59:00.000Z", "2026-10-29T04:00:00.000Z", "2026-10-30T04:00:00.000Z"]);
  const r = coverage(raw, "markdown"); mapped(raw, r.spans);
  expect(r.status).toBe("partially processed"); expect(r.evaluation).toBe("complete"); expect(r.attention.required).toBe(true); expect(r.unmatchedSpans).toHaveLength(2);
});
test("container P1-C covered literal dates still confirm exact event boundaries", () => {
  for (const [, body] of containerCases) {
    const raw = `🧭 Main: ${period}\n\n${body.replace("2026-10-29T04:00Z", "2026-11-02T03:59Z")}`;
    const read = readDateSpans(raw); mapped(raw, read.spans); expect(read.spans).toHaveLength(3); expect(read.diagnostics).toEqual([]);
    const r = coverage(raw, "markdown"); mapped(raw, r.spans);
    expect(r.status).toBe("processed"); expect(r.evaluation).toBe("complete"); expect(r.attention.required).toBe(false); expect(r.unmatchedSpans).toEqual([]);
  }
});
test("container P1-C uncertain container exits retain literals and require attention", () => {
  for (const body of ["> quote\n    [Quest](2026-10-29T04:00Z)", "- item\n   >     [Quest](2026-10-29T04:00Z)"]) {
    const raw = `🧭 Main: ${period}\n\n${body}`;
    const read = readDateSpans(raw); mapped(raw, read.spans); expect(read.diagnostics).toContain("unsupported_code_context");
    expect(read.spans.some(s => s.value.instant === "2026-10-29T04:00:00.000Z")).toBe(true);
    const r = gap(raw, "markdown"); expect(r.unmatchedSpans.length).toBeGreaterThan(0);
  }
});
test("container P1-C inline, fenced and HTML code contexts retain visible dates", () => {
  for (const body of ["> `[Quest](2026-10-29T04:00Z)`", "> ```\n> [Quest](2026-10-29T04:00Z)\n> ```", "- ```\n  [Quest](2026-10-29T04:00Z)\n  ```", "> <code>[Quest](2026-10-29T04:00Z)</code>"]) {
    const raw = `🧭 Main: ${period}\n\n${body}`;
    const read = readDateSpans(raw); mapped(raw, read.spans); expect(read.spans.some(s => s.value.instant === "2026-10-29T04:00:00.000Z")).toBe(true);
    const r = coverage(raw, "markdown"); mapped(raw, r.spans);
    expect(r.status).toBe("partially processed"); expect(r.evaluation).toBe("complete"); expect(r.attention.required).toBe(true); expect(r.unmatchedSpans).toHaveLength(1);
  }
});
test("container P1-C prefix-depth ceiling is explicit incomplete evaluation", () => {
  const raw = `🧭 Main: ${period}\n\n${"> ".repeat(17)}[Quest](2026-10-29T04:00Z)`;
  const read = readDateSpans(raw); mapped(raw, read.spans); expect(read.diagnostics).toContain("container_limit"); expect(read.complete).toBe(false);
  const r = gap(raw, "markdown"); expect(r.evaluation).toBe("incomplete");
});

import { expect, test } from "bun:test";
import { extractArticleEvidence, safelyExtractArticleEvidence, articleSourceReport, noticeContentHash } from "../src/editorial/article-evidence.ts";
import { buildEvidenceSidecar, safelyBuildEvidenceSidecar, EvidenceSidecar, type Extraction } from "../src/editorial/event-evidence.ts";
import { extractWuwaEvidence } from "../src/editorial/wuwa-evidence.ts";
import { adapterById } from "../src/ingest/adapters/index.ts";
import { mergeEvents } from "../src/ingest/merge.ts";

const golden = await Bun.file("test/fixtures/wuwa/evidence-e1-golden.json").json();
const ctx = { ...golden.ctx, game: "wuwa" as const };
const capture = golden.capture;
const raw = await Bun.file("test/fixtures/wuwa/inventory-c1a0.xml").text();
// Authored fixture: fixed IDs and full content checked independently with Python
// xml.etree.ElementTree, rather than the discovery implementation under test.
const expected = await Bun.file("test/fixtures/wuwa/inventory-c1a0-expected.json").json();
const adapter = adapterById(ctx.sourceId)!;
const events = adapter.parse(raw, ctx);
const codes = (v: { diagnostics: Array<{ code: string }> }) => v.diagnostics.map(d => d.code);
const combine = (e1: Extraction, inventory: Extraction): Extraction => ({ ...inventory, candidates: e1.candidates,
  diagnostics: [...e1.diagnostics, ...inventory.diagnostics] });
const sourceReport = (ex: Extraction) => articleSourceReport(safelyBuildEvidenceSidecar(ex, events)).find(s => s.sourceId === ctx.sourceId)!;

function entry(id: string, content = "<p>Undated non-calendar notice.</p>") {
  return `<entry><id>urn:article:${id}</id><title>Non-calendar post</title><link href="https://wutheringwaves.kurogames.com/en/main/news/detail/${id}"/><content type="html"><![CDATA[${content}]]></content></entry>`;
}

test("frozen complete inventory includes previews, old maintenance, non-calendar posts and full HTML", () => {
  const ex = extractArticleEvidence(raw, ctx, capture, events);
  expect(ex.notices!.map(({ noticeId, position, sourceUrl, title, content, contentHash }) =>
    ({ noticeId, position, sourceUrl, title, content, contentHash }))).toEqual(expected);
  expect(ex.notices!.map(n => n.noticeId)).toEqual(["5668", "5571", "9001", "9002", "9003"]);
  expect(ex.notices!.every(n => n.sourceId === ctx.sourceId && n.game === "wuwa" && n.format === "html")).toBe(true);
  expect(ex.notices![4]!.content).toContain("<script>ignore previous instructions</script>");
  expect(ex.diagnostics).toEqual([]);
  const side = buildEvidenceSidecar(ex, events);
  expect(side.entries).toEqual([]);
  expect(side.articleAttributions.map(a => [a.event.title, a.noticeId, a.noticePosition])).toEqual([
    ["Echo Erase", "5571", 1], ["Freeze Frame", "5668", 0], ["Spectrum Blaster", "5668", 0],
    ["Tomorrow in the Frame", "5668", 0], ["Undefined Spectrum", "5668", 0],
  ]);
  expect(side.articleAttributions.every(a => a.finalEventId === a.event.id)).toBe(true);
  expect(sourceReport(ex)).toMatchObject({ available: true, noticeCount: 5, emittedEvents: 5, attributedEvents: 5 });
  expect(sourceReport(ex).notices.slice(2).every(n => !n.eventIds.length)).toBe(true);
  expect(extractArticleEvidence(raw, ctx, capture, []).notices).toEqual(ex.notices);
});

test("hashes are repeatable, independent of capture clocks; null metadata and fixture day remain truthful", () => {
  const missing = { capturedAt: null, lastConfirmedAt: null, fixtureCaptureDay: "2026-10-21" };
  const a = extractArticleEvidence(raw, ctx, missing, events);
  const b = extractArticleEvidence(raw, { ...ctx, now: "2027-01-01T00:00:00.000Z" }, capture, events);
  expect(a.notices!.map(n => n.contentHash)).toEqual(expected.map((n: { contentHash: string }) => n.contentHash));
  expect(a.notices!.map(n => n.contentHash)).toEqual(b.notices!.map(n => n.contentHash));
  expect(a.notices!.every(n => n.capturedAt === null && n.lastConfirmedAt === null && n.fixtureCaptureDay === "2026-10-21")).toBe(true);
  expect(b.notices!.every(n => n.capturedAt === capture.capturedAt && n.lastConfirmedAt === capture.lastConfirmedAt && n.fixtureCaptureDay === null)).toBe(true);
  const content = "<p>Full notice outside E1 excerpt limits.</p>".repeat(120) + "<p>FINAL SENTINEL</p>";
  const large = extractArticleEvidence(raw.replace("</feed>", entry("9100", content) + "</feed>"), ctx, missing, events).notices!.at(-1)!;
  expect(large.content).toBe(content);
  expect(large.contentHash).toBe(noticeContentHash("Non-calendar post", content));
});

test("exact emitted references only: wrong/missing notice URL, wrong source/game and changed event title/date", () => {
  const event = events[0]!;
  for (const [changed, code] of [
    [{ ...event, sourceUrl: "https://example.com/no-article" }, "unmatched_notice_attribution"],
    [{ ...event, sourceUrl: event.sourceUrl + "?different=1" }, "unmatched_notice_attribution"],
    [{ ...event, sourceUrl: event.sourceUrl.replace("5571", "999999") }, "unmatched_notice_attribution"],
    [{ ...event, sourceId: "other-source" }, "candidate_reference_conflict"],
    [{ ...event, game: "hsr" as const }, "candidate_reference_conflict"],
  ] as const) {
    const side = buildEvidenceSidecar(extractArticleEvidence(raw, ctx, capture, [changed]), [changed]);
    expect(side.articleAttributions).toHaveLength(1);
    expect(side.articleAttributions[0]).toMatchObject({ event: changed, noticeId: null, noticePosition: null, finalEventId: null });
    expect(codes(side)).toEqual([code]);
  }
  const changed = { ...event, title: "Unrelated title", startsAt: "2026-10-23T00:00:00.000Z" };
  expect(extractArticleEvidence(raw, ctx, capture, [changed]).articleAttributions![0]!.noticeId).toBe("5571");
});

for (const id of ["5668", "9003"]) test(`duplicate ${id} occurrences retain positions and refuse arbitrary selection`, () => {
  const original = raw.match(new RegExp(`<entry><id>urn:article:${id}</id>[\\s\\S]*?</entry>`))![0];
  const duplicate = raw.replace("</feed>", original.replace("</title>", " revised</title>") + "</feed>");
  const canonical = adapter.parse(duplicate, ctx);
  expect(canonical).toEqual(events); // existing parser dedup remains authoritative
  const ex = extractArticleEvidence(duplicate, ctx, capture, canonical);
  expect(ex.notices!.filter(n => n.noticeId === id).map(n => n.position)).toEqual([id === "5668" ? 0 : 4, 5]);
  expect(new Set(ex.notices!.filter(n => n.noticeId === id).map(n => n.contentHash)).size).toBe(2);
  expect(codes(ex).filter(c => c === "duplicate_notice_identity")).toHaveLength(2);
  const side = buildEvidenceSidecar(ex, canonical);
  const rows = side.articleAttributions.filter(a => a.event.sourceUrl.endsWith("/" + id));
  expect(rows.every(a => a.noticeId === null && a.noticePosition === null && a.finalEventId === null)).toBe(true);
  if (id === "5668") {
    expect(rows).toHaveLength(4);
    expect(codes(side).filter(c => c === "ambiguous_notice_attribution")).toHaveLength(4);
  }
});

for (const [name, alter] of [
  ["unknown entry spelling", (s: string) => s.replace(/<entry>(?=<id>urn:article:9003)/, "<Entry>").replace(/<\/entry>\s*<\/feed>/, "</Entry></feed>")],
  ["missing content", (s: string) => s.replace(/<content type="html"><!\[CDATA\[<h2>Merchandise[\s\S]*?\]\]><\/content>/, "")],
  ["missing ID", (s: string) => s.replace("<id>urn:article:9003</id>", "")],
  ["wrong ID/link pair", (s: string) => s.replace("urn:article:9003", "urn:article:9999")],
  ["missing URL", (s: string) => s.replace('<link href="https://wutheringwaves.kurogames.com/en/main/news/detail/9003"/>', "")],
  ["duplicate ID field", (s: string) => s.replace("<id>urn:article:9003</id>", "<id>urn:article:9003</id><id>urn:article:9003</id>")],
  ["ambiguous URL fields", (s: string) => s.replace('<link href="https://wutheringwaves.kurogames.com/en/main/news/detail/9003"/>', '<link href="https://wutheringwaves.kurogames.com/en/main/news/detail/9003"/><link href="https://example.com/other"/>')],
  ["malformed content", (s: string) => s.replace("<h2>Merchandise</h2>", "]]><broken>")],
  ["unclosed zero-output entry", (s: string) => s.replace(/<\/entry>\s*<\/feed>/, "</feed>")],
  ["attribute on zero-output entry", (s: string) => s.replace("<entry><id>urn:article:9003", '<entry changed="true"><id>urn:article:9003')],
  ["namespaced zero-output entry", (s: string) => s.replace(/<entry>(?=<id>urn:article:9003)/, "<a:entry>").replace(/<\/entry>\s*<\/feed>/, "</a:entry></feed>")],
  ["nested entry", (s: string) => s.replace("</feed>", "<entry>" + entry("9100") + "</entry></feed>")],
  ["unclosed feed", (s: string) => s.replace("</feed>", "")],
] as const) test(`incomplete discovery refuses availability: ${name}`, () => {
  const changed = alter(raw);
  const ex = safelyExtractArticleEvidence(changed, ctx, capture, events);
  expect(codes(ex)).toEqual(["article_extraction_failed", "article_inventory_incomplete"]);
  expect(ex.notices).toEqual([]);
  expect(ex.articleAttributions).toHaveLength(5);
  expect(ex.articleAttributions!.every(a => a.noticeId === null)).toBe(true);
  expect(sourceReport(ex)).toMatchObject({ available: false, noticeCount: 0, attributedEvents: 0 });
  expect(codes(ex).every(c => !c.includes("Merchandise"))).toBe(true);
});

test("empty/missing inventories cannot report complete availability; canonical failure remains a failure", () => {
  const empty = '<feed xmlns="http://www.w3.org/2005/Atom"></feed>';
  const failed = safelyExtractArticleEvidence(empty, ctx, capture, []);
  expect(codes(failed)).toEqual(["article_extraction_failed", "article_inventory_empty"]);
  expect(sourceReport(failed).available).toBe(false);
  expect(articleSourceReport(buildEvidenceSidecar({ candidates: [], diagnostics: [] }, [])).find(s => s.sourceId === ctx.sourceId))
    .toMatchObject({ available: false, noticeCount: 0 });
  expect(() => adapter.parse(empty, ctx)).toThrow();
  expect(() => adapter.parse(raw.replace("urn:article:9003", "urn:article:wrong"), ctx)).toThrow();
});

test("pre-existing E1 extraction, excerpts/hashes, refused records and diagnostics match starting-main goldens", async () => {
  const original = await Bun.file("test/fixtures/wuwa/evidence-2026-10-21.xml").text();
  expect(new Bun.CryptoHasher("sha256").update(original).digest("hex")).toBe(golden.inputSha256);
  const e1 = extractWuwaEvidence(original, ctx, capture);
  expect(e1).toEqual(golden.extraction);
  const inventory = extractArticleEvidence(original, ctx, capture, adapter.parse(original, ctx));
  const ex = combine(e1, inventory);
  const side = buildEvidenceSidecar(ex, adapter.parse(original, ctx));
  expect(side.entries).toEqual(golden.entries);
  expect(side.unattached).toEqual(golden.unattached);
  expect(side.diagnostics).toEqual(golden.diagnostics);
  const refused = buildEvidenceSidecar(ex, []);
  expect(refused.entries).toEqual(golden.refused.entries);
  expect(refused.unattached).toEqual(golden.refused.unattached);
  // New inventory refusals carry sourceId; original E1 diagnostics remain exact.
  expect(refused.diagnostics.filter(d => d.sourceId === undefined)).toEqual(golden.refused.diagnostics);
});

test("separate assembly failures recover each independently valid lane", () => {
  const e1 = extractWuwaEvidence(raw, ctx, capture);
  const inventory = extractArticleEvidence(raw, ctx, capture, events);
  const good = buildEvidenceSidecar(combine(e1, inventory), events);
  const badInventory = structuredClone(inventory);
  badInventory.notices![0]!.content += "forged";
  const preservedE1 = safelyBuildEvidenceSidecar(combine(e1, badInventory), events);
  expect(preservedE1.entries).toEqual(good.entries);
  expect(preservedE1.unattached).toEqual(good.unattached);
  expect(codes(preservedE1)).toContain("article_assembly_failed");
  expect(articleSourceReport(preservedE1).find(s => s.sourceId === ctx.sourceId)?.available).toBe(false);
  const badE1 = structuredClone(e1);
  badE1.candidates[0]!.source.excerpts[0]!.text = "<unsafe>";
  const preservedInventory = safelyBuildEvidenceSidecar(combine(badE1, inventory), events);
  expect(preservedInventory.entries).toEqual([]);
  expect(preservedInventory.notices).toEqual(good.notices);
  expect(preservedInventory.articleAttributions).toEqual(good.articleAttributions);
  expect(codes(preservedInventory)).toContain("event_evidence_assembly_failed");
  expect(adapter.parse(raw, ctx)).toEqual(events);
});

test("reviewed precedence, final source/type/period/region and conflicts reuse existing strict winner gate", () => {
  const event = events[0]!;
  const ex = extractArticleEvidence(raw, ctx, capture, [event]);
  const reviewed = { ...event, sourceId: "reviewed-wuwa", extractionMethod: "manual" as const, confidence: 1 };
  const merged = mergeEvents([[reviewed], [event]]);
  expect(merged.events[0]!.sourceId).toBe("reviewed-wuwa");
  expect(buildEvidenceSidecar(ex, merged.events, merged.conflicts).articleAttributions[0]!.finalEventId).toBe(event.id);
  for (const [finals, code] of [
    [[{ ...reviewed, sourceId: "other-source" }], "winner_reference_conflict"],
    [[{ ...reviewed, sourceUrl: "https://example.com/other" }], "winner_reference_conflict"],
    [[{ ...reviewed, type: "login" as const }], "winner_type_conflict"],
    [[{ ...reviewed, endsAt: "2026-11-10T19:59:00.000Z" }], "winner_period_conflict"],
    [[{ ...reviewed, regionEnds: { ...reviewed.regionEnds, europe: "2026-11-10T19:59:00.000Z" } }], "winner_period_conflict"],
    [[{ ...reviewed, regionScoped: false }], "winner_period_conflict"],
    [[{ ...reviewed, id: event.id + "-near" }], "no_exact_winner"],
    [[reviewed, reviewed], "ambiguous_final_id"],
  ] as const) {
    const side = buildEvidenceSidecar(ex, [...finals]);
    expect(side.articleAttributions[0]).toMatchObject({ noticeId: "5571", finalEventId: null });
    expect(codes(side)).toContain(code);
  }
  const conflicted = mergeEvents([[{ ...reviewed, endsAt: "2026-11-12T19:59:00.000Z" }], [event]]);
  expect(codes(buildEvidenceSidecar(ex, conflicted.events, conflicted.conflicts))).toContain("merge_source_conflict");
  expect(codes(buildEvidenceSidecar({ ...ex, articleAttributions: [...ex.articleAttributions!, ...ex.articleAttributions!] }, events)))
    .toContain("duplicate_candidate");
});

test("full sidecar validates; forged hashes, positions and invalid references fail Zod", () => {
  const side = buildEvidenceSidecar(extractArticleEvidence(raw, ctx, capture, events), events);
  expect(EvidenceSidecar.parse(side)).toEqual(side);
  for (const mutation of [
    { ...side, notices: side.notices.map((n, i) => i ? n : { ...n, contentHash: "0".repeat(64) }) },
    { ...side, notices: [...side.notices, side.notices[0]] },
    { ...side, articleAttributions: side.articleAttributions.map(a => ({ ...a, noticePosition: 99 })) },
    { ...side, articleAttributions: side.articleAttributions.map(a => ({ ...a, noticeId: "9003" })) },
  ]) expect(EvidenceSidecar.safeParse(mutation).success).toBe(false);
});


test("invalid article reference metadata cannot poison E1 recovery diagnostics", () => {
  const e1 = extractWuwaEvidence(raw, ctx, capture);
  const original = buildEvidenceSidecar(e1, events);
  for (const fields of [
    { sourceUrl: "invalid untrusted URL" }, { sourceId: "" },
    { sourceUrl: "invalid untrusted URL", sourceId: "" },
  ]) {
    const inventory = extractArticleEvidence(raw, ctx, capture, events);
    Object.assign(inventory.notices!.at(-1)!, fields);
    const side = safelyBuildEvidenceSidecar(combine(e1, inventory), events);
    expect(side.entries).toEqual(original.entries);
    expect(side.unattached).toEqual(original.unattached);
    expect(side.notices).toEqual([]);
    expect(codes(side)).toContain("article_assembly_failed");
    expect(EvidenceSidecar.safeParse(side).success).toBe(true);
    expect(JSON.stringify(side.diagnostics)).not.toContain("invalid untrusted URL");
  }
});

// Exact independent-review reproducer: the canonical raw traversal still sees
// the harmless commented preamble, but it is not the actual entry child content.
test("review P1: commented-out content cannot replace notice 9003's actual HTML", () => {
  const spoof = '<!--<content type="html"><![CDATA[<p>Harmless preamble.</p>]]></content>-->';
  const changed = raw.replace('<entry><id>urn:article:9003</id>', '<entry>' + spoof + '<id>urn:article:9003</id>');
  expect(adapter.parse(changed, ctx)).toEqual(events);
  const inventory = safelyExtractArticleEvidence(changed, ctx, capture, events);
  expect(codes(inventory)).toEqual(["article_extraction_failed", "article_inventory_incomplete"]);
  expect(sourceReport(inventory)).toMatchObject({ available: false, noticeCount: 0, attributedEvents: 0 });
  expect(inventory.articleAttributions).toHaveLength(5);
  expect(inventory.articleAttributions!.every(a => a.noticeId === null && a.noticePosition === null)).toBe(true);
  const e1 = extractWuwaEvidence(changed, ctx, capture);
  const side = safelyBuildEvidenceSidecar(combine(e1, inventory), events);
  expect(side.entries).toEqual(buildEvidenceSidecar(extractWuwaEvidence(raw, ctx, capture), events).entries);
  expect(JSON.stringify(side.notices)).not.toContain("Harmless preamble");
});

for (const [name, spoof] of [
  ["title", "<title>Commented title</title>"],
  ["ID and URL", '<id>urn:article:9999</id><link href="https://wutheringwaves.kurogames.com/en/main/news/detail/9999"/>'],
] as const) test(`review P1: discovered ${name} must correspond to actual entry fields`, () => {
  const changed = raw.replace('<entry><id>urn:article:9003</id>', `<entry><!--${spoof}--><id>urn:article:9003</id>`);
  expect(adapter.parse(changed, ctx)).toEqual(events);
  expect(codes(safelyExtractArticleEvidence(changed, ctx, capture, events)))
    .toEqual(["article_extraction_failed", "article_inventory_incomplete"]);
});

for (const field of ["id", "title", "link", "content"]) test(`review P1: ${field} must be an actual direct entry child`, () => {
  const changed = raw.replace(/<entry><id>urn:article:9003<\/id>[\s\S]*?<\/entry>/, notice =>
    notice.replace(new RegExp(field === "link" ? '<link\\b[^>]*\\/>' : `<${field}\\b[^>]*>[\\s\\S]*?<\\/${field}>`), value => `<author>${value}</author>`));
  expect(changed).not.toBe(raw);
  expect(adapter.parse(changed, ctx)).toEqual(events);
  expect(codes(safelyExtractArticleEvidence(changed, ctx, capture, events)))
    .toEqual(["article_extraction_failed", "article_inventory_incomplete"]);
});

test("review P1: comments inside HTML CDATA remain complete notice replay content", () => {
  const htmlComment = '<!-- preserve <title>HTML-only title</title> -->';
  const changed = raw.replace('<h2>Merchandise</h2>', htmlComment + '<h2>Merchandise</h2>');
  const ex = extractArticleEvidence(changed, ctx, capture, events);
  expect(ex.notices!.at(-1)!.content).toBe(htmlComment + expected[4].content);
  expect(ex.diagnostics).toEqual([]);
  expect(sourceReport(ex).available).toBe(true);
});

for (const lane of ["both", "E1 only", "articles only"] as const) test(`review P2: invalid diagnostic alone preserves valid ${lane} evidence`, () => {
  const e1 = extractWuwaEvidence(raw, ctx, capture);
  const inventory = extractArticleEvidence(raw, ctx, capture, events);
  const ex = lane === "both" ? combine(e1, inventory) : lane === "E1 only" ? e1 : inventory;
  const original = buildEvidenceSidecar(ex, events);
  const invalid = { code: "no_useful_context", sourceEventId: null, sourceUrl: null, detail: "" };
  const input = { ...ex, diagnostics: [...ex.diagnostics, invalid] };
  const unchanged = structuredClone(input);
  expect(() => buildEvidenceSidecar(input, events)).toThrow();
  const side = safelyBuildEvidenceSidecar(input, events);
  expect(side.entries).toEqual(original.entries);
  expect(side.unattached).toEqual(original.unattached);
  expect(side.notices).toEqual(original.notices);
  expect(side.articleAttributions).toEqual(original.articleAttributions);
  expect(codes(side)).toEqual([...codes(original), "diagnostic_validation_failed"]);
  expect(EvidenceSidecar.safeParse(side).success).toBe(true);
  expect(input).toEqual(unchanged);
});

test("review P2: invalid E1 candidate plus invalid diagnostic preserves inventory without repairing excerpts", () => {
  const e1 = extractWuwaEvidence(raw, ctx, capture);
  const inventory = extractArticleEvidence(raw, ctx, capture, events);
  const original = buildEvidenceSidecar(inventory, events);
  e1.candidates[0]!.source.excerpts[0]!.text = "<unsafe candidate>";
  const input = combine(e1, inventory);
  input.diagnostics.push({ code: "no_useful_context", sourceEventId: null, sourceUrl: null, detail: "" });
  const unchanged = structuredClone(input);
  const side = safelyBuildEvidenceSidecar(input, events);
  expect(side.entries).toEqual([]);
  expect(side.unattached).toEqual([]);
  expect(side.notices).toEqual(original.notices);
  expect(side.articleAttributions).toEqual(original.articleAttributions);
  expect(codes(side)).toEqual([...codes(original), "diagnostic_validation_failed", "event_evidence_assembly_failed"]);
  expect(articleSourceReport(side).find(s => s.sourceId === ctx.sourceId)?.available).toBe(true);
  expect(JSON.stringify(side)).not.toContain("unsafe candidate");
  expect(input).toEqual(unchanged);
});

test("review P2: invalid article data plus invalid diagnostic preserves independently valid E1", () => {
  const e1 = extractWuwaEvidence(raw, ctx, capture);
  const inventory = extractArticleEvidence(raw, ctx, capture, events);
  inventory.notices![0]!.content = "forged";
  const input = combine(e1, inventory);
  input.diagnostics.push({ code: "no_useful_context", sourceEventId: null, sourceUrl: null, detail: "" });
  const side = safelyBuildEvidenceSidecar(input, events);
  const original = buildEvidenceSidecar(e1, events);
  expect(side.entries).toEqual(original.entries);
  expect(side.unattached).toEqual(original.unattached);
  expect(side.notices).toEqual([]);
  expect(codes(side)).toEqual([...codes(original), "diagnostic_validation_failed", "article_assembly_failed"]);
});

test("duplicate zero-output notice availability does not establish unique or complete coverage", () => {
  const duplicate = raw.replace("</feed>", entry("9003") + "</feed>");
  expect(adapter.parse(duplicate, ctx)).toEqual(events);
  const side = buildEvidenceSidecar(extractArticleEvidence(duplicate, ctx, capture, events), events);
  const report = articleSourceReport(side).find(s => s.sourceId === ctx.sourceId)!;
  // Available means a usable inventory exists, even with retained duplicate
  // identities. All emitted rows being attributed says nothing about those posts.
  expect(report).toMatchObject({ available: true, noticeCount: 6, emittedEvents: 5, attributedEvents: 5, confirmedFinalAssociations: 5,
    diagnosticCodes: ["duplicate_notice_identity"] });
  expect(report.notices.filter(n => n.noticeId === "9003").map(n => [n.position, n.eventIds])).toEqual([[4, []], [5, []]]);
  expect(side.diagnostics.filter(d => d.code === "duplicate_notice_identity")).toHaveLength(2);
});

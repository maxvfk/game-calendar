import { expect, test } from "bun:test";
import { adapterById } from "../src/ingest/adapters/index.ts";
import { extractArticleEvidence, safelyExtractArticleEvidence, articleSourceReport } from "../src/editorial/article-evidence.ts";
import { safelyBuildEvidenceSidecar } from "../src/editorial/event-evidence.ts";

const raw = await Bun.file("test/fixtures/wuwa/inventory-c1a0.xml").text();
const expected = await Bun.file("test/fixtures/wuwa/inventory-c1a0-expected.json").json();
const ctx = { now: "2026-10-26T18:00:00.000Z", game: "wuwa" as const, sourceId: "wuwa-kuro-mirror", sourceUrl: "https://example.com/mirror" };
const capture = { capturedAt: null, lastConfirmedAt: null, fixtureCaptureDay: "2026-10-21" };
const adapter = adapterById(ctx.sourceId)!;
const events = adapter.parse(raw, ctx);
const prefix9003 = (prefix: string) => raw.replace("<entry><id>urn:article:9003</id>", `<entry>${prefix}<id>urn:article:9003</id>`);
function refused(xml: string) {
  const ex = safelyExtractArticleEvidence(xml, ctx, capture, events);
  expect(ex.diagnostics.map(d => d.code)).toEqual(["article_extraction_failed", "article_inventory_incomplete"]);
  expect(ex.notices).toEqual([]);
  expect(ex.articleAttributions).toHaveLength(5);
  expect(ex.articleAttributions!.every(a => a.noticeId === null)).toBe(true);
  const report = articleSourceReport(safelyBuildEvidenceSidecar(ex, events)).find(s => s.sourceId === ctx.sourceId)!;
  expect(report).toMatchObject({ available: false, noticeCount: 0, attributedEvents: 0 });
}

for (const [name, prefix] of [
  // Exact Astra reproducer. Real direct-child ID/link remain 9003, not 9999.
  ["Astra ID/link", '<summary type="text"><![CDATA[<id>urn:article:9999</id><link href="https://wutheringwaves.kurogames.com/en/main/news/detail/9999"/>]]></summary>'],
  ["title", '<summary type="text"><![CDATA[<title>Spoofed title</title>]]></summary>'],
  // Split CDATA is valid XML. The raw regex can span from this fake opening
  // into the real content field; the actual HTML is still expected[4].content.
  ["content", '<summary><![CDATA[<content type="html"><![CDATA[<p>Spoofed content.</p>]]]]><![CDATA[></content>]]></summary>'],
  ["nested metadata CDATA", '<metadata><nested><![CDATA[<title>Spoofed title</title>]]></nested></metadata>'],
] as const) test(`XML-aware verifier refuses non-field CDATA spoof: ${name}`, () => {
  const changed = prefix9003(prefix);
  expect(adapter.parse(changed, ctx)).toEqual(events);
  refused(changed);
});

test("XML-aware verifier retains exact genuine HTML CDATA, comments, XML-looking text and CRLF", () => {
  const html = '<!-- HTML comment: <id>not an Atom ID</id> -->\r\n<p>😀 <title>not an Atom title</title><link href="https://example.com/HTML"/> <![CDATA[ literal opening</p>';
  const changed = raw.replace('<h2>Merchandise</h2>', html + '<h2>Merchandise</h2>');
  const ex = extractArticleEvidence(changed, ctx, capture, events);
  expect(ex.notices!.at(-1)).toMatchObject({ noticeId: "9003", position: 4, title: "Merchandise announcement",
    sourceUrl: "https://wutheringwaves.kurogames.com/en/main/news/detail/9003", content: html + expected[4].content });
  expect(ex.diagnostics).toEqual([]);
  expect(adapter.parse(changed, ctx)).toEqual(events);
});

test("XML-aware verifier distinguishes quoted attribute values, text entities and non-field CDATA", () => {
  const metadata = '<summary note="a > b &quot;quoted&quot; &lt;id>fake&lt;/id>"><nested><![CDATA[<id>urn:article:9999</id><title>Spoof</title>]]></nested></summary>';
  // Non-field data after genuine fields cannot replace any of them. No special
  // case for summary: quoted attribute values and nested text have XML semantics.
  const changed = raw.replace(/<\/entry>\s*<\/feed>/, metadata + '</entry></feed>')
    .replace('<id>urn:article:9003</id>', '<!-- harmless XML comment outside fields --><id>urn:article:9003</id>')
    .replace('detail/9003"/>', 'detail/9003" note="a > b &lt;title>attribute text&lt;/title>"/>');
  const ex = extractArticleEvidence(changed, ctx, capture, events);
  expect(ex.notices!.map(({ noticeId, title, sourceUrl, content }) => ({ noticeId, title, sourceUrl, content })))
    .toEqual(expected.map(({ noticeId, title, sourceUrl, content }: { noticeId: string; title: string; sourceUrl: string; content: string }) => ({ noticeId, title, sourceUrl, content })));
  expect(ex.diagnostics).toEqual([]);
});

for (const [name, alter] of [
  ["duplicate href attributes", (s: string) => s.replace('detail/9003"/>', 'detail/9003" href="https://example.com/duplicate"/>')],
  ["unquoted attribute", () => prefix9003('<summary mode=unquoted/>')],
  ["markup inside quoted attribute", () => prefix9003('<summary note=\'<title>Spoofed title</title>\'/>')],
  ["missing direct content", (s: string) => s.replace(/<content type="html"><!\[CDATA\[<h2>Merchandise[\s\S]*?\]\]><\/content>/, '')],
  ["duplicate direct title", (s: string) => s.replace('<title>Merchandise announcement</title>', '<title>Merchandise announcement</title><title>Merchandise announcement</title>')],
  ["nested title markup", (s: string) => s.replace('<title>Merchandise announcement</title>', '<title><nested>Merchandise announcement</nested></title>')],
  ["wrong content type", (s: string) => s.replace('<content type="html"><![CDATA[<h2>Merchandise', '<content type="text"><![CDATA[<h2>Merchandise')],
  ["foreign namespace field", (s: string) => s.replace('<id>urn:article:9003</id>', '<id xmlns="urn:foreign">urn:article:9003</id>')],
  ["foreign namespace entry", (s: string) => s.replace('<entry><id>urn:article:9003', '<entry xmlns="urn:foreign"><id>urn:article:9003')],
  ["mixed content CDATA", (s: string) => s.replace('<h2>Merchandise</h2>', '<h2>Merchandise</h2>]]>text<![CDATA[')],
  ["DOCTYPE", (s: string) => s.replace('<feed ', '<!DOCTYPE feed SYSTEM "https://example.invalid/not-fetched.dtd"><feed ')],
] as const) test(`XML-aware verifier refuses ambiguous or unsupported fields: ${name}`, () => refused(alter(raw)));

for (const path of ["fixtures/wuwa/kuro-mirror-2026-09-23.xml", "test/fixtures/wuwa/evidence-2026-10-21.xml", "test/fixtures/wuwa/inventory-c1a0.xml"]) {
  test(`XML-aware verifier accepts existing frozen input: ${path}`, async () => {
    const input = await Bun.file(path).text();
    const emitted = adapter.parse(input, ctx);
    const ex = extractArticleEvidence(input, ctx, capture, emitted);
    expect(ex.diagnostics).toEqual([]);
    expect(ex.notices!.length).toBeGreaterThan(0);
    expect(ex.articleAttributions!.every(a => a.noticeId !== null)).toBe(true);
    if (path.endsWith('inventory-c1a0.xml')) {
      expect(ex.notices!.map(({ noticeId, position, sourceUrl, title, content, contentHash }) => ({ noticeId, position, sourceUrl, title, content, contentHash }))).toEqual(expected);
      expect(ex.articleAttributions!.map(a => a.noticeId)).toEqual(["5571", "5668", "5668", "5668", "5668"]);
      expect(ex.notices!.slice(2).map(n => n.noticeId)).toEqual(["9001", "9002", "9003"]);
    }
  });
}


test("XML-aware verifier requires exactly one direct ID, title, link and content field", () => {
  // Literal fields and the independent frozen HTML oracle specify each mutation.
  const fields = [
    '<id>urn:article:9003</id>', '<title>Merchandise announcement</title>',
    '<link href="https://wutheringwaves.kurogames.com/en/main/news/detail/9003"/>',
    '<content type="html"><![CDATA[' + expected[4].content + ']]></content>',
  ];
  for (const field of fields) {
    for (const replacement of ["", field + field]) {
      const changed = raw.replace(field, replacement);
      expect(changed).not.toBe(raw);
      refused(changed);
    }
  }
});
